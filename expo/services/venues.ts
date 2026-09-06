import { supabase } from '@/services/supabase';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue, BusynessLevel } from '@/types/venue';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function busynessLevelFromScore(score: number): BusynessLevel {
  if (score >= 75) return 'packed';
  if (score >= 40) return 'getting_busy';
  return 'quiet';
}

// Merges a real Supabase venue (identity + live score) with its mock's
// presentational content (photos/tags/vibe copy/address — not yet migrated
// into Supabase). The real id/name/busyness always win; only display
// flavor comes from the mock. If no mock match exists, the venue is
// skipped for now rather than shown with placeholder content.
function mergeWithMock(
  realId: string,
  legacyMockId: string | null,
  name: string,
  pulzeScore: number,
): PulzeVenue | null {
  const mock = pulzeVenues.find((v) => v.id === legacyMockId);
  if (!mock) return null;
  const busynessPercent = Math.round(pulzeScore);
  return {
    ...mock,
    id: realId,
    name,
    busynessPercent,
    busyness: busynessLevelFromScore(busynessPercent),
  };
}

export async function getAllLiveVenues(): Promise<PulzeVenue[]> {
  const { data, error } = await supabase
    .from('venues_with_scores')
    .select('venue_id, name, legacy_mock_id, pulze_score');

  if (error || !data) {
    console.log('[Venues] getAllLiveVenues error:', error?.message);
    return [];
  }

  return (data as any[])
    .map((row) => mergeWithMock(row.venue_id, row.legacy_mock_id, row.name, row.pulze_score))
    .filter((v): v is PulzeVenue => v !== null);
}

export async function getNearbyLiveVenues(
  lat: number,
  lng: number,
  maxResults = 12,
): Promise<(PulzeVenue & { distanceMeters: number })[]> {
  // `rank_nearby_venues` isn't in the generated Supabase types — cast the rpc call.
  const { data, error } = await (supabase.rpc as any)('rank_nearby_venues', {
    p_user_lat: lat,
    p_user_lon: lng,
    p_radius_m: 20000,
    p_desired_mode: 'default',
  });

  if (error || !data) {
    console.log('[Venues] getNearbyLiveVenues error:', error?.message);
    return [];
  }

  return (data as any[])
    .slice(0, maxResults)
    .map((row) => {
      const merged = mergeWithMock(row.venue_id, row.legacy_mock_id, row.venue_name, row.pulze_score);
      if (!merged) return null;
      return { ...merged, distanceMeters: Number(row.distance_m) };
    })
    .filter((v): v is PulzeVenue & { distanceMeters: number } => v !== null);
}

export async function resolveVenueById(idOrLegacyId: string): Promise<PulzeVenue | null> {
  const column = UUID_RE.test(idOrLegacyId) ? 'venue_id' : 'legacy_mock_id';
  const { data, error } = await supabase
    .from('venues_with_scores')
    .select('venue_id, name, legacy_mock_id, pulze_score')
    .eq(column, idOrLegacyId)
    .maybeSingle();
  if (error || !data) return null;
  return mergeWithMock((data as any).venue_id, (data as any).legacy_mock_id, (data as any).name, (data as any).pulze_score);
}

// Real cross-user check-in count for a venue. `realVenueId` must already be
// a resolved Supabase UUID (callers typically already have this from
// resolveVenueById). RLS applies — this counts what the current viewer is
// allowed to see (public + their own + inner-circle-private), not a
// literal unfiltered total. That's an intentional, honest scope for MVP.
export async function getRealCheckInCount(realVenueId: string): Promise<number> {
  const { count, error } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', realVenueId)
    .eq('is_deleted', false);
  if (error) {
    console.log('[Venues] getRealCheckInCount error:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Real Supabase venue search (name/category/city), enriched with mock
// display content the same way the other live functions are. Note:
// "neighborhood" as the mocks define it isn't a searchable Supabase column
// yet, so this matches on city instead as the closest real equivalent.
export async function searchLiveVenues(query: string, maxResults = 15): Promise<PulzeVenue[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('venues_with_scores')
    .select('venue_id, name, legacy_mock_id, pulze_score')
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(maxResults);
  if (error || !data) {
    console.log('[Venues] searchLiveVenues error:', error?.message);
    return [];
  }
  return (data as any[])
    .map((row) => mergeWithMock(row.venue_id, row.legacy_mock_id, row.name, row.pulze_score))
    .filter((v): v is PulzeVenue => v !== null);
}

export interface VenueActivitySummary {
  checkInCount: number;
  lastActivityIso: string | null;
}

// Real per-venue check-in count + most recent check-in timestamp, derived
// directly from check_ins (RLS-filtered, same as everywhere else — no new
// backend object needed for this).
export async function getVenueActivitySummaries(venueIds: string[]): Promise<Record<string, VenueActivitySummary>> {
  if (venueIds.length === 0) return {};
  const { data, error } = await supabase
    .from('check_ins')
    .select('venue_id, created_at')
    .in('venue_id', venueIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.log('[Venues] getVenueActivitySummaries error:', error?.message);
    return {};
  }

  const summary: Record<string, VenueActivitySummary> = {};
  for (const row of data as any[]) {
    const existing = summary[row.venue_id];
    if (!existing) {
      summary[row.venue_id] = { checkInCount: 1, lastActivityIso: row.created_at };
    } else {
      existing.checkInCount += 1;
    }
  }
  return summary;
}
