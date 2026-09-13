// Demographics service — the client half of the 21+ age gate.
//
// The one write path (setMyDateOfBirth) hits the SECURITY DEFINER
// RPC public.set_my_date_of_birth(date). The RPC re-validates 21+
// against current_date server-side, refuses futures / implausible
// dates, and refuses a second call once a row exists. Nothing here
// tries to short-circuit that — the client-side max-date clamp on
// the picker is a UX affordance, not a security boundary.
//
// FUTURE (out of scope for Batch 2): a third-party age/ID
// verification provider (Persona, Onfido, Veriff, Stripe Identity,
// etc.) will augment the verified-age state. When that ships, the
// integration must:
//   * Return only a boolean pass/fail + the verified DOB or a signed
//     verification result — Pulze must never receive or store raw
//     government-ID images or biometric templates.
//   * Overwrite user_demographics via a NEW SECURITY DEFINER RPC
//     gated by the provider's server-to-server callback, never by a
//     user-supplied UPDATE. The current schema deliberately has NO
//     UPDATE RLS policy exactly so that provider hook is the only
//     way DOB can be revised.
//   * Set an additional verified-at column (add in that migration).

import { supabase } from '@/services/supabase';

export type SetDobFailure =
  | 'not_authenticated'
  | 'future_date'
  | 'under_21'
  | 'already_set'
  | 'error';

export type SetDobResult =
  | { ok: true; age: number }
  | { ok: false; reason: SetDobFailure; message?: string };

// pg date format is YYYY-MM-DD; construct from the JS Date's local
// components so the day the user visually selected is the day we
// send. A naive toISOString() would shift by up to a day when the
// device is in a negative UTC offset (Denver is UTC-7 / -6).
function toPgDate(dob: Date): string {
  const y = dob.getFullYear();
  const m = String(dob.getMonth() + 1).padStart(2, '0');
  const d = String(dob.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function setMyDateOfBirth(dob: Date): Promise<SetDobResult> {
  const isoDate = toPgDate(dob);
  const { data, error } = await (supabase.rpc as any)('set_my_date_of_birth', { p_dob: isoDate });

  if (error) {
    // The RPC raises with a bare message string that carries the
    // reason (not_authenticated / future_date / under_21 / already_set).
    // Map back to a discriminant so callers can render appropriate copy.
    const msg = (error.message ?? '').toString();
    if (msg.includes('not_authenticated')) return { ok: false, reason: 'not_authenticated' };
    if (msg.includes('under_21'))          return { ok: false, reason: 'under_21' };
    if (msg.includes('future_date'))       return { ok: false, reason: 'future_date' };
    if (msg.includes('already_set'))       return { ok: false, reason: 'already_set' };
    console.log('[Demographics] setMyDateOfBirth unknown error:', msg);
    return { ok: false, reason: 'error', message: msg };
  }

  if (typeof data !== 'number') {
    return { ok: false, reason: 'error', message: 'unexpected response shape' };
  }
  return { ok: true, age: data };
}

export async function getCurrentUserAge(): Promise<number | null> {
  const { data, error } = await (supabase.rpc as any)('get_current_user_age');
  if (error) {
    console.log('[Demographics] getCurrentUserAge failed:', error.message);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

// Presence check for the age-gate router. Reads own row via RLS;
// RLS filter (owner-only) means any non-owner would just see the
// same "no row" result anyway. Returns false on any RPC error so a
// transient failure never lets someone into the main app.
export async function hasCompletedAgeGate(): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_demographics')
    .select('user_id')
    .maybeSingle();
  if (error) {
    console.log('[Demographics] hasCompletedAgeGate failed:', error.message);
    return false;
  }
  return !!data;
}

// Latest calendar date a person born on this DOB or later would
// be under 21 today. Used as the max-selectable date on the picker
// so the UI matches the server-side gate: today = 2026-09-13 -> max
// picker date = 2005-09-13. Calendar-year subtraction handles leap
// years via Date's natural year rollover (Feb 29 -> Feb 28 21 years
// earlier is the calendar-consistent answer).
export function maxSelectableDobForAge21(now: Date = new Date()): Date {
  return new Date(now.getFullYear() - 21, now.getMonth(), now.getDate());
}
