// personalized-venues
//
// Authenticated delivery of the Batch-4C personalized ranking.
//
// Flow:
//   1. Supabase edge gateway verifies the caller's JWT (verify_jwt=true
//      on this function). Missing/expired -> 401 before we ever run.
//   2. Inside the function, re-derive the user id by calling
//      supabase.auth.getUser() with the caller's Authorization
//      header. Never trust a client-supplied user_id.
//   3. Invoke rank_personalized_venues_for_user(auth.uid(), limit)
//      as service_role. That RPC is REVOKE'd from authenticated so
//      the mobile client cannot call it directly.
//   4. Strip the response to the minimum the app needs to blend:
//        { personalized, generated_at, rankings: [{venue_id,
//          personalization_score, primary_reason}] }
//      No raw event rows, no raw search terms, no demographics, no
//      consent timestamps, no user-id echo (the caller already knows
//      their own id), no property blobs, no negative-event history
//      details.
//
// The service_role key stays in Deno.env — never in the mobile bundle.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

// Every auth-failure exits through this so the response shape is
// identical for missing header, expired token, forged token, etc.
function unauthorized(): Response {
  return jsonResponse({ error: 'unauthorized' }, 401);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('[personalized-venues] missing env');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return unauthorized();

  // Re-derive auth.uid() by asking auth to validate the token.
  // Belt-and-suspenders on top of the gateway's verify_jwt.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData?.user?.id) return unauthorized();
  const userId = userData.user.id;

  // Parse + clamp limit. Malformed JSON collapses to the default.
  let requestedLimit: number = DEFAULT_LIMIT;
  try {
    const body = await req.json();
    const raw = (body as Record<string, unknown>)?.limit;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      requestedLimit = Math.floor(raw);
    }
  } catch {
    // No body / not JSON -> use default. Not a client-visible error.
  }
  const limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, requestedLimit));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc(
    'rank_personalized_venues_for_user',
    { p_user_id: userId, p_limit: limit },
  );

  if (error) {
    console.error('[personalized-venues] rpc error:', error.message);
    return jsonResponse({ error: 'server_error' }, 500);
  }

  // rank_personalized_venues_for_user returns jsonb. Reshape to the
  // small on-the-wire payload the mobile client needs.
  const payload = (data as Record<string, unknown>) ?? {};
  const personalized = payload.personalized === true;
  const generatedAt = payload.generated_at ?? null;

  const rawRankings = Array.isArray(payload.rankings) ? (payload.rankings as Array<Record<string, unknown>>) : [];

  const rankings = rawRankings.map((r) => {
    const components = Array.isArray(r.score_components)
      ? (r.score_components as Array<Record<string, unknown>>)
      : [];
    // primary_reason: the highest-magnitude component's reason label.
    // This is a compact debugging hint the app doesn't render today —
    // useful when the UI decides to surface a badge later. Falls back
    // to an empty string if score_components is missing.
    let primaryReason = '';
    let bestMagnitude = -Infinity;
    for (const c of components) {
      const score = Number(c?.score ?? 0);
      if (Number.isFinite(score) && Math.abs(score) > bestMagnitude) {
        bestMagnitude = Math.abs(score);
        primaryReason = typeof c.reason === 'string' ? c.reason : '';
      }
    }
    return {
      venue_id: r.venue_id ?? null,
      personalization_score: r.personalization_score ?? 0,
      primary_reason: primaryReason,
    };
  }).filter((r) => typeof r.venue_id === 'string');

  return jsonResponse({
    personalized,
    generated_at: generatedAt,
    rankings,
  }, 200);
});
