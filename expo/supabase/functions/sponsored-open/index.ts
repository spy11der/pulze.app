// sponsored-open
//
// Records that the signed-in user opened venue detail from a sponsored card:
// the CPC billable event (Phase 6B). One field comes in: the placement_id the
// feed handed out, which is a server-issued impression id.
//
// Flow, identical in shape to discover-feed:
//   1. The edge gateway verifies the JWT (verify_jwt = true, declared in
//      supabase/config.toml). Missing or expired -> 401 before this code runs.
//   2. Re-derive the user id via auth.getUser() with the caller's own
//      Authorization header. A client-supplied user id is never trusted.
//   3. Call promotion_record_sponsored_open as service_role. It derives the
//      campaign from the stored impression, checks the impression belongs to
//      this user, is unexpired and matches its campaign, and stamps the click
//      with the SERVER's time. Billing (one billable open per user + campaign
//      + venue-local day, venue-member exclusion, hard budget ceilings,
//      velocity limits, rejection log) is decided entirely in the database.
//
// NOTHING ELSE IS ACCEPTED. No campaign id, no venue id, no timestamp, no
// price and no idempotency key: the body's other fields are ignored.
//
// THE RESPONSE IS OPAQUE. Billable, non-billable, duplicate and rejected
// outcomes all return the same 200 {ok:true}. Telling a caller which of its
// taps were charged would hand a fraudster the signal it needs to tune.
// Outcomes are observable where they belong: promotion_clicks,
// promotion_click_rejections, and the portal and admin reports.
//
// The client fires this and does not wait for it. Navigation to venue detail
// never depends on it, and a failure here can only UNDER-bill.
//
// CORS: same block and rationale as discover-feed. The web build calls this
// from a browser origin, and headers go on every response, errors included.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function unauthorized(): Response {
  return jsonResponse({ error: 'unauthorized' }, 401);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('[sponsored-open] missing env');
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
    // Falls through to the placement_id check below.
  }

  const placementId = typeof body.placement_id === 'string' ? body.placement_id : '';
  if (!UUID_RE.test(placementId)) {
    return jsonResponse({ error: 'placement_id_required' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc('promotion_record_sponsored_open', {
    p_user_id: userId,
    p_impression_id: placementId,
  });

  if (error) {
    // Logged, not surfaced: the caller learns nothing it could act on.
    console.error('[sponsored-open] rpc error:', error.message);
    return jsonResponse({ ok: true }, 200);
  }

  // Server-side observability only. No identifiers, no amounts.
  const outcome = data as Record<string, unknown> | null;
  if (outcome?.rejected === true) {
    console.log('[sponsored-open] rejected:', String(outcome.reason ?? 'unknown'));
  }

  return jsonResponse({ ok: true }, 200);
});
