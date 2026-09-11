// Storage URL helper.
//
// The `avatars` and `check-in-photos` buckets are private, so raw
// `/storage/v1/object/public/…` URLs return 403. Every image the app
// wants to render has to be resolved to a short-lived signed URL first.
// `.createSignedUrl(...)` runs under the caller's session and applies
// storage.objects RLS at signing time, so an authenticated user can only
// sign paths they're allowed to SELECT.
//
// Values stored in the DB (check_ins.photo_url, profiles.avatar_url,
// auth.users raw_user_meta_data->avatar_url) are the raw object path
// going forward. `extractStoragePath` also accepts legacy
// `/object/public/…` and `/object/sign/…` URLs so any un-migrated row
// still resolves correctly.

import { supabase } from '@/services/supabase';

// 24h is long enough that a screen full of feed images doesn't need to
// re-sign every scroll, short enough that a leaked URL doesn't grant
// permanent access. The in-memory cache below halves the effective
// request count on repeat renders.
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

const STORAGE_URL_RE =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Given whatever's in the DB (raw path or legacy Storage URL), return
 * the raw object path within `bucket`. Returns null if the value is
 * empty or clearly points at a different bucket.
 */
export function extractStoragePath(
  bucket: string,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(STORAGE_URL_RE);
  if (match) {
    const [, matchedBucket, encodedPath] = match;
    if (matchedBucket !== bucket) return null;
    try { return decodeURIComponent(encodedPath); } catch { return encodedPath; }
  }

  // Not a Storage URL — assume it's already a raw path.
  return trimmed;
}

/**
 * Resolves a stored value (path or legacy URL) into a signed URL the
 * caller's session is authorized to fetch. Cached in-memory until the
 * URL is within 60s of expiry.
 */
export async function signedUrlFor(
  bucket: string,
  value: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const path = extractStoragePath(bucket, value);
  if (!path) return null;

  const cacheKey = `${bucket}:${path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    console.log('[Storage] createSignedUrl failed:', bucket, path, error?.message);
    return null;
  }

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: now + ttlSeconds * 1000,
  });
  return data.signedUrl;
}
