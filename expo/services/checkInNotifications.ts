import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHECK_IN_CATEGORY = 'PULZE_CHECK_IN';

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
