import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/supabase';
import { scheduleCheckInNotification } from '@/services/checkInNotifications';
import { shouldTriggerCheckIn, recordGeofenceTrigger } from '@/services/checkInDatabase';
import { getLocationConsent } from '@/services/consent';
import { getNotificationPrefs } from '@/services/notificationPrefs';

const GEOFENCE_TASK = 'PULZE_GEOFENCE_CHECK';
const GEOFENCE_INTERVAL_MS = 60_000; // Check every 60 seconds

// The Settings toggle needs to know exactly why a start failed so it
// can (a) leave the persisted consent OFF instead of pretending it's
// ON, and (b) prompt the user to open OS Settings when the reason is
// a denied permission rather than an unrelated error.
export type GeofenceStartResult =
  | { started: true }
  | {
      started: false;
      reason:
        | 'unsupported'        // web / no TaskManager
        | 'no_consent'         // server consent flag is false
        | 'foreground_denied'  // OS foreground permission denied
        | 'background_denied'  // OS background permission denied
        | 'error';             // startLocationUpdatesAsync threw
      message?: string;
    };

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

    // Gate the local notification on the user's Settings preference.
    // Geofence processing (visit_sessions, dedup, RPC call) is unchanged
    // — the toggle suppresses only the OS-level ping.
    const prefs = await getNotificationPrefs();
    if (!prefs.checkInPrompt) {
      console.log(`[Geofence] Notification suppressed by pref: ${venueName}`);
      return;
    }
    // Real venue id + name straight from Supabase — no mock lookup needed.
    await scheduleCheckInNotification({ id: venueId, name: venueName });
  }
}

export function setCurrentUserId(userId: string): void {
  AsyncStorage.setItem('pulze_current_user_id', userId).catch((e) =>
    console.log('[Geofence] Error storing userId:', e),
  );
}

export async function isGeofenceMonitoringActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  } catch {
    return false;
  }
}

export async function startGeofenceMonitoring(userId: string): Promise<GeofenceStartResult> {
  // Native-only — the TaskManager task isn't defined on web
  if (Platform.OS === 'web') {
    return { started: false, reason: 'unsupported' };
  }

  const hasConsent = await getLocationConsent(userId);
  if (!hasConsent) {
    console.log('[Geofence] Location consent not granted, skipping monitoring');
    return { started: false, reason: 'no_consent' };
  }

  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[Geofence] Foreground permission denied');
      return { started: false, reason: 'foreground_denied' };
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      // Background monitoring is the whole point of this toggle — a
      // foreground-only start would silently deliver zero arrival
      // prompts once the app is minimized, so refuse rather than lie
      // to the user's Settings switch.
      console.log('[Geofence] Background permission denied — refusing to start');
      return { started: false, reason: 'background_denied' };
    }

    // Idempotency: if the task is already registered (e.g. app relaunch
    // while previously enabled), tear it down first so options changes
    // in a future release take effect on next start.
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
    }

    await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: GEOFENCE_INTERVAL_MS,
      distanceInterval: 30,
      // Android foreground service is required when using
      // startLocationUpdatesAsync so the OS lets us keep receiving
      // updates while backgrounded. Copy matches the actual behavior.
      foregroundService: {
        notificationTitle: 'Pulze is checking for venues nearby',
        notificationBody: 'Detecting when you arrive at participating spots',
        notificationColor: '#2BBFBA',
      },
    });

    console.log('[Geofence] Monitoring started');
    return { started: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log('[Geofence] Error starting monitoring:', message);
    return { started: false, reason: 'error', message };
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
