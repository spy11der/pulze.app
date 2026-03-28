interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface RouteWaypoint extends RoutePoint {
  address?: string;
}

export interface WalkingRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polylineCoordinates: RoutePoint[];
}

const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

function parseDurationToSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const normalized = duration.endsWith('s') ? duration.slice(0, -1) : duration;
  const seconds = Number(normalized);
  return Number.isFinite(seconds) ? seconds : 0;
}

function decodePolyline(encoded: string): RoutePoint[] {
  const coordinates: RoutePoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

function isValidRoutePoint(point: RoutePoint | undefined | null): point is RoutePoint {
  return Boolean(
    point
    && Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude)
  );
}

function buildWaypointPayload(waypoint: RouteWaypoint) {
  if (waypoint.address?.trim()) {
    return { address: waypoint.address.trim() };
  }

  return {
    location: {
      latLng: {
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
      },
    },
  };
}

export async function fetchWalkingRoute(origin: RoutePoint, destination: RouteWaypoint): Promise<WalkingRouteResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY. Add it to expo/.env and restart the Expo server.');
  }

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: buildWaypointPayload(origin),
      destination: buildWaypointPayload(destination),
      travelMode: 'WALK',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'IMPERIAL',
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE',
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message ?? 'Google Routes API request failed.';
    throw new Error(message);
  }

  const route = payload?.routes?.[0];
  const encodedPolyline = route?.polyline?.encodedPolyline;

  if (!route || !encodedPolyline) {
    throw new Error('No walking route was returned for this trip.');
  }

  const polylineCoordinates = decodePolyline(encodedPolyline).filter(isValidRoutePoint);

  return {
    distanceMeters: Number(route.distanceMeters ?? 0),
    durationSeconds: parseDurationToSeconds(route.duration),
    polylineCoordinates: polylineCoordinates.length ? polylineCoordinates : [origin, destination],
  };
}