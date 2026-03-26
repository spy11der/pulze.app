import { useCallback, useEffect, useState } from 'react';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue } from '@/types/venue';

export interface NearbyVenue extends PulzeVenue {
  distanceMeters: number;
  distanceLabel: string;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 150) return 'Nearby';
  const miles = meters / 1609.34;
  if (miles < 0.2) return 'Nearby';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  if (miles < 100) return `${Math.round(miles)} mi`;
  return 'Nearby';
}

export function getNearbyVenues(
  latitude: number,
  longitude: number,
  limit: number = 5
): NearbyVenue[] {
  console.log('[NearbyVenues] Computing nearby venues for', { latitude, longitude });
  const withDistance = pulzeVenues.map((venue) => {
    const distanceMeters = haversineDistance(
      latitude,
      longitude,
      venue.latitude,
      venue.longitude
    );
    return {
      ...venue,
      distanceMeters,
      distanceLabel: formatDistance(distanceMeters),
    };
  });

  withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return withDistance.slice(0, limit);
}

export function searchVenues(query: string): NearbyVenue[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return pulzeVenues
    .filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        v.categoryLabel.toLowerCase().includes(q)
    )
    .map((v) => ({
      ...v,
      distanceMeters: 0,
      distanceLabel: '',
    }));
}

export interface SelectedLocation {
  type: 'venue' | 'custom';
  venueId?: string;
  name: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
}

export function useNearbyVenues(coords: { latitude: number; longitude: number } | null) {
  const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);

  useEffect(() => {
    if (coords) {
      const nearby = getNearbyVenues(coords.latitude, coords.longitude, 5);
      console.log('[NearbyVenues] Found', nearby.length, 'nearby venues');
      setNearbyVenues(nearby);
    }
  }, [coords]);

  const refreshNearby = useCallback(
    (lat: number, lon: number) => {
      const nearby = getNearbyVenues(lat, lon, 5);
      setNearbyVenues(nearby);
    },
    []
  );

  return { nearbyVenues, refreshNearby };
}
