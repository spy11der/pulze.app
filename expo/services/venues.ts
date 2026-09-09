import { supabase } from '@/services/supabase';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue, VenueType, BusynessLevel } from '@/types/venue';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function busynessLevelFromScore(score: number): BusynessLevel {
  if (score >= 75) return 'packed';
  if (score >= 40) return 'getting_busy';
  return 'quiet';
}

// Normalizes whatever's in venues.category (currently the mock-era values
// like 'club'/'dive'/'speakeasy', or a provider-imported 'bar'/'nightclub')
// into the existing VenueType union and a display label. Safe default is
// 'bar' — matches the same choice already made server-side for imported
// venues, not a new invented category.
const CATEGORY_LABELS: Record<VenueType, string> = {
  bar: 'Bar',
  club: 'Club',
  lounge: 'Lounge',
  brewery: 'Brewery',
  dive: 'Dive Bar',
  rooftop: 'Rooftop',
  speakeasy: 'Speakeasy',
};

function normalizeVenueType(rawCategory: string | null | undefined): { type: VenueType; typeLabel: string } {
  const key = (rawCategory ?? '').toLowerCase().trim();
  const known: VenueType[] = ['bar', 'club', 'lounge', 'brewery', 'dive', 'rooftop', 'speakeasy'];
  const match = known.find((t) => t === key) ?? (key === 'nightclub' ? 'club' : undefined);
  const type = match ?? 'bar';
  return { type, typeLabel: CATEGORY_LABELS[type] };
}

interface ExtraVenueFields {
  category?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  rating?: number | null;
  price_level?: number | null;
}

// Merges a real Supabase venue (identity + live score) with its mock's
// presentational content (photos/tags/vibe copy/address — not yet migrated
// into Supabase) when a mock match exists. When no mock match exists (e.g.
// a provider-imported venue), builds a real-data-only fallback instead of
// dropping the venue — using only actual Supabase fields, never invented
// photos/tags/vibe/activity.
function mergeWithMock(
  realId: string,
  legacyMockId: string | null,
  name: string,
  pulzeScore: number,
  confidence: number | null | undefined,
  extra?: ExtraVenueFields,
): PulzeVenue {
  const mock = pulzeVenues.find((v) => v.id === legacyMockId);
  const busynessPercent = Math.round(pulzeScore);
  const busyness = busynessLevelFromScore(busynessPercent);
  // Real per-venue confidence from live_venue_scores. Undefined here means
  // we didn't fetch it; the UI treats undefined as insufficient signal and
  // renders the neutral "no live data" state, which is what we want.
  const confidenceNum = confidence === null || confidence === undefined
    ? undefined
    : Number(confidence);

  if (mock) {
    return {
      ...mock,
      id: realId,
      name,
      busynessPercent,
      busyness,
      confidence: confidenceNum,
    };
  }

  // Real-data fallback — every field here comes from an actual Supabase
  // column, never fabricated content.
  const { type, typeLabel } = normalizeVenueType(extra?.category);
  return {
    id: realId,
    name,
    latitude: extra?.latitude ?? 0,
    longitude: extra?.longitude ?? 0,
    type,
    typeLabel,
    busyness,
    busynessPercent,
    neighborhood: extra?.city ?? '',
    address: extra?.address ?? '',
    vibe: '', // intentionally empty — no invented copy; UI hides the vibe block when empty
    tags: [],
    photo: undefined, // UI already falls back to its existing icon placeholder
    photos: [],
    phone: extra?.phone ?? undefined,
    rating: extra?.rating ?? undefined,
    priceLevel: extra?.price_level ?? undefined,
    confidence: confidenceNum,
  };
}

// venues_with_scores exposes pulze_score but not confidence_score. Rather
// than modify the view, batch-fetch confidence from live_venue_scores by
// venue id — same additive pattern as fetchExtraVenueFields.
async function fetchConfidenceByVenueId(venueIds: string[]): Promise<Record<string, number>> {
  if (venueIds.length === 0) return {};
  const { data, error } = await supabase
    .from('live_venue_scores')
    .select('venue_id, confidence_score')
    .in('venue_id', venueIds);
  if (error || !data) {
    console.log('[Venues] fetchConfidenceByVenueId error:', error?.message);
    return {};
  }
  const byId: Record<string, number> = {};
  for (const row of data as any[]) {
    byId[row.venue_id] = Number(row.confidence_score);
  }
  return byId;
}

// venues_with_scores (existing view, unchanged) already exposes
// category/city, but not address/latitude/longitude/phone/rating/price_level
// — rather than modify that view, fetch those extra real columns from the
// base venues table and merge client-side by id.
async function fetchExtraVenueFields(venueIds: string[]): Promise<Record<string, ExtraVenueFields>> {
  if (venueIds.length === 0) return {};
  const { data, error } = await supabase
    .from('venues')
    .select('id, category, city, address, latitude, longitude, phone, rating, price_level')
    .in('id', venueIds);
  if (error || !data) {
    console.log('[Venues] fetchExtraVenueFields error:', error?.message);
    return {};
  }
  const byId: Record<string, ExtraVenueFields> = {};
  for (const row of data as any[]) {
    byId[row.id] = row;
  }
  return byId;
}

export async function getAllLiveVenues(): Promise<PulzeVenue[]> {
  const { data, error } = await supabase
    .from('venues_with_scores')
    .select('venue_id, name, legacy_mock_id, pulze_score');

  if (error || !data) {
    console.log('[Venues] getAllLiveVenues error:', error?.message);
    return [];
  }

  const rows = data as any[];
  const ids = rows.map((r) => r.venue_id);
  const [extraById, confidenceById] = await Promise.all([
    fetchExtraVenueFields(ids),
    fetchConfidenceByVenueId(ids),
  ]);

  return rows.map((row) =>
    mergeWithMock(
      row.venue_id,
      row.legacy_mock_id,
      row.name,
      row.pulze_score,
      confidenceById[row.venue_id],
      extraById[row.venue_id],
    ),
  );
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

  const rows = (data as any[]).slice(0, maxResults);
  const extraById = await fetchExtraVenueFields(rows.map((r) => r.venue_id));

  return rows.map((row) => {
    // rank_nearby_venues already returns confidence_score — no supplementary
    // fetch needed for the Nearby path.
    const merged = mergeWithMock(
      row.venue_id,
      row.legacy_mock_id,
      row.venue_name,
      row.pulze_score,
      row.confidence_score,
      extraById[row.venue_id],
    );
    return { ...merged, distanceMeters: Number(row.distance_m) };
  });
}

export async function resolveVenueById(idOrLegacyId: string): Promise<PulzeVenue | null> {
  const column = UUID_RE.test(idOrLegacyId) ? 'venue_id' : 'legacy_mock_id';
  const { data, error } = await supabase
    .from('venues_with_scores')
    .select('venue_id, name, legacy_mock_id, pulze_score')
    .eq(column, idOrLegacyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  const [extraById, confidenceById] = await Promise.all([
    fetchExtraVenueFields([row.venue_id]),
    fetchConfidenceByVenueId([row.venue_id]),
  ]);
  return mergeWithMock(
    row.venue_id,
    row.legacy_mock_id,
    row.name,
    row.pulze_score,
    confidenceById[row.venue_id],
    extraById[row.venue_id],
  );
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
  const rows = data as any[];
  const ids = rows.map((r) => r.venue_id);
  const [extraById, confidenceById] = await Promise.all([
    fetchExtraVenueFields(ids),
    fetchConfidenceByVenueId(ids),
  ]);
  return rows.map((row) =>
    mergeWithMock(
      row.venue_id,
      row.legacy_mock_id,
      row.name,
      row.pulze_score,
      confidenceById[row.venue_id],
      extraById[row.venue_id],
    ),
  );
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
