// Module resolve hook: lets node --test import the app's services/*.ts.
// Native and Expo modules resolve to the small stand-ins in this folder;
// '@/…' resolves like the app's tsconfig path, except the Supabase client,
// which each test provides through globalThis.__supabase.
const here = new URL('./', import.meta.url);
const root = new URL('../../', import.meta.url);
const STUBS = {
  '@react-native-async-storage/async-storage': 'asyncStorage.mjs',
  'expo-crypto': 'expoCrypto.mjs',
  'expo-file-system/legacy': 'expoFileSystem.mjs',
  'expo-location': 'expoLocation.mjs',
  'react-native': 'reactNative.mjs',
  '@/services/supabase': 'supabase.mjs',
};
export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: new URL(STUBS[specifier], here).href, shortCircuit: true };
  if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  return next(specifier, context);
}
