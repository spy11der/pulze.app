// Local device data cleanup on logout / account deletion.
//
// Two functions with intentionally different reach:
//
//   clearLocalCachesForUser(userId)
//     Per-account personal data on this device (queued check-ins, dedup
//     state, saves cache, legacy favorites, last-user-id hint). Called
//     on both logout and account deletion so that Account A's data can
//     never surface for Account B on the same device.
//
//   clearDeviceAccountBindings()
//     Device-tied bindings created by the account (biometric lock,
//     notification prefs, legacy SecureStore blob, SQLite vibes/spots).
//     Called ONLY after confirmed server-side account deletion — logout
//     preserves these so the same user can sign back in without
//     re-configuring the device from scratch.
//
// Benign device UX state (theme, welcome-modal counters,
// welcomed-cities set) is NOT cleared — it isn't personal data and
// resetting it every login would degrade the experience.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

/**
 * Remove per-account AsyncStorage entries so no personal data lingers
 * between accounts on the same device. Safe to call with a null userId
 * (only the user-independent keys are cleared).
 */
export async function clearLocalCachesForUser(userId: string | null | undefined): Promise<void> {
  const keys: string[] = [
    'pulze_local_checkins',       // queue of not-yet-synced check-ins (photos + captions + venue ids)
    'pulze_favorites_v1',         // legacy AsyncStorage-only saves (pre-Supabase migration)
    'pulze_current_user_id',      // last-signed-in user id hint read by geofence.ts
    'pulze_venue_checkin_counts', // dead per-venue local counter from an earlier era
  ];
  if (userId) {
    keys.push(
      `pulze_geofence_dedup_${userId}`,  // per-user check-in-prompt dedup window
      `pulze_saves_cache_v1:${userId}`,  // per-user Supabase saves cold-start cache
    );
  }
  // Use allSettled so one missing key doesn't skip the rest.
  await Promise.allSettled(keys.map((k) => AsyncStorage.removeItem(k)));
}

/**
 * Remove device-tied settings that only make sense while the (now
 * deleted) account exists on this device. Best-effort per item.
 */
export async function clearDeviceAccountBindings(): Promise<void> {
  // The deleted account's local notification toggle.
  await AsyncStorage.removeItem('pulze_notif_prefs_v2').catch(() => {});
  // Also clean the pre-v2 key so it doesn't linger from a very old
  // install and re-populate anything on next launch.
  await AsyncStorage.removeItem('pulze_notification_prefs').catch(() => {});

  // Biometric lock flag (SecureStore) + legacy prefs blob.
  await SecureStore.deleteItemAsync('pulze_biometric_enabled').catch(() => {});
  await SecureStore.deleteItemAsync('pulze_user_prefs').catch(() => {});

  // Legacy SQLite database (vibes / saved_spots from the pre-check-in
  // era). Best-effort deletion of rows so any user content is gone;
  // ignore errors if the DB never existed on this device.
  if (Platform.OS !== 'web') {
    try {
      const db = await SQLite.openDatabaseAsync('pulze.db');
      try { await db.execAsync('DELETE FROM vibes'); } catch {}
      try { await db.execAsync('DELETE FROM saved_spots'); } catch {}
      await db.closeAsync();
    } catch (e) {
      console.log('[LocalCleanup] SQLite reset (best-effort) failed:', e);
    }
  }
}
