import { pulzeVenues } from '@/mocks/venues';

export interface NearbyVenue {
  id: string;
  name: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceLabel: string;
  categoryLabel: string;
}

export interface SelectedLocation {
  type: 'venue' | 'custom';
  venueId?: string;
  name: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

function haversineMeters(
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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
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
  };
}

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
    }))
    .slice(0, 15);
}
