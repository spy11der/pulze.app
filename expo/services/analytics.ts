// First-party behavioral analytics — client half.
//
// All events flow through the `record_app_event` SECURITY DEFINER
// RPC in Supabase. The server forces user_id = auth.uid(), enforces
// the three consent boundaries per purpose, and strips a fixed list
// of forbidden property keys. Nothing here trusts the client to
// tell the truth about purpose or ownership; the client's only job
// is to describe what happened.
//
// Design constraints:
//   * Fire-and-forget. Every emitter is `void`, never awaited from
//     UI code. Product interactions must never wait on analytics.
//   * Failures never surface to the user.
//   * The offline queue is bounded and keyed per authenticated
//     user id so a second account on the same device cannot ever
//     inherit or replay the previous account's events.
//   * No third-party analytics SDK. Supabase is the system of
//     record; that stays true.
//
// Sensitive payload rule: never put passwords, tokens, emails,
// phone numbers, DOB, race/ethnicity, gender, raw coordinates,
// captions, or photo blobs into event properties. The RPC scrubs
// a hardcoded key list as belt-and-suspenders, but the primary
// discipline is the caller not sending them.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

// The full future taxonomy (mirrored by app_events_event_type_valid
// on the server). Only a small subset is instrumented in Batch 4A;
// see BATCH4A_INSTRUMENTED below.
export type EventType =
  | 'venue_view'
  | 'venue_dwell'
  | 'venue_save'
  | 'venue_unsave'
  | 'search_query'
  | 'search_result_clicked'
  | 'category_view'
  | 'neighborhood_view'
  | 'checkin'
  | 'directions_open'
  | 'share'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_removed'
  | 'close_friend_toggled'
  | 'notification_shown'
  | 'notification_action'
  | 'recommendation_impression'
  | 'recommendation_click';

// Subject types are also constrained server-side. NULL is legal.
export type SubjectType =
  | 'venue'
  | 'category'
  | 'neighborhood'
  | 'user'
  | 'notification'
  | 'recommendation'
  | 'search';

export type Purpose = 'operational' | 'personalization' | 'demographic_aggregate';

export interface EventPayload {
  eventType: EventType;
  subjectType?: SubjectType;
  subjectId?: string;
  properties?: Record<string, unknown>;
  // Optional client-side timestamp. server_ts is always the
  // authoritative time and is set by the DB regardless.
  clientTs?: string;
}

// Sensitive keys the client also filters out before sending. Same
// list as the server-side strip; keeping both keeps the invariant
// clear when reading either side. Kept lowercase; comparison is
// case-insensitive.
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  'password', 'token', 'auth_token', 'access_token', 'refresh_token', 'jwt', 'apikey', 'api_key',
  'email', 'phone', 'phone_number',
  'date_of_birth', 'dob', 'birthday',
  'race', 'ethnicity', 'race_ethnicity', 'gender', 'gender_identity',
  'lat', 'lng', 'latitude', 'longitude', 'coordinates', 'coords', 'location',
  'caption', 'photo', 'photo_url', 'photo_uri', 'photo_blob', 'image', 'image_url',
]);

function scrubProperties(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(input)) {
    const key = rawKey.toLowerCase();
    if (FORBIDDEN_KEYS.has(key)) continue;
    // Nested objects/arrays are passed through as-is. Callers are
    // responsible for not smuggling sensitive material into nested
    // structures; the server enforces size caps.
    out[rawKey] = value;
  }
  return out;
}

// -----------------------------
// Offline queue.
// -----------------------------
//
// Keyed by user id so a device that has multiple accounts (over
// time) never replays A's events under B's session. The key is
// exported so services/localCleanup.ts can wipe it on logout
// without duplicating the constant.
const QUEUE_KEY_PREFIX = 'pulze_analytics_queue_v1:';
const MAX_QUEUE_SIZE = 500;

export function analyticsQueueKeyFor(userId: string): string {
  return QUEUE_KEY_PREFIX + userId;
}

interface QueuedEvent {
  // Snapshot of the auth user id at emit time. drainQueue() only
  // fires events where this matches the current session — belt
  // and suspenders on top of the per-user AsyncStorage key.
  userId: string;
  purpose: Purpose;
  payload: EventPayload;
  queuedAt: number;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function enqueue(userId: string, purpose: Purpose, payload: EventPayload): Promise<void> {
  try {
    const key = analyticsQueueKeyFor(userId);
    const raw = await AsyncStorage.getItem(key);
    const queue: QueuedEvent[] = raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
    queue.push({ userId, purpose, payload, queuedAt: Date.now() });
    // Drop the oldest events first when we hit the cap. Under
    // sustained offline load this loses history, but it never blows
    // out AsyncStorage.
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    }
    await AsyncStorage.setItem(key, JSON.stringify(queue));
  } catch (e) {
    console.log('[Analytics] enqueue failed:', e);
  }
}

async function directSend(purpose: Purpose, payload: EventPayload): Promise<'ok' | 'server_error' | 'network_error'> {
  const { error } = await (supabase.rpc as any)('record_app_event', {
    p_purpose: purpose,
    p_event_type: payload.eventType,
    p_subject_type: payload.subjectType ?? null,
    p_subject_id: payload.subjectId ?? null,
    p_properties: scrubProperties(payload.properties),
    p_client_ts: payload.clientTs ?? new Date().toISOString(),
  });
  if (!error) return 'ok';
  // PostgREST-shaped errors carry a `code` (Postgres SQLSTATE). No
  // code + a plain message tends to be a fetch/network failure.
  const hasCode = typeof (error as { code?: string }).code === 'string';
  return hasCode ? 'server_error' : 'network_error';
}

async function emit(purpose: Purpose, payload: EventPayload): Promise<void> {
  const uid = await currentUserId();
  if (!uid) {
    // Not signed in. Don't attempt or queue — nothing to attribute
    // the event to. Batch 4A instrumentation only fires from
    // post-onboarding screens anyway.
    return;
  }
  try {
    const result = await directSend(purpose, payload);
    if (result === 'network_error') {
      await enqueue(uid, purpose, payload);
    }
    // 'server_error' (invalid purpose, invalid event type, permission
    // denied, etc.) is a permanent failure — never queue those.
    // Consent-refused paths return { ok: true } with 0, not an error.
  } catch (e) {
    console.log('[Analytics] emit crashed:', e);
    // Any unexpected throw: also queue so we can drain later.
    try { await enqueue(uid, purpose, payload); } catch {}
  }
}

// Drain the queue for the current session. Best-effort; anything
// still failing after a full pass stays queued for the next drain.
// Called once from the post-onboarding startup effect in
// app/_layout.tsx.
export async function drainAnalyticsQueue(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const key = analyticsQueueKeyFor(uid);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const queue: QueuedEvent[] = JSON.parse(raw) as QueuedEvent[];
    if (queue.length === 0) return;

    const remaining: QueuedEvent[] = [];
    for (const evt of queue) {
      // Skip anything not for the current user. This should already
      // be empty because we key AsyncStorage by user id, but the
      // guard makes cross-account replay structurally impossible.
      if (evt.userId !== uid) continue;
      const result = await directSend(evt.purpose, evt.payload);
      if (result === 'network_error') remaining.push(evt);
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.log('[Analytics] drain failed:', e);
  }
}

// -----------------------------
// The three deliberate emitters.
// -----------------------------
//
// Callers use the purpose-tagged helpers rather than passing a
// purpose string. That makes it impossible for a screen to
// accidentally emit under the wrong purpose and much easier to
// grep the codebase for personalization vs demographic call sites.

export const analytics = {
  operational(payload: EventPayload): void {
    void emit('operational', payload);
  },
  personalization(payload: EventPayload): void {
    void emit('personalization', payload);
  },
  demographicAggregate(payload: EventPayload): void {
    void emit('demographic_aggregate', payload);
  },
};

// -----------------------------
// Batch 4A instrumented events.
// -----------------------------
//
// The server-side event_type enum lists the whole future taxonomy;
// this constant documents which subset is actually being emitted
// today so a reviewer can grep it against the codebase.
export const BATCH4A_INSTRUMENTED: readonly EventType[] = [
  'venue_view',
  'venue_save',
  'venue_unsave',
  'directions_open',
  'search_query',
  'search_result_clicked',
] as const;
