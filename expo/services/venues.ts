import { supabase } from '@/services/supabase';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue, VenueType, BusynessLevel } from '@/types/venue';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Phase 6A-1 — every venue read goes through the authoritative feed.
// ---------------------------------------------------------------------------
//
// What this replaced. Four separate reads issued with the publishable key:
//
//   venues_with_scores   the list / search / detail source   (3 call sites)
//   venues               address, lat/lng, phone, rating, price_level
//   neighborhoods        a second lookup, because venues.neighborhood_id has
//                        no FK and PostGREST cannot auto-embed it
//   live_venue_scores    confidence_score only
//
// ...plus ordering and filtering performed in JavaScript afterwards. Ordering
// decided on the device cannot be recorded, audited, or carry a disclosed paid
// placement, which 6B and 6C both need. It is now one authenticated call to
// the discover-feed Edge Function, which verifies the JWT, derives auth.uid()
// server-side, and calls pulze_discover_feed as service_role.
//
// The personalization blend moved server-side with it. The client no longer
// calls personalized-venues and no longer re-sorts anything: `organic_rank`
// from the feed IS the order. Re-sorting here would double-apply the blend.
//
// 6A-3 COMPLETED THAT MOVE. Category/neighborhood filtering and the Discover
// pill vocabulary are both server-side now: the feed applies filters as hard
// predicates and returns the facet list the pills are rendered from. The one
// remaining mock dependency is presentational — photo, photos, tags and vibe
// — and that boundary is stated in full at feedRowToVenue below.

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

// ---------------------------------------------------------------------------
// Feed wire format — mirrors pulze_discover_feed's jsonb payload exactly.
// ---------------------------------------------------------------------------

export type FeedSurface = 'discover' | 'nearby' | 'search' | 'venue';

export interface FeedVenueRow {
  venue_id: string;
  name: string;
  legacy_mock_id: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  rating: number | null;
  price_level: number | null;
  timezone: string | null;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  pulze_score: number | null;
  busyness_percent: number;
  confidence_score: number | null;
  has_live_signal: boolean;
  trend_label: string | null;
  distance_m: number | null;
  // 6A-3. Three-valued on purpose: 'unknown' is NOT 'closed'. The server
  // returns 'unknown' when a venue has no hours, an incomplete schedule, or a
  // self-contradictory one, and the ranker scores it at the neutral midpoint.
  open_state: 'open' | 'closed' | 'unknown';
  happy_hour: 'now' | 'not_now' | 'unknown';
  organic_score: number;
  organic_rank: number;
  // Inert for all of 6A. See types/venue.ts for the disclosure rule.
  is_sponsored: boolean;
  placement_id: string | null;
  placement_reason: string | null;
}

export interface FeedFacets {
  neighborhoods: { id: string; name: string; venue_count: number }[];
  categories: { value: string; venue_count: number }[];
}

export interface FeedResponse {
  surface: string;
  generated_at: string;
  personalized: boolean;
  min_confidence: number;
  count: number;
  venues: FeedVenueRow[];
  // 6A-3. Derived server-side from venues that actually exist and are active.
  // The Discover pill row is rendered from this rather than a hardcoded array,
  // which is what retired the "Baker" pill that matched zero venues in either
  // the database or the mock catalogue. Baker is still a real neighborhood in
  // the vocabulary (decision D8) -- it simply has no pilot venue yet, so it
  // produces no pill until it does.
  facets: FeedFacets;
  // Nationwide N3. Absent from pre-N3 responses, hence optional.
  area?: FeedArea | null;
  radius_m?: number | null;
  // 'location_required' when discover was called without coordinates: the
  // server no longer ranks the whole country in that case.
  reason?: string;
}

// The area a geo-scoped feed (discover/nearby) is showing, named by the
// server from the nearest venue in range. Null when nothing is in range --
// the UI says so rather than inventing a city.
export interface FeedArea {
  city: string | null;
  region: string | null;
  country_code: string | null;
  timezone: string | null;
}

export const EMPTY_FACETS: FeedFacets = { neighborhoods: [], categories: [] };

const EMPTY_FEED: FeedResponse = {
  surface: 'discover',
  generated_at: '',
  personalized: false,
  min_confidence: 20,
  count: 0,
  venues: [],
  facets: EMPTY_FACETS,
};

interface FeedRequest {
  surface: FeedSurface;
  lat?: number | null;
  lng?: number | null;
  radiusM?: number;
  filters?: Record<string, unknown>;
  limit?: number;
  // Phase 6B: ask the server for disclosed sponsored placements. ONLY screens
  // that render SponsoredBadge on every card may set this (Discover, Nearby;
  // decision B6). Whether anything is placed is decided server-side.
  placements?: boolean;
}

// One call, one failure mode. Every caller below fails soft to an empty feed,
// which is the same contract the four old reads had (they each returned []
// or null on error) — so a feed outage degrades to an empty list, never to a
// crash and never to stale mock content presented as live.
async function fetchFeed(req: FeedRequest): Promise<FeedResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<FeedResponse>('discover-feed', {
      body: {
        surface: req.surface,
        lat: req.lat ?? null,
        lng: req.lng ?? null,
        radius_m: req.radiusM,
        filters: req.filters ?? {},
        limit: req.limit,
        ...(req.placements ? { placements: true } : {}),
      },
    });
    if (error || !data || !Array.isArray(data.venues)) {
      console.log('[Venues] discover-feed error:', error?.message);
      return EMPTY_FEED;
    }
    return { ...data, facets: data.facets ?? EMPTY_FACETS };
  } catch (e) {
    console.log('[Venues] discover-feed crashed:', e);
    return EMPTY_FEED;
  }
}

// Postgres `numeric` can arrive as a JSON number or, for some drivers, a
// string. Coerce once here rather than at every read site.
function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ---------------------------------------------------------------------------
// Feed row -> PulzeVenue
// ---------------------------------------------------------------------------
//
// 6A-3 narrowed what the mock catalogue may supply, and this is the boundary.
//
// GEOGRAPHY IS NOW SERVER-ONLY. neighborhood and address come from the
// database and nowhere else. The mock geography was not merely redundant, it
// was WRONG: it placed Temple Nightclub in LoDo (actually 1136 Broadway,
// Golden Triangle), The Cruise Room in "Downtown" (actually LoDo), Bar
// Standard on "South Broadway" (actually 1037 Broadway), and The Golden Mill
// in RiNo (actually Golden, Colorado). 6A-2 backfilled all 11 active venues
// with verified addresses and neighborhoods, each carrying provenance.
//
// WHAT THE MOCK STILL SUPPLIES, EXPLICITLY AND ONLY: photo, photos, tags and
// vibe copy. Per decision A1 that content was deliberately NOT migrated into
// the database -- it is unsourced presentational filler and the goal is an
// authoritative database, not a database full of tidied-up mock data. Until
// properly sourced imagery exists, this is the one remaining mock dependency
// in the product, and it is confined to these four presentational fields.
// It is named here rather than left implicit so it cannot go unnoticed again.
function feedRowToVenue(row: FeedVenueRow): PulzeVenue {
  const mock = pulzeVenues.find((v) => v.id === row.legacy_mock_id);
  const busynessPercent = Math.round(num(row.busyness_percent) ?? 0);
  const busyness = busynessLevelFromScore(busynessPercent);
  const confidence = num(row.confidence_score);

  const placement = {
    isSponsored: row.is_sponsored === true,
    placementId: row.placement_id ?? null,
    placementReason: row.placement_reason ?? null,
  };

  const { type, typeLabel } = normalizeVenueType(row.category);

  // Presentation-only fallback to the mock, never geography. An absent photo
  // or empty tag list is rendered as absence by the UI (icon placeholder,
  // hidden vibe block) rather than filled in.
  const presentation = mock
    ? { photo: mock.photo, photos: mock.photos ?? [], tags: mock.tags ?? [], vibe: mock.vibe ?? '' }
    : { photo: undefined, photos: [] as string[], tags: [] as string[], vibe: '' };

  return {
    id: row.venue_id,
    name: row.name,
    latitude: num(row.latitude) ?? 0,
    longitude: num(row.longitude) ?? 0,
    type,
    typeLabel,
    busyness,
    busynessPercent,
    // Server only (6A-3). City is not a neighborhood; if the venue has none,
    // show nothing rather than something semantically wrong like "Denver".
    neighborhood: row.neighborhood_name ?? '',
    address: row.address ?? '',
    ...presentation,
    phone: row.phone ?? undefined,
    rating: num(row.rating),
    priceLevel: num(row.price_level),
    confidence,
    ...placement,
  };
}

// ---------------------------------------------------------------------------
// Public API — same signatures the screens already use.
// ---------------------------------------------------------------------------

// 6A-3 filter contract. Every one of these is a HARD filter applied
// server-side in pulze_discover_feed: a non-matching venue is absent from the
// result, never merely demoted. That is the property 6C needs too -- a
// sponsored placement that fails the geographic or category predicate must be
// excluded outright rather than bought past it.
export interface DiscoverFilters {
  /** Raw venue.category values, e.g. ['bar','dive','speakeasy'] for "Bars". */
  categories?: string[];
  /** Neighborhood names exactly as the facets report them. */
  neighborhoods?: string[];
  /** Requires real live signal at or above the confidence floor. */
  busyness?: 'popping' | 'low_wait';
  happyHourNow?: boolean;
  openNow?: boolean;
}

function toFilterPayload(f?: DiscoverFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f?.categories?.length) out.categories = f.categories;
  if (f?.neighborhoods?.length) out.neighborhoods = f.neighborhoods;
  if (f?.busyness) out.busyness = f.busyness;
  if (f?.happyHourNow) out.happy_hour_now = true;
  if (f?.openNow) out.open_now = true;
  return out;
}

export interface DiscoverResult {
  venues: PulzeVenue[];
  facets: FeedFacets;
  personalized: boolean;
  area: FeedArea | null;
}

// Discover is scoped to a metro-sized circle around the point it is given:
// the user's own location, or an area they chose to browse. 40 km covers a
// metro (downtown Denver to Golden is ~20 km) without reaching the next one.
// There is no city or state predicate anywhere -- a user near a state line
// sees what is genuinely near them on both sides.
export const DISCOVER_RADIUS_M = 40_000;

// Discover: venues AND the facet vocabulary, in one call. The screen renders
// its filter pills from `facets` so the pill row always reflects venues that
// actually exist -- no more hardcoded pill matching zero venues.
export async function getDiscoverFeed(
  lat?: number | null,
  lng?: number | null,
  filters?: DiscoverFilters,
): Promise<DiscoverResult> {
  const feed = await fetchFeed({
    surface: 'discover',
    lat,
    lng,
    radiusM: DISCOVER_RADIUS_M,
    filters: toFilterPayload(filters),
    limit: 100,
    placements: true,
  });
  return {
    venues: feed.venues.map(feedRowToVenue),
    facets: feed.facets ?? EMPTY_FACETS,
    personalized: feed.personalized,
    area: feed.area ?? null,
  };
}

// Location-first like Discover: without a point the server returns nothing
// rather than ranking every venue in the country.
export async function getAllLiveVenues(lat?: number | null, lng?: number | null): Promise<PulzeVenue[]> {
  if (lat == null || lng == null) return [];
  const feed = await fetchFeed({ surface: 'discover', lat, lng, radiusM: DISCOVER_RADIUS_M, limit: 100 });
  return feed.venues.map(feedRowToVenue);
}

// Nearby is the tighter "already out" radius. Happy Hour for the same screen
// is fetched with the same circle so the two lists describe the same area.
export const NEARBY_RADIUS_M = 20_000;

export interface NearbyFeedOptions {
  // Only the Nearby tab sets this. It renders SponsoredBadge on every card.
  placements?: boolean;
  // Server-side hard filter (6B): filtering on the client after placement
  // could drop or shift a sponsored row out of its disclosed position.
  happyHourNow?: boolean;
}

export async function getNearbyLiveVenues(
  lat: number,
  lng: number,
  maxResults = 12,
  options: NearbyFeedOptions = {},
): Promise<(PulzeVenue & { distanceMeters: number })[]> {
  // The server applies the limit BEFORE the personalization blend, which is
  // what the client used to do by slicing and only then re-sorting. Passing
  // maxResults through keeps that identical.
  const feed = await fetchFeed({
    surface: 'nearby',
    lat,
    lng,
    radiusM: NEARBY_RADIUS_M,
    limit: maxResults,
    filters: options.happyHourNow ? { happy_hour_now: true } : {},
    placements: options.placements === true,
  });
  return feed.venues.map((row) => ({
    ...feedRowToVenue(row),
    distanceMeters: num(row.distance_m) ?? 0,
  }));
}

// Phase 6B: the user opened venue detail from a sponsored card, which is the CPC
// billable event. Fire-and-forget: navigation never waits on it, and the
// server's answer is deliberately opaque (200 {ok:true} whatever happened).
// Billing, dedupe and venue-member exclusion are decided server-side against
// the server-issued impression. The client sends only its id. One retry with
// the SAME placement_id is idempotent server-side. A lost call can only
// under-bill.
export function recordSponsoredOpen(placementId: string | null | undefined): void {
  if (!placementId) return;
  void (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error } = await supabase.functions.invoke('sponsored-open', {
          body: { placement_id: placementId },
        });
        if (!error) return;
      } catch {
        // Retry once, then give up silently.
      }
    }
  })();
}

export async function resolveVenueById(idOrLegacyId: string): Promise<PulzeVenue | null> {
  const ref = idOrLegacyId?.trim();
  if (!ref) return null;
  const feed = await fetchFeed({
    surface: 'venue',
    filters: { venue_ref: ref },
    limit: 1,
  });
  const row = feed.venues[0];
  return row ? feedRowToVenue(row) : null;
}

// Search is deliberately NOT radius-bounded: typing a name is explicit intent,
// and it is how someone in Charleston finds a Denver venue before a trip. When
// a point is passed, distance feeds the server ranking so local matches sort
// first.
export async function searchLiveVenues(
  query: string,
  maxResults = 15,
  lat?: number | null,
  lng?: number | null,
): Promise<PulzeVenue[]> {
  const q = query.trim();
  if (!q) return [];
  const feed = await fetchFeed({
    surface: 'search',
    lat,
    lng,
    filters: { query: q },
    limit: maxResults,
  });
  return feed.venues.map(feedRowToVenue);
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
