import { supabase } from '@/services/supabase';

// Reads the real, server-side consent flag that gates whether the app is
// allowed to write background presence data (visit_sessions, location_pings)
// at all. Defaults to false (no row = not granted) — matches the column's
// own privacy-safe default.
export async function getLocationConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_consent_states')
    .select('consent_location_gps')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.log('[Consent] getLocationConsent error:', error.message);
    return false;
  }
  // `user_consent_states` isn't in the generated Supabase types yet — cast.
  return (data as { consent_location_gps?: boolean } | null)?.consent_location_gps ?? false;
}

// Grants or revokes location-tracking consent. Upserts because a user may
// not have a consent_states row yet (none is created automatically today).
export async function setLocationConsent(userId: string, granted: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('user_consent_states')
    .upsert({ user_id: userId, consent_location_gps: granted } as any, { onConflict: 'user_id' });

  if (error) {
    console.log('[Consent] setLocationConsent error:', error.message);
    return false;
  }
  return true;
}
