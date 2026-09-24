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
  // Canonical locality (Nationwide N1). region is the ISO 3166-2 subdivision
  // code without the country prefix (US: 'CO', 'SC'); countryCode is ISO
  // 3166-1 alpha-2. Adapters leave any of these undefined rather than guess.
  region?: string;
  postalCode?: string;
  countryCode?: string;
  // IANA Area/Location name. REQUIRED to create a venue: venues.timezone has
  // no default any more, and every venue-local computation (hours, Happy Hour,
  // promotion pricing) runs in it. Never inferred from the city name.
  timezone?: string;
  category: PulzeCategory;
  rawCategory?: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  photos: ExternalPhoto[];
  rawMetadata: Record<string, unknown>;
}

// Shape-checks provider locality before it reaches the venues CHECK
// constraints, so one malformed field drops that field instead of failing the
// whole venue. Returns undefined for anything that does not fit.
export function normalizeRegion(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toUpperCase();
  return /^[A-Z0-9]{1,3}$/.test(v) ? v : undefined;
}

export function normalizeCountryCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : undefined;
}

export function normalizePostalCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  return v.length >= 3 && v.length <= 12 && /^[A-Za-z0-9 -]+$/.test(v) ? v : undefined;
}

export function normalizeTimezone(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  // Same Area/Location shape the database trigger enforces; the database
  // remains the authority on whether the zone actually exists.
  return /^[A-Za-z]+\/[A-Za-z0-9_+/-]+$/.test(v) ? v : undefined;
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
//
// Nothing here is city-specific: identity is the provider link, location is
// the provider's coordinates, and the timezone must come with the record.
// KNOWN GAP (not addressed here): a venue first imported from provider A and
// later seen from provider B has no A-link lookup, so B creates a second row.
// Cross-provider matching needs a candidate step (nearby + normalized name +
// address) with human review for ambiguous pairs; see the nationwide report.
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
        // Locality only when the provider supplied it, so a sparse refresh
        // never erases a curated value. Timezone is deliberately NOT
        // refreshed: once set it is Pulze's authoritative value.
        ...(ev.region ? { region: ev.region } : {}),
        ...(ev.postalCode ? { postal_code: ev.postalCode } : {}),
        ...(ev.countryCode ? { country_code: ev.countryCode } : {}),
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
    if (!ev.timezone) {
      // Refuse rather than guess. Before Nationwide N1 this insert silently
      // inherited America/Denver; now the column has no default and the
      // database would reject it anyway -- this just says why, per venue.
      throw new Error(
        `timezone_required: ${ev.provider}:${ev.providerVenueId} (${ev.name}) has no timezone; not creating a venue`,
      );
    }
    const { data: newVenue, error: insertError } = await supabase
      .from('venues')
      .insert({
        name: ev.name,
        category: ev.category,
        latitude: ev.latitude,
        longitude: ev.longitude,
        city: ev.city ?? null,
        region: ev.region ?? null,
        postal_code: ev.postalCode ?? null,
        country_code: ev.countryCode ?? null,
        timezone: ev.timezone,
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

// Constant-time byte comparison. A plain `a !== b` would return as soon
// as the first byte differs, which leaks the length of the common prefix
// to a caller who can measure response latency accurately. This variant
// walks the full length in every call.
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
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
  const enc = new TextEncoder();
  if (!provided || !timingSafeEqualBytes(enc.encode(provided), enc.encode(expected))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return null;
}
