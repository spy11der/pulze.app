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


// =============================================================
// Batch 3: optional demographics + demographic-analytics consent
// =============================================================
//
// Design rules baked into the shape of this file:
//
//   * Race and gender may only come from voluntary user selection.
//     Nothing here or elsewhere infers race, ethnicity, gender, or
//     gender identity from name, location, behavior, photos, voice,
//     friends, or any other signal.
//
//   * Gender is freely editable by the owner (updateMyGenderIdentity).
//     Race is one-shot on this schema: once established, the client
//     has no update path. Corrections go through Pulze support
//     (contact@pulze.pro).
//
//   * Consent to use these values in demographic analytics is
//     tracked as a separate boolean on user_consent_states.
//     Withdrawing consent stops future analytics use but does NOT
//     delete the underlying demographic row (so historical
//     aggregates that no longer tie back to the account can remain).
//
//   * SMALL-COHORT RULE for the future analytics engine (deliberately
//     not implemented in Batch 3): Pulze must not expose demographic
//     breakdowns for cohorts smaller than 20. Small groups must be
//     suppressed or truthfully combined into an appropriately labeled
//     broader reporting category. Do NOT relabel identities to reach
//     the threshold (e.g. a small Transgender Woman cohort is NOT
//     reported as Woman).

export type GenderIdentity =
  | 'man'
  | 'woman'
  | 'trans_man'
  | 'trans_woman'
  | 'nonbinary'
  | 'other'
  | 'prefer_not_to_say';

export const GENDER_IDENTITY_OPTIONS: Array<{ value: GenderIdentity; label: string }> = [
  { value: 'man',               label: 'Man' },
  { value: 'woman',             label: 'Woman' },
  { value: 'trans_man',         label: 'Transgender Man' },
  { value: 'trans_woman',       label: 'Transgender Woman' },
  { value: 'nonbinary',         label: 'Nonbinary' },
  { value: 'other',             label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export type RaceEthnicity =
  | 'american_indian_or_alaska_native'
  | 'asian'
  | 'black_or_african_american'
  | 'hispanic_or_latino'
  | 'middle_eastern_or_north_african'
  | 'native_hawaiian_or_other_pacific_islander'
  | 'white'
  | 'other'
  | 'prefer_not_to_say';

export const RACE_ETHNICITY_OPTIONS: Array<{ value: RaceEthnicity; label: string }> = [
  { value: 'american_indian_or_alaska_native',        label: 'American Indian or Alaska Native' },
  { value: 'asian',                                   label: 'Asian' },
  { value: 'black_or_african_american',               label: 'Black or African American' },
  { value: 'hispanic_or_latino',                      label: 'Hispanic or Latino' },
  { value: 'middle_eastern_or_north_african',         label: 'Middle Eastern or North African' },
  { value: 'native_hawaiian_or_other_pacific_islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'white',                                   label: 'White' },
  { value: 'other',                                   label: 'Other' },
  { value: 'prefer_not_to_say',                       label: 'Prefer not to say' },
];

// Full owner-only row read via RLS. Returns null if the user
// hasn't completed the DOB gate yet. Never returned to any other
// user — the SELECT policy on user_demographics is owner-only.
export interface MyDemographics {
  dateOfBirth: string;                       // 'YYYY-MM-DD'
  genderIdentity: GenderIdentity | null;
  raceEthnicity: RaceEthnicity[] | null;
  raceEstablished: boolean;                  // true once race can no longer be self-edited
  optionalStepCompleted: boolean;            // true once the onboarding demographic step was shown/handled
  demographicAnalyticsConsent: boolean;
}

interface DemographicsRow {
  date_of_birth: string;
  gender_identity: GenderIdentity | null;
  race_ethnicity: RaceEthnicity[] | null;
  race_ethnicity_established_at: string | null;
  optional_step_completed_at: string | null;
}

interface ConsentRow {
  consent_demographic_analytics: boolean | null;
}

export async function getMyDemographics(): Promise<MyDemographics | null> {
  const [{ data: demo, error: demoErr }, { data: consent, error: consErr }] = await Promise.all([
    (supabase.from('user_demographics') as any)
      .select('date_of_birth, gender_identity, race_ethnicity, race_ethnicity_established_at, optional_step_completed_at')
      .maybeSingle(),
    (supabase.from('user_consent_states') as any)
      .select('consent_demographic_analytics')
      .maybeSingle(),
  ]);
  if (demoErr) {
    console.log('[Demographics] getMyDemographics demo error:', demoErr.message);
    return null;
  }
  if (!demo) return null;
  if (consErr) {
    console.log('[Demographics] getMyDemographics consent error:', consErr.message);
  }
  const d = demo as DemographicsRow;
  const c = (consent ?? null) as ConsentRow | null;
  return {
    dateOfBirth: d.date_of_birth,
    genderIdentity: d.gender_identity,
    raceEthnicity: d.race_ethnicity,
    raceEstablished: d.race_ethnicity_established_at !== null,
    optionalStepCompleted: d.optional_step_completed_at !== null,
    demographicAnalyticsConsent: c?.consent_demographic_analytics ?? false,
  };
}

// True when the caller has landed on the optional demographic
// onboarding step at least once (either Continue or Skip). Routes
// off `optional_step_completed_at`, not off whether any values
// were filled in — skipping without answering still marks the
// step done, and pre-existing accounts (who haven't seen it yet)
// return false so the router shows the step once.
export async function hasSeenOptionalDemographicsStep(): Promise<boolean> {
  const { data, error } = await (supabase.from('user_demographics') as any)
    .select('optional_step_completed_at')
    .maybeSingle();
  if (error) {
    console.log('[Demographics] hasSeenOptionalDemographicsStep failed:', error.message);
    return false;
  }
  return !!(data?.optional_step_completed_at);
}

export async function setMyOptionalDemographics(input: {
  gender: GenderIdentity | null;
  race: RaceEthnicity[] | null;
  consent: boolean;
}): Promise<boolean> {
  const { error } = await (supabase.rpc as any)('set_my_optional_demographics', {
    p_gender: input.gender,
    p_race: input.race && input.race.length > 0 ? input.race : null,
    p_consent: input.consent,
  });
  if (error) {
    console.log('[Demographics] setMyOptionalDemographics failed:', error.message);
    return false;
  }
  return true;
}

export async function markOptionalDemographicsSkipped(): Promise<boolean> {
  const { error } = await (supabase.rpc as any)('mark_optional_demographics_skipped');
  if (error) {
    console.log('[Demographics] mark_optional_demographics_skipped failed:', error.message);
    return false;
  }
  return true;
}

export async function updateMyGenderIdentity(gender: GenderIdentity | null): Promise<boolean> {
  const { error } = await (supabase.rpc as any)('update_my_gender_identity', { p_gender: gender });
  if (error) {
    console.log('[Demographics] updateMyGenderIdentity failed:', error.message);
    return false;
  }
  return true;
}

export async function setDemographicAnalyticsConsent(granted: boolean): Promise<boolean> {
  const { error } = await (supabase.rpc as any)('set_my_demographic_analytics_consent', { p_granted: granted });
  if (error) {
    console.log('[Demographics] setDemographicAnalyticsConsent failed:', error.message);
    return false;
  }
  return true;
}
