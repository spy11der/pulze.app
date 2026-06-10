import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { pulzeVenues } from '@/mocks/venues';
import { scheduleCheckInNotification } from '@/services/checkInNotifications';
import { shouldTriggerCheckIn, recordGeofenceTrigger } from '@/services/checkInDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_TASK = 'PULZE_GEOFENCE_CHECK';
const GEOFENCE_RADIUS_METERS = 45; // ~150 feet
const GEOFENCE_INTERVAL_MS = 60_000; // Check every 60 seconds
const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface GeofenceTrigger {
  venueId: string;
  venueName: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  triggeredAt: number;
}

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

  await checkProximityAndNotify(
    userLoc.coords.latitude,
    userLoc.coords.longitude,
  );
});

async function checkProximityAndNotify(lat: number, lng: number): Promise<void> {
  for (const venue of pulzeVenues) {
    if (!venue.latitude || !venue.longitude) continue;

    const distance = haversineDistance(
      lat,
      lng,
      venue.latitude,
      venue.longitude,
    );

    if (distance <= GEOFENCE_RADIUS_METERS) {
      const userId = await getCurrentUserId();
      if (!userId) continue;

      const shouldFire = await shouldTriggerCheckIn(userId, venue.id);
      if (!shouldFire) {
        console.log(`[Geofence] Deduped: ${venue.name} for user ${userId}`);
        continue;
      }

      console.log(`[Geofence] TRIGGER: ${venue.name} (${distance.toFixed(0)}m)`);
      await recordGeofenceTrigger(userId, venue.id);
      await scheduleCheckInNotification(venue);
    }
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

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function startGeofenceMonitoring(): Promise<boolean> {
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
