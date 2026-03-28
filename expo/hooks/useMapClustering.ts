import { useMemo } from 'react';
import type { PulzeVenue, MapCluster } from '@/types/venue';
import type { Region } from 'react-native-maps';

const CLUSTER_GRID_SIZE = 60;

function latLngToPixel(
  lat: number,
  lng: number,
  region: Region,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  const x = ((lng - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * mapWidth;
  const y = ((region.latitude + region.latitudeDelta / 2 - lat) / region.latitudeDelta) * mapHeight;
  return { x, y };
}

export function useMapClustering(
  venues: PulzeVenue[],
  region: Region,
  mapWidth: number,
  mapHeight: number
): { clusters: MapCluster[]; singles: PulzeVenue[] } {
  return useMemo(() => {
    if (mapWidth === 0 || mapHeight === 0) {
      return { clusters: [], singles: venues };
    }

    const zoomLevel = region.latitudeDelta;

    if (zoomLevel < 0.015) {
      return { clusters: [], singles: venues };
    }

    const grid: Record<string, PulzeVenue[]> = {};

    for (const venue of venues) {
      const pixel = latLngToPixel(venue.latitude, venue.longitude, region, mapWidth, mapHeight);
      const cellX = Math.floor(pixel.x / CLUSTER_GRID_SIZE);
      const cellY = Math.floor(pixel.y / CLUSTER_GRID_SIZE);
      const key = `${cellX}_${cellY}`;

      if (!grid[key]) {
        grid[key] = [];
      }
      grid[key].push(venue);
    }

    const clusters: MapCluster[] = [];
    const singles: PulzeVenue[] = [];

    for (const [key, cellVenues] of Object.entries(grid)) {
      if (cellVenues.length >= 2) {
        const avgLat = cellVenues.reduce((s, v) => s + v.latitude, 0) / cellVenues.length;
        const avgLng = cellVenues.reduce((s, v) => s + v.longitude, 0) / cellVenues.length;
        const avgScore = Math.round(cellVenues.reduce((s, v) => s + v.vibe_score, 0) / cellVenues.length);

        clusters.push({
          id: `cluster_${key}`,
          latitude: avgLat,
          longitude: avgLng,
          count: cellVenues.length,
          venues: cellVenues,
          avgVibeScore: avgScore,
        });
      } else {
        singles.push(...cellVenues);
      }
    }

    return { clusters, singles };
  }, [venues, region, mapWidth, mapHeight]);
}
