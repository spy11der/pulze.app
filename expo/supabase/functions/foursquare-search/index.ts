// supabase/functions/foursquare-search/index.ts
//
// Server-side only. Requires the x-admin-secret header (see
// requireAdminSecret in _shared/externalVenue.ts) — a valid Supabase user
// session is NOT sufficient to call this, by design.
//
// Request body: { lat, lng, radiusMeters?, limit?, dryRun? }
// dryRun defaults to true: fetches + normalizes, writes nothing, returns
// exactly what would be inserted/updated so results can be inspected before
// any write (or any Foursquare quota beyond the search+photo calls) happens.

import { requireAdminSecret, getServiceRoleClient, upsertExternalVenue, type ExternalVenue, type PulzeCategory } from '../_shared/externalVenue.ts';

const FSQ_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');
const FSQ_BASE_URL = 'https://places-api.foursquare.com/places';
const FSQ_API_VERSION = '2025-06-17';

function fsqHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${FSQ_API_KEY ?? ''}`,
    'X-Places-Api-Version': FSQ_API_VERSION,
    Accept: 'application/json',
  };
}

// Confidence differs per ID — see the plan discussion:
// Nightclub is directly confirmed from Foursquare's own category-taxonomy
// changelog docs. Bar matches the same official ID pattern and is
// corroborated by a community-maintained list, but isn't independently
// confirmed from a first-party Foursquare citation the same way Nightclub
// is. Listed explicitly (not relying on undocumented parent-category
// auto-inclusion) — Cocktail Bar / Dive Bar / Lounge included alongside
// Bar itself so nothing depends on unconfirmed inheritance behavior.
const FSQ_NIGHTLIFE_CATEGORY_IDS = [
  '4bf58dd8d48988d116941735', // Bar
  '4bf58dd8d48988d11e941735', // Cocktail Bar
  '4bf58dd8d48988d118941735', // Dive Bar
  '4bf58dd8d48988d121941735', // Lounge
  '4bf58dd8d48988d11f941735', // Nightclub — directly confirmed from Foursquare's own docs
];

function mapFoursquareCategory(categories: Array<{ id?: number; name?: string }> | undefined): PulzeCategory {
  const names = (categories ?? []).map((c) => (c.name ?? '').toLowerCase());
  if (names.some((n) => n.includes('nightclub') || n.includes('dance club'))) return 'nightclub';
  return 'bar'; // default for anything else in the bar/nightlife family
}

async function fetchFoursquarePhotos(fsqId: string): Promise<ExternalVenue['photos']> {
  try {
    const res = await fetch(`${FSQ_BASE_URL}/${fsqId}/photos?limit=3`, {
      headers: fsqHeaders(),
    });
    if (!res.ok) return [];
    const photos = await res.json();
    return (photos as any[]).map((p) => ({
      providerPhotoId: p.id,
      metadata: { prefix: p.prefix, suffix: p.suffix, width: p.width, height: p.height },
      // Deliberately not resolving a full URL here — prefix+suffix need a
      // size parameter inserted at request time per Foursquare's photo
      // pattern, and caching a resolved URL long-term isn't assumed safe
      // under their terms. See provider_photo_metadata for reconstruction.
    }));
  } catch (e) {
    console.log('[Foursquare] Photo fetch failed for', fsqId, e);
    return [];
  }
}

function normalizeFoursquarePlace(place: any): ExternalVenue {
  return {
    provider: 'foursquare',
    providerVenueId: place.fsq_id,
    name: place.name,
    latitude: place.geocodes?.main?.latitude,
    longitude: place.geocodes?.main?.longitude,
    address: place.location?.formatted_address,
    city: place.location?.locality,
    category: mapFoursquareCategory(place.categories),
    rawCategory: place.categories?.[0]?.name,
    phone: place.tel,
    website: place.website,
    rating: typeof place.rating === 'number' ? place.rating : undefined,
    priceLevel: typeof place.price === 'number' ? place.price : undefined,
    photos: [], // filled in by the caller after fetching photos separately
    rawMetadata: place,
  };
}

Deno.serve(async (req) => {
  const authFailure = requireAdminSecret(req);
  if (authFailure) return authFailure;

  if (!FSQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'FOURSQUARE_API_KEY not configured' }), { status: 500 });
  }

  let body: { lat?: number; lng?: number; radiusMeters?: number; limit?: number; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { lat, lng, radiusMeters = 1000, limit = 5, dryRun = true } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return new Response(JSON.stringify({ error: 'lat and lng are required numbers' }), { status: 400 });
  }
  const boundedLimit = Math.min(Math.max(limit, 1), 10); // hard cap — this is a dry-run/small-batch tool, not a bulk importer

  const searchUrl = `${FSQ_BASE_URL}/search?ll=${lat},${lng}&radius=${radiusMeters}&categories=${FSQ_NIGHTLIFE_CATEGORY_IDS.join(',')}&limit=${boundedLimit}`;
  const fsqRes = await fetch(searchUrl, { headers: fsqHeaders() });

  if (!fsqRes.ok) {
    const text = await fsqRes.text();
    return new Response(JSON.stringify({ error: 'Foursquare API error', status: fsqRes.status, detail: text }), { status: 502 });
  }

  const fsqData = await fsqRes.json();
  const places = (fsqData.results ?? []) as any[];

  const normalized: ExternalVenue[] = [];
  for (const place of places) {
    const ev = normalizeFoursquarePlace(place);
    ev.photos = await fetchFoursquarePhotos(place.fsq_id);
    normalized.push(ev);
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({ dryRun: true, count: normalized.length, venues: normalized }, null, 2),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = getServiceRoleClient();
  const results = [];
  for (const ev of normalized) {
    const result = await upsertExternalVenue(supabase, ev);
    results.push(result);
  }

  return new Response(
    JSON.stringify({ dryRun: false, count: results.length, venues: results }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
