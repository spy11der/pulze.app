// supabase/functions/_shared/externalVenue.ts
//
// Shared contract every provider adapter normalizes into, plus the one
// shared upsert/dedup function all adapters call. Keeping this logic in one
// place means adding Google/BestTime/ScrapingBee later only requires a
// fetch+normalize function — not a second copy of the dedup/write logic.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type Provider = 'foursquare' | 'google' | 'besttime' | 'scrapingbee';

// Pulze's own venue category vocabulary that algorithm_weights actually has
// rows for today. Anything a provider returns gets normalized down to one
// of these so imported venues get real busyness scoring instead of silently
// falling through with no weight match.
export type PulzeCategory = 'bar' | 'nightclub';

// A provider photo reference — deliberately NOT a permanent image URL.
// Foursquare's photo API returns a prefix/suffix pair you combine with a
// requested size at *request time*, not a stable hotlink you can cache
// forever. Other fields exist so a resolved URL can be stored transiently
// when a provider's terms do allow it, without forcing that assumption on
// every provider.
export interface ExternalPhoto {
  providerPhotoId?: string;
  metadata?: Record<string, unknown>;
  resolvedUrl?: string;
}

export interface ExternalVenue {
  provider: Provider;
  providerVenueId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  category: PulzeCategory;
  rawCategory?: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  photos: ExternalPhoto[];
  rawMetadata: Record<string, unknown>;
}

export function getServiceRoleClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured for this function');
  }
  return createClient(url, key);
}

export interface UpsertResult {
  venueId: string;
  providerVenueId: string;
  name: string;
  created: boolean;
}

// The one shared dedup/write path. Looks up the (provider, providerVenueId)
// pair in venue_provider_links first — that's the actual dedup key, not the
// venue's name/location. Creates a new venues row only if no link exists
// yet; otherwise updates the existing linked venue in place.
export async function upsertExternalVenue(
  supabase: SupabaseClient,
  ev: ExternalVenue,
): Promise<UpsertResult> {
  const { data: existingLink, error: linkLookupError } = await supabase
    .from('venue_provider_links')
    .select('venue_id')
    .eq('provider', ev.provider)
    .eq('provider_venue_id', ev.providerVenueId)
    .maybeSingle();

  if (linkLookupError) throw linkLookupError;

  let venueId: string;
  let created = false;

  if (existingLink?.venue_id) {
    venueId = existingLink.venue_id as string;
    const { error: updateError } = await supabase
      .from('venues')
      .update({
        name: ev.name,
        address: ev.address ?? null,
        phone: ev.phone ?? null,
        website: ev.website ?? null,
        rating: ev.rating ?? null,
        price_level: ev.priceLevel ?? null,
      })
      .eq('id', venueId);
    if (updateError) throw updateError;

    const { error: linkUpdateError } = await supabase
      .from('venue_provider_links')
      .update({ raw_metadata: ev.rawMetadata, last_refreshed_at: new Date().toISOString() })
      .eq('provider', ev.provider)
      .eq('provider_venue_id', ev.providerVenueId);
    if (linkUpdateError) throw linkUpdateError;
  } else {
    const { data: newVenue, error: insertError } = await supabase
      .from('venues')
      .insert({
        name: ev.name,
        category: ev.category,
        latitude: ev.latitude,
        longitude: ev.longitude,
        city: ev.city ?? null,
        address: ev.address ?? null,
        phone: ev.phone ?? null,
        website: ev.website ?? null,
        rating: ev.rating ?? null,
        price_level: ev.priceLevel ?? null,
        is_active: true,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    venueId = newVenue.id as string;
    created = true;

    const { error: linkInsertError } = await supabase.from('venue_provider_links').insert({
      venue_id: venueId,
      provider: ev.provider,
      provider_venue_id: ev.providerVenueId,
      raw_metadata: ev.rawMetadata,
    });
    if (linkInsertError) throw linkInsertError;
  }

  // Photos: store the provider reference/metadata, never the image bytes.
  // Unique index on (provider, provider_photo_id) makes this dedup-safe to
  // re-run.
  for (const photo of ev.photos) {
    if (!photo.providerPhotoId) continue;
    const { error: photoError } = await supabase
      .from('venue_photos')
      .upsert(
        {
          venue_id: venueId,
          source: 'provider',
          provider: ev.provider,
          provider_photo_id: photo.providerPhotoId,
          provider_photo_metadata: photo.metadata ?? null,
          resolved_url: photo.resolvedUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider,provider_photo_id' },
      );
    if (photoError) throw photoError;
  }

  return { venueId, providerVenueId: ev.providerVenueId, name: ev.name, created };
}

// Shared admin-secret check. This — not Supabase's own JWT verification —
// is what actually prevents a normal authenticated app user from triggering
// ingestion: a valid user session token is NOT the same as knowing this
// secret, and the app is never given this secret.
export function requireAdminSecret(req: Request): Response | null {
  const provided = req.headers.get('x-admin-secret');
  const expected = Deno.env.get('ADMIN_INGEST_SECRET');
  if (!expected) {
    return new Response(JSON.stringify({ error: 'ADMIN_INGEST_SECRET not configured' }), { status: 500 });
  }
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return null;
}
