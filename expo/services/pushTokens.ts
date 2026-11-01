// Push-notification token registration (server side: push_tokens +
// register_push_token, B15). NOT wired to any screen yet: delivery from the
// server is not built, and a real Expo push token needs a development build
// on a physical device. Kept so the device-testing step is small:
//   1. call registerForPushNotifications() after explaining why (never at launch);
//   2. confirm a row in push_tokens; 3. build delivery (see docs/private-beta.md).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/services/supabase';

export type PushRegistration = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'error'; message?: string };

export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const { error } = await (supabase.rpc as any)('register_push_token', { p_token: token, p_platform: Platform.OS });
    return error ? { ok: false, reason: 'error', message: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, reason: 'unsupported', message: e instanceof Error ? e.message : String(e) };
  }
}
