// The test sets globalThis.__supabase to a fake or a real staging client.
// React Native defines __DEV__; services read it.
globalThis.__DEV__ ??= false;
export const supabase = new Proxy({}, { get: (_t, k) => {
  const v = globalThis.__supabase[k];
  return typeof v === 'function' ? v.bind(globalThis.__supabase) : v;
} });
