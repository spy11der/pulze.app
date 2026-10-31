import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
/** The URL the client below was created with (for the backend indicator). */
export const SUPABASE_URL = supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.log('[Supabase] SecureStore getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.log('[Supabase] SecureStore setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.log('[Supabase] SecureStore removeItem error:', e);
    }
  },
};

// The key supabase-js uses by default, set explicitly so the app can clear the
// stored session itself (see clearStoredSession). Same value as the default,
// so existing sessions are unaffected.
const AUTH_STORAGE_KEY = (() => {
  try {
    return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  } catch {
    return 'sb-unconfigured-auth-token';
  }
})();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Removes the session stored on this device. Used when signOut() could not
 * reach the server (offline, timeout, 5xx): supabase-js 2.108.1 then returns
 * the error and keeps the stored session, which would sign the user back in
 * on the next launch or token refresh. The refresh token stays valid on the
 * server until it expires, because revoking it needs the network.
 */
export async function clearStoredSession(): Promise<void> {
  await supabase.auth.stopAutoRefresh();
  await ExpoSecureStoreAdapter.removeItem(AUTH_STORAGE_KEY);
  await ExpoSecureStoreAdapter.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
  await ExpoSecureStoreAdapter.removeItem(`${AUTH_STORAGE_KEY}-user`);
  await supabase.auth.startAutoRefresh();
}

console.log('[Supabase] Client initialized with URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING');
