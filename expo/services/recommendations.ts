// Recommendation client — talks to the personalized-venues Edge
// Function and produces a blend helper used by Home + Nearby.
//
// Design rules baked in here:
//
//   * The mobile client never calls rank_personalized_venues_for_user
//     directly (it's REVOKE'd from `authenticated`). It calls the
//     Edge Function, which runs with the service_role key and
//     enforces auth via the caller's JWT.
//
//   * Every recommendation call is fire-and-forget from the venue-
//     rendering perspective. If the network fails, or the server
//     returns an error, or personalization is off — the caller
//     falls back to the existing live venue ordering. Recommendation
//     failure NEVER blocks the venue list from rendering.
//
//   * Personalization scores are NOT summed into the raw live score.
//     The live score is preserved; personalization is a normalized
//     0-100 preference blended at 70/30 (live/preference).

import { supabase } from '@/services/supabase';

// Wire-format from the Edge Function. Shape intentionally minimal:
// no raw event rows, no search terms, no demographics, no consent
// timestamps.
interface EdgeRanking {
  venue_id: string;
  personalization_score: number;
  primary_reason: string;
}
interface EdgeResponse {
  personalized: boolean;
  generated_at: string | null;
  rankings: EdgeRanking[];
}

// The map the client passes around: venue_id -> raw personalization
// score from Batch 4C. `personalized === false` means we're in cold-
// start / consent-off / failure and NO blend should be applied.
export interface PersonalizationSnapshot {
  personalized: boolean;
  scoresByVenueId: Map<string, number>;
  primaryReasonByVenueId: Map<string, string>;
  fetchedAt: number;
}

const EMPTY_SNAPSHOT: PersonalizationSnapshot = {
  personalized: false,
  scoresByVenueId: new Map(),
  primaryReasonByVenueId: new Map(),
  fetchedAt: 0,
};

export function emptyPersonalizationSnapshot(): PersonalizationSnapshot {
  return EMPTY_SNAPSHOT;
}

// Fetches once per relevant screen/session (not per venue). Bounded
// limit of 50 covers well beyond the current 12-venue Denver seed.
// Non-personalized outcomes (cold start, consent off, network
// failure, server error) all collapse to the same empty snapshot so
// callers only need to branch on `personalized`.
export async function fetchPersonalizedVenueScores(limit: number = 50): Promise<PersonalizationSnapshot> {
  try {
    const { data, error } = await supabase.functions.invoke<EdgeResponse>(
      'personalized-venues',
      { body: { limit } },
    );
    if (error || !data) {
      console.log('[Recommendations] edge fn error:', error?.message);
      return EMPTY_SNAPSHOT;
    }
    if (!data.personalized || !Array.isArray(data.rankings) || data.rankings.length === 0) {
      return EMPTY_SNAPSHOT;
    }
    const scores = new Map<string, number>();
    const reasons = new Map<string, string>();
    for (const r of data.rankings) {
      if (!r?.venue_id) continue;
      scores.set(r.venue_id, Number(r.personalization_score) || 0);
      if (r.primary_reason) reasons.set(r.venue_id, r.primary_reason);
    }
    return {
      personalized: true,
      scoresByVenueId: scores,
      primaryReasonByVenueId: reasons,
      fetchedAt: Date.now(),
    };
  } catch (e) {
    console.log('[Recommendations] fetch crashed:', e);
    return EMPTY_SNAPSHOT;
  }
}


// -----------------------------
// Blend math (MVP tuning constants).
// -----------------------------
//
// Normalize the raw Batch-4C score into a bounded 0-100 preference
// via a clamped linear transform:
//     preference = clamp(50 + rawScore * 2, 0, 100)
// With SENSITIVITY = 2:
//   raw 0   -> pref 50   (neutral baseline)
//   raw +8  -> pref 66   (single fresh save moves modestly upward)
//   raw +16 -> pref 82   (save + view-cap combo)
//   raw +25 -> pref 100  (clamped; extreme volume can't exceed 100)
//   raw -10 -> pref 30   (unsave drops noticeably)
//   raw -25 -> pref 0    (clamped)
// Chosen so a single save is a real signal but no amount of spam
// can push a venue above the max.
export const PREFERENCE_BASELINE = 50;
export const PREFERENCE_SENSITIVITY = 2;
export const PREFERENCE_MIN = 0;
export const PREFERENCE_MAX = 100;

// Blend weights. Live conditions intentionally dominate — a hot
// venue "right now" is more useful than a slightly personally-
// preferred venue that's dead. This is an MVP tuning constant.
export const BLEND_LIVE_WEIGHT = 0.7;
export const BLEND_PREF_WEIGHT = 0.3;

// Live score used: `busynessPercent` on every venue shape (Home's
// PulzeVenue and Nearby's NearbyVenue). It's the 0-100
// `pulze_score` from `venues_with_scores` for Home, and the 0-100
// `busynessPercent` returned by `rank_nearby_venues` for Nearby.

export function rawToPreferenceScore(rawScore: number): number {
  const preference = PREFERENCE_BASELINE + rawScore * PREFERENCE_SENSITIVITY;
  if (preference < PREFERENCE_MIN) return PREFERENCE_MIN;
  if (preference > PREFERENCE_MAX) return PREFERENCE_MAX;
  return preference;
}

// Venues NOT in the personalization ranking get the neutral 50
// baseline. That keeps the blend uniform: every venue is scored the
// same way, and preferred venues rise above / disliked venues fall
// below the neutral-baseline peers. Cold-start / consent-off users
// bypass this function entirely (personalized: false), so this
// neutral-fill only ever runs for consented users with some history.
export function blendScoreFor(venueId: string, busynessPercent: number, snapshot: PersonalizationSnapshot): number {
  const raw = snapshot.scoresByVenueId.get(venueId) ?? 0;
  const preference = rawToPreferenceScore(raw);
  const live = Number.isFinite(busynessPercent) ? busynessPercent : 0;
  return BLEND_LIVE_WEIGHT * live + BLEND_PREF_WEIGHT * preference;
}

// The one venue-ordering helper Home + Nearby both use. Preserves
// the caller's original order when personalization is unavailable
// (cold start, consent off, failure, empty snapshot) — the array
// passes through untouched. When personalization is available,
// sort by descending blended score with stable tie-breaking on the
// original index so unrelated venues don't shuffle randomly.
export function blendVenueOrder<T extends { id: string; busynessPercent: number }>(
  venues: T[],
  snapshot: PersonalizationSnapshot,
): T[] {
  if (!snapshot.personalized || snapshot.scoresByVenueId.size === 0) return venues;

  const indexed = venues.map((venue, index) => ({
    venue,
    index,
    finalScore: blendScoreFor(venue.id, venue.busynessPercent, snapshot),
  }));
  indexed.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.index - b.index; // stable
  });
  return indexed.map((row) => row.venue);
}
