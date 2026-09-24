// discover-feed
//
// The single authenticated entry point to Consumer discovery.
//
// Before 6A the app reached venue data four different ways, three of them by
// reading `venues_with_scores` / `venues` / `live_venue_scores` directly with
// the publishable key, and did its filtering and final ordering in JavaScript.
// Ordering decided on the device cannot be recorded, audited, or host a
// disclosed paid placement -- which 6B (CPC) and 6C (boosts) both require.
//
// Flow, identical in shape to personalized-venues:
//   1. The edge gateway verifies the JWT (verify_jwt = true). Missing or
//      expired -> 401 before this code runs at all.
//   2. Re-derive the user id via auth.getUser() with the caller's own
//      Authorization header. A client-supplied user id is never trusted.
//   3. Call pulze_discover_feed as service_role. That RPC is REVOKE'd from
//      anon and authenticated, so the app cannot reach it directly and
//      cannot ask for another user's personalization.
//
// THIS FUNCTION IS ALSO THE COLUMN ALLOWLIST. The RPC selects a fixed set of
// venue columns and nothing else -- notably never wifi_fingerprint,
// wifi_fingerprint_hash, ble_beacon_id, ble_uuid, geofence_radius_meters,
// hysteresis_buffer_meters, importance_score, location or geom. Those are the
// exact columns Exposure B in pulze-db/docs/security-findings.md wants revoked
// from `authenticated`, and routing all reads through here is what makes that
// revoke safe to perform in 6D.
//
// The service_role key stays in Deno.env -- never in the mobile bundle.
//
// CORS. Before 6A the Consumer read venue data straight from PostgREST, which
// answers preflight with `access-control-allow-origin: *`. Routing those four
// reads through this function moved them to an origin that did not answer
// preflight at all -- OPTIONS fell through to the 405 below with no CORS
// headers -- so every browser-origin call failed before it was sent, and
// fetchFeed's fail-soft path turned that into a silently empty feed. Native
// builds were unaffected (no CORS there), which is why it was invisible until
// web mode was exercised.
//
// `*` matches what PostgREST already serves for the same data, and is safe
// here because the JWT arrives as an explicit Authorization header rather than
// as a cookie: a hostile page can only call this with a session it already
// holds, so the origin check was never the control. The grant on
// pulze_discover_feed is. Headers go on EVERY response, errors included --
// otherwise the browser cannot read the status it was given.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SURFACES = new Set(['discover', 'nearby', 'search', 'venue']);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const DEFAULT_RADIUS_M = 20_000;
const MAX_RADIUS_M = 50_000;
const MIN_RADIUS_M = 100;

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-max-age': '3600',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

// Every auth failure exits through this, so the response is identical for a
// missing header, an expired token and a forged one.
function unauthorized(): Response {
  return jsonResponse({ error: 'unauthorized' }, 401);
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function finiteOrNull(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

Deno.serve(async (req) => {
  // Must precede the method check: an OPTIONS preflight is not a client error.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('[discover-feed] missing env');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return unauthorized();

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData?.user?.id) return unauthorized();
  const userId = userData.user.id;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // No body / not JSON -> defaults. Not a client-visible error.
  }

  const surface = typeof body.surface === 'string' ? body.surface.toLowerCase() : 'discover';
  if (!SURFACES.has(surface)) {
    return jsonResponse({ error: 'invalid_surface' }, 400);
  }

  const lat = finiteOrNull(body.lat);
  const lng = finiteOrNull(body.lng);
  const radiusM = clampInt(body.radius_m, DEFAULT_RADIUS_M, MIN_RADIUS_M, MAX_RADIUS_M);
  const limit = clampInt(body.limit, DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);

  // Latitude/longitude are required for `nearby` and are what the ST_DWithin
  // predicate runs against. Reject here with a clear code rather than letting
  // the RPC raise, so the client can fall back to its Denver default.
  if (surface === 'nearby' && (lat === null || lng === null)) {
    return jsonResponse({ error: 'coordinates_required' }, 400);
  }

  // Filters are passed through as an opaque jsonb object. 6A-1 carries the
  // contract; the RPC only reads `query` and `venue_ref` today. Anything else
  // is inert until 6A-3 activates category/neighborhood filtering, which is
  // deliberate -- today's client-side filters run against mock data, so
  // moving them server-side before the 6A-2 backfill would change which
  // venues match.
  const filters =
    body.filters && typeof body.filters === 'object' && !Array.isArray(body.filters)
      ? (body.filters as Record<string, unknown>)
      : {};

  if (surface === 'venue' && typeof filters.venue_ref !== 'string') {
    return jsonResponse({ error: 'venue_ref_required' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const feedArgs = {
    p_user_id: userId,
    p_surface: surface,
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_filters: filters,
    p_limit: limit,
  };

  // 6B sponsored placement is OPT-IN per request, and only Discover and
  // Nearby may opt in (decision B6). Screens that render feed rows without
  // the SponsoredBadge (Activity, saved venues, the location picker) never
  // send the flag, so a sponsored row can never reach a surface that cannot
  // disclose it.
  //
  // Whether anything is actually placed is decided server-side by
  // pulze_feed_with_placements: kill switch, eligibility, budgets, B4. With
  // the switch off it returns pulze_discover_feed(...) unchanged. The client
  // cannot pass a seed, a campaign or anything else that influences placement.
  //
  // Monetization must never break discovery: if the placement RPC fails for
  // any reason, the organic RPC is served instead.
  const wantsPlacements =
    body.placements === true && (surface === 'discover' || surface === 'nearby');

  let { data, error } = wantsPlacements
    ? await admin.rpc('pulze_feed_with_placements', feedArgs)
    : await admin.rpc('pulze_discover_feed', feedArgs);

  if (error && wantsPlacements) {
    console.error('[discover-feed] placement rpc error, serving organic:', error.message);
    ({ data, error } = await admin.rpc('pulze_discover_feed', feedArgs));
  }

  if (error) {
    console.error('[discover-feed] rpc error:', error.message);
    return jsonResponse({ error: 'server_error' }, 500);
  }

  // The RPC already returns exactly the shape the client needs, including the
  // inert placement fields. No reshaping here: a second projection is a second
  // place for the contract to drift.
  return jsonResponse(data ?? { surface, venues: [], count: 0, personalized: false }, 200);
});
