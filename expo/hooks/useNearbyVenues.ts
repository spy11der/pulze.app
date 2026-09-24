import { getNearbyLiveVenues, searchLiveVenues } from '@/services/venues';

export interface NearbyVenue {
  id: string;
  name: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceLabel: string;
  categoryLabel: string;
  busynessPercent: number;
  // Mirrors PulzeVenue.confidence — 0-100 from live_venue_scores. Absent
  // means "not fetched"; the UI treats absent as insufficient signal.
  confidence?: number;
  photoUri?: string;
  tags: string[];
  // Placement contract (6A-1, decision A3). Inert for all of 6A — the server
  // hardcodes these — but carried here so the Nearby card's disclosure path
  // exists and is testable before 6B/6C.
  isSponsored?: boolean;
  placementId?: string | null;
  placementReason?: string | null;
}

export interface SelectedLocation {
  type: 'venue' | 'custom';
  venueId?: string;
  name: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Where Discover browses when the device location is unavailable (denied,
// web without geolocation, or no fix). This is a LAUNCH-MARKET choice, not a
// geographic assumption: every other screen is location-first and shows no
// distance, no "near you" list and no walk time without a real fix, and
// Discover labels the area by the server's `area` name, so a user shown this
// fallback sees "Denver, tonight" -- not a claim that Denver is near them.
// When launch markets exist as data, this becomes "the default active market".
export const FALLBACK_BROWSE_CENTER = { lat: 39.756, lng: -104.99 } as const;

// Walking-time estimate (~84 m/min pace), matching the Nearby card.
export function metersToWalkMinutes(meters: number): string {
  const mins = Math.ceil(meters / 84);
  if (mins < 1) return '1 min';
  return `${mins} min`;
}

// Phase 6A-1 removed the two mock-only helpers that used to live here
// (`getNearbyVenues` and `searchVenues`, both reading mocks/venues.ts
// directly and both synchronous). Their only remaining caller,
// app/location-selector.tsx, had already moved to the Live variants below,
// so they were dead code sitting on top of the mock catalogue — exactly the
// dependency 6A is retiring. Removed rather than left to rot.

// Real, Supabase-backed nearby venues — used by app/(tabs)/nearby.tsx.
export async function getNearbyVenuesLive(lat: number, lng: number, maxResults = 12): Promise<NearbyVenue[]> {
  const venues = await getNearbyLiveVenues(lat, lng, maxResults);
  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    neighborhood: v.neighborhood,
    latitude: v.latitude,
    longitude: v.longitude,
    distanceMeters: v.distanceMeters,
    distanceLabel: formatDistance(v.distanceMeters),
    categoryLabel: v.typeLabel ?? v.type,
    busynessPercent: v.busynessPercent,
    confidence: v.confidence,
    photoUri: v.photo,
    tags: v.tags,
    isSponsored: v.isSponsored,
    placementId: v.placementId,
    placementReason: v.placementReason,
  }));
}

// Real, Supabase-backed venue search — used by app/location-selector.tsx.
// Nationwide by design; a point, when known, only sorts local matches first.
export async function searchVenuesLive(query: string, lat?: number | null, lng?: number | null): Promise<NearbyVenue[]> {
  const venues = await searchLiveVenues(query, 15, lat, lng);
  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    neighborhood: v.neighborhood,
    latitude: v.latitude,
    longitude: v.longitude,
    distanceMeters: 0,
    distanceLabel: '',
    categoryLabel: v.typeLabel ?? v.type,
    busynessPercent: v.busynessPercent,
    confidence: v.confidence,
    photoUri: v.photo,
    tags: v.tags,
    isSponsored: v.isSponsored,
    placementId: v.placementId,
    placementReason: v.placementReason,
  }));
}
