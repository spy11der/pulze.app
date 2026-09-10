// Device-local preferences that gate which local notifications this
// device fires. There's currently one — the geofence venue-entry
// check-in prompt (see services/geofence.ts + services/checkInNotifications.ts).
// Kept intentionally tiny: no cross-device sync, no server-side
// counterpart. If Pulze ever adds a second local notification category,
// add another boolean here.

import AsyncStorage from '@react-native-async-storage/async-storage';

// New key — the pre-existing pulze_notification_prefs key was tied to
// four toggles that never gated anything and is left inert on
// upgraded installs.
const STORAGE_KEY = 'pulze_notif_prefs_v2';

export interface NotificationPrefs {
  // Fires when handle_smart_geofence reports the user entered a venue.
  checkInPrompt: boolean;
}

const DEFAULTS: NotificationPrefs = {
  checkInPrompt: true,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setNotificationPref<K extends keyof NotificationPrefs>(
  key: K,
  value: NotificationPrefs[K],
): Promise<NotificationPrefs> {
  const current = await getNotificationPrefs();
  const next: NotificationPrefs = { ...current, [key]: value };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
