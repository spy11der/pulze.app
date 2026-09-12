import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHECK_IN_CATEGORY = 'PULZE_CHECK_IN';

// The venue-arrival prompt is a local notification; on iOS and on
// Android 13+ the OS will silently drop scheduleNotificationAsync
// calls unless notification permission has been granted. This helper
// is cheap when already granted (getPermissionsAsync short-circuits)
// and returns whether the user can actually see prompts.
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted;
}

export async function setupNotificationCategories(): Promise<void> {
  // setNotificationCategoryAsync is native-only — skip on web
  if (Platform.OS === 'web') return;

  await Notifications.setNotificationCategoryAsync(CHECK_IN_CATEGORY, [
    {
      identifier: 'lets_go',
      buttonTitle: "Let's go",
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: 'skip',
      buttonTitle: 'Skip',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('check-in', {
      name: 'Check-in Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export interface CheckInNotificationVenue {
  id: string;
  name: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
}

export async function scheduleCheckInNotification(venue: CheckInNotificationVenue): Promise<void> {
  // scheduleNotificationAsync is native-only — skip on web
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web: would notify for', venue.name);
    return;
  }

  // Without permission the OS silently drops the schedule call, so
  // the arrival prompt would look broken. Ask once here in case the
  // toggle path missed it (e.g. re-install after granting location
  // in prior version). Cheap when already granted.
  const canNotify = await ensureNotificationPermission();
  if (!canNotify) {
    console.log('[Notifications] Permission not granted — skipping venue prompt for', venue.name);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You made it to ${venue.name}`,
      body: "Front cam's ready, make it count.",
      categoryIdentifier: CHECK_IN_CATEGORY,
      data: {
        type: 'check_in',
        venueId: venue.id,
        venueName: venue.name,
        neighborhood: venue.neighborhood,
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
      sound: 'default',
    },
    trigger: null, // Fire immediately
  });
}

export function registerNotificationResponseHandler(
  onLetsGo: (data: Record<string, unknown>) => void,
  onSkip: (data: Record<string, unknown>) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    const actionId = response.actionIdentifier;

    if (actionId === 'lets_go') {
      onLetsGo(data as Record<string, unknown>);
    } else if (actionId === 'skip' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // Skip or notification body tapped without action = skip
      onSkip(data as Record<string, unknown>);
    }
  });
}
