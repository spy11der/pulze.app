// login-with-username
//
// Server-side username-to-email resolution + password sign-in. The
// direct SECURITY DEFINER RPC `public.resolve_login_email(text)` had
// been EXECUTE-granted to `anon`, which let any holder of the anon
// key enumerate `username -> email` without needing to authenticate.
// The same RPC is still used, but it is now restricted to
// `service_role` and only reachable via this edge function, which
// never returns the resolved email to the client — only the session
// tokens that would have resulted from a normal password sign-in.
//
// Rate limiting: we count attempts in `public.auth_rate_limits` via
// `check_and_increment_login_attempts()`. Two buckets are checked in
// series: the caller IP (broad, protects against a single actor
// probing many usernames) and the username (narrow, protects a
// specific account from distributed guessing).
//
// Failure modes intentionally collapse to a single generic message
// ("Invalid username or password"). We never disclose whether the
// username exists, and passwords are never logged.
//
// verify_jwt is disabled on this function on purpose: the entire
// point is to sign in an unauthenticated caller. Custom auth logic
// is implemented inline via the anon-client `signInWithPassword`
// path below, which goes through Supabase Auth's normal password
// verification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Bucket ceilings — chosen to feel invisible to legitimate humans
// (a person mistypes their password a few times) but expensive to a
// scripted enumerator. Windows are short so a temporary block
// self-heals quickly.
const IP_MAX = 20;              // per-IP attempts per window
const IP_WINDOW_SECONDS = 60;
const USER_MAX = 10;            // per-username attempts per window
const USER_WINDOW_SECONDS = 60;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Deny caching so a proxy can't ever memoize a login response.
      'cache-control': 'no-store',
    },
  });
}

function genericFailure(): Response {
  // Do NOT differentiate between "unknown username", "wrong password",
  // or "malformed input" — the whole point of this function is to
  // remove the enumeration oracle.
  return jsonResponse({ error: 'Invalid username or password' }, 401);
}

function rateLimited(): Response {
  return jsonResponse(
    { error: 'Too many login attempts. Please wait a moment and try again.' },
    429,
  );
}

function extractIp(req: Request): string {
  // Supabase runs behind Cloudflare — CF-Connecting-IP is the caller.
  // Fall back to the first X-Forwarded-For hop and then to a fixed
  // string so the rate-limit bucket is never keyed on '' (which would
  // collapse every unknown-IP caller into one shared limiter row).
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    // Not the caller's fault; return a generic 500 without spilling
    // which env var is missing.
    console.error('[login-with-username] missing env');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return genericFailure();
  }

  const rawUsername = (body as Record<string, unknown>)?.username;
  const rawPassword = (body as Record<string, unknown>)?.password;

  if (typeof rawUsername !== 'string' || typeof rawPassword !== 'string') {
    return genericFailure();
  }

  const username = rawUsername.trim();
  const password = rawPassword; // never logged, never trimmed (leading/trailing chars are part of the secret)

  if (username.length === 0 || password.length === 0) {
    return genericFailure();
  }

  // Guard against absurdly long inputs that could be used to spam
  // the DB or to blow through a password hash comparator.
  if (username.length > 128 || password.length > 256) {
    return genericFailure();
  }

  // If someone passes an @-containing string, refuse — email login
  // must go directly through Supabase Auth from the client. This
  // function's contract is username-only.
  if (username.includes('@')) {
    return genericFailure();
  }

  const ip = extractIp(req);

  // Two clients: admin (service_role) for the SECURITY DEFINER RPCs
  // and the resolver; anon for the actual sign-in so we never issue
  // a service-role token to the caller.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limits — IP first (broadest), then per-username.
  const { data: ipOk, error: ipErr } = await admin.rpc(
    'check_and_increment_login_attempts',
    { p_bucket: `ip:${ip}`, p_max: IP_MAX, p_window_seconds: IP_WINDOW_SECONDS },
  );
  if (ipErr) {
    console.error('[login-with-username] rate-limit RPC (ip) failed:', ipErr.message);
    return jsonResponse({ error: 'Server error' }, 500);
  }
  if (ipOk === false) return rateLimited();

  const { data: userOk, error: userErr } = await admin.rpc(
    'check_and_increment_login_attempts',
    {
      p_bucket: `usr:${username.toLowerCase()}`,
      p_max: USER_MAX,
      p_window_seconds: USER_WINDOW_SECONDS,
    },
  );
  if (userErr) {
    console.error('[login-with-username] rate-limit RPC (usr) failed:', userErr.message);
    return jsonResponse({ error: 'Server error' }, 500);
  }
  if (userOk === false) return rateLimited();

  // Server-side resolution. resolve_login_email is now revoked from
  // anon/authenticated (see migration) — only service_role can call
  // it, and this response never returns the email to the caller.
  const { data: resolvedEmail, error: resolveErr } = await admin.rpc(
    'resolve_login_email',
    { p_username: username },
  );
  if (resolveErr) {
    console.error('[login-with-username] resolve error:', resolveErr.message);
    return genericFailure();
  }
  if (typeof resolvedEmail !== 'string' || resolvedEmail.length === 0) {
    // Unknown username — collapse to the same failure shape as
    // "wrong password" so callers can't distinguish.
    return genericFailure();
  }

  // Real password verification via Supabase Auth. Using the anon
  // client so the returned tokens are ordinary user session tokens,
  // not anything issued under service_role.
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });

  if (signInErr || !signInData?.session) {
    // signInErr.message can indicate 'Invalid login credentials' or
    // similar — deliberately do not forward it to the caller.
    return genericFailure();
  }

  const session = signInData.session;

  // Return ONLY what the mobile client needs to install the session
  // via supabase.auth.setSession(). No email, no user metadata, no
  // provider tokens.
  return jsonResponse(
    {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
    },
    200,
  );
});
