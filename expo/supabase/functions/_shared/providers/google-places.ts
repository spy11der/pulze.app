// supabase/functions/_shared/providers/google-places.ts
//
// Not implemented. Insertion point for a future Google Places adapter —
// same shape as foursquare-search/index.ts's normalizeFoursquarePlace:
// fetch from Google Places API, map into ExternalVenue, hand off to the
// shared upsertExternalVenue(). Secret name reserved: GOOGLE_PLACES_API_KEY.

import type { ExternalVenue } from '../externalVenue.ts';

export async function normalizeGooglePlace(_place: unknown): Promise<ExternalVenue> {
  throw new Error('Google Places adapter not implemented yet');
}
