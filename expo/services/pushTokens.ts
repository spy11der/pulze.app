// Push notifications on this device (server: push_tokens, register_push_token,
// unregister_push_token, notification_preferences.push_enabled; delivery by
// the push-dispatch function, B21). Asked for only from Settings, after the
// user has read what it is for; never at launch. A real Expo push token needs
// a physical device with a development build; Expo Go and simulators can't.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/services/supabase';

const TOKEN_KEY = 'pulze_push_token_v1';

export type PushRegistration = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'error'; message?: string };

async function setPushEnabled(userId: string, value: boolean): Promise<boolean> {
  const table = () => supabase.from('notification_preferences' as any) as any;
  const { data, error } = await table().update({ push_enabled: value }).eq('user_id', userId).select('user_id');
  if (error) return false;
  if ((data ?? []).length > 0) return true;
  return !(await table().insert({ user_id: userId, push_enabled: value })).error;
}

/** Permission (system prompt), token, registration, then push_enabled on. */
export async function enablePushNotifications(userId: string): Promise<PushRegistration> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const { error } = await (supabase.rpc as any)('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (error) return { ok: false, reason: 'error', message: error.message };
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (!(await setPushEnabled(userId, true))) return { ok: false, reason: 'error' };
    return { ok: true };
  } catch (e) {
    // Expo Go and simulators can't get a push token.
    return { ok: false, reason: 'unsupported', message: e instanceof Error ? e.message : String(e) };
  }
}

/** push_enabled off, and this device's token removed so nothing more is sent to it. */
export async function disablePushNotifications(userId: string): Promise<boolean> {
  const ok = await setPushEnabled(userId, false);
  await unregisterThisDevice();
  return ok;
}

/** At sign-out: stop pushes for the departing account on this device. Best effort, never blocks. */
export async function unregisterThisDevice(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await Promise.race([
      (supabase.rpc as any)('unregister_push_token', { p_token: token }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // The server also drops tokens unused for 180 days and any Expo reports dead.
  }
}

export async function getPushEnabled(): Promise<boolean> {
  const { data } = await (supabase.from('notification_preferences' as any) as any).select('push_enabled').maybeSingle();
  return data?.push_enabled === true;
}
