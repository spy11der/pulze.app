import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/supabase';
import { scheduleCheckInNotification } from '@/services/checkInNotifications';
import { shouldTriggerCheckIn, recordGeofenceTrigger } from '@/services/checkInDatabase';
import { getLocationConsent } from '@/services/consent';

const GEOFENCE_TASK = 'PULZE_GEOFENCE_CHECK';
const GEOFENCE_INTERVAL_MS = 60_000; // Check every 60 seconds

// TaskManager.defineTask is native-only — only register on iOS/Android
if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error: taskError }) => {
      if (taskError) {
        console.log('[Geofence] Task error:', taskError.message);
        return;
      }

      const { locations } = data as { locations: Location.LocationObject[] };
      if (!locations || locations.length === 0) return;

      const userLoc = locations[locations.length - 1];
      if (!userLoc) return;

      console.log('[Geofence] Background location update:', userLoc.coords.latitude, userLoc.coords.longitude);

      // Real speed when the platform provides it (m/s -> mph); 0 only when
      // genuinely unavailable (e.g. stationary or unsupported device).
      const speedMps = userLoc.coords.speed;
      const speedMph = speedMps != null && speedMps > 0 ? speedMps * 2.23694 : 0;

      await checkProximityAndNotify(userLoc.coords.latitude, userLoc.coords.longitude, speedMph);
    });
  } catch (e) {
    console.log('[Geofence] defineTask not supported on this platform:', e);
  }
}

async function checkProximityAndNotify(lat: number, lng: number, velocityMph: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    console.log('[Geofence] No authenticated user, skipping');
    return;
  }

  // Real backend call — determines proximity via each venue's actual
  // geofence radius in Postgres/PostGIS, and opens/closes the real
  // visit_sessions row that feeds the whole busyness pipeline.
  // `handle_smart_geofence` isn't in the generated Supabase types yet — cast.
  const { data: result, error } = await (supabase.rpc as any)('handle_smart_geofence', {
    p_user_id: userId,
    p_lat: lat,
    p_lng: lng,
    p_velocity_mph: velocityMph,
  });

  if (error) {
    console.log('[Geofence] RPC error:', error.message);
    return;
  }

  const event = (result as any)?.event;
  if (event === 'entered') {
    const venueId: string = (result as any).venue_id;
    const venueName: string = (result as any).venue_name;

    const shouldFire = await shouldTriggerCheckIn(userId, venueId);
    if (!shouldFire) {
      console.log(`[Geofence] Deduped: ${venueName} for user ${userId}`);
      return;
    }

    console.log(`[Geofence] TRIGGER: ${venueName}`);
    await recordGeofenceTrigger(userId, venueId);
    // Real venue id + name straight from Supabase — no mock lookup needed.
    await scheduleCheckInNotification({ id: venueId, name: venueName });
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem('pulze_current_user_id');
    return stored;
  } catch {
    return null;
  }
}

export function setCurrentUserId(userId: string): void {
  AsyncStorage.setItem('pulze_current_user_id', userId).catch((e) =>
    console.log('[Geofence] Error storing userId:', e),
  );
}

export async function startGeofenceMonitoring(userId: string): Promise<boolean> {
  // Geofence monitoring is native-only — no-op on web
  if (Platform.OS === 'web') {
    console.log('[Geofence] Web: geofence monitoring not supported, skipping');
    return false;
  }

  const hasConsent = await getLocationConsent(userId);
  if (!hasConsent) {
    console.log('[Geofence] Location consent not granted, skipping monitoring');
    return false;
  }

  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[Geofence] Foreground permission denied');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.log('[Geofence] Background permission denied — running foreground only');
    }

    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
    }

    await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: GEOFENCE_INTERVAL_MS,
      distanceInterval: 30,
      foregroundService: {
        notificationTitle: 'Pulze is nearby',
        notificationBody: 'Checking what venues are close to you',
        notificationColor: '#2BBFBA',
      },
    });

    console.log('[Geofence] Monitoring started');
    return true;
  } catch (e) {
    console.log('[Geofence] Error starting monitoring:', e);
    return false;
  }
}

export async function stopGeofenceMonitoring(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
      console.log('[Geofence] Monitoring stopped');
    }
  } catch (e) {
    console.log('[Geofence] Error stopping monitoring:', e);
  }
}
