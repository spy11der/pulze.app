import { pulzeVenues } from '@/mocks/venues';
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
  photoUri?: string;
  tags: string[];
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

// Shared fallback when the user's location is unavailable — used by Nearby,
// Home, and Venue Detail so all screens show the same estimates.
export const DENVER_COORDS = { lat: 39.756, lng: -104.99 } as const;

// Walking-time estimate (~84 m/min pace), matching the Nearby card.
export function metersToWalkMinutes(meters: number): string {
  const mins = Math.ceil(meters / 84);
  if (mins < 1) return '1 min';
  return `${mins} min`;
}

function toNearbyVenue(
  lat: number,
  lng: number,
  v: (typeof pulzeVenues)[number],
): NearbyVenue {
  const distanceMeters = haversineMeters(lat, lng, v.latitude, v.longitude);
  return {
    id: v.id,
    name: v.name,
    neighborhood: v.neighborhood,
    latitude: v.latitude,
    longitude: v.longitude,
    distanceMeters,
    distanceLabel: formatDistance(distanceMeters),
    categoryLabel: v.typeLabel ?? v.type,
    busynessPercent: v.busynessPercent,
    photoUri: v.photo,
    tags: v.tags,
  };
}

// Kept for location-selector.tsx, which still uses this synchronous,
// mock-only version. Not touched this round.
export function getNearbyVenues(
  lat: number,
  lng: number,
  maxResults: number = 10,
): NearbyVenue[] {
  return pulzeVenues
    .map((v) => toNearbyVenue(lat, lng, v))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, maxResults);
}

// Kept for location-selector.tsx. Not touched this round.
export function searchVenues(query: string): NearbyVenue[] {
  const q = query.toLowerCase();
  return pulzeVenues
    .filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        (v.typeLabel ?? v.type).toLowerCase().includes(q),
    )
    .map((v) => ({
      id: v.id,
      name: v.name,
      neighborhood: v.neighborhood,
      latitude: v.latitude,
      longitude: v.longitude,
      distanceMeters: 0,
      distanceLabel: '',
      categoryLabel: v.typeLabel ?? v.type,
      busynessPercent: v.busynessPercent,
      photoUri: v.photo,
      tags: v.tags,
    }))
    .slice(0, 15);
}

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
    photoUri: v.photo,
    tags: v.tags,
  }));
}

// Real, Supabase-backed venue search. Not yet wired into any screen this
// round (location-selector.tsx, the only current caller of `searchVenues`,
// is out of scope for this pass) — available for that follow-up.
export async function searchVenuesLive(query: string): Promise<NearbyVenue[]> {
  const venues = await searchLiveVenues(query);
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
    photoUri: v.photo,
    tags: v.tags,
  }));
}
