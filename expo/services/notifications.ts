// The in-app notification center. Every notice is written by the server
// (triggers and moderation functions); the app only reads its own, marks
// them read and dismisses them. Row-level security limits every query here to
// the signed-in user.
import { supabase } from '@/services/supabase';

export type NotificationKind =
  | 'friend_request'
  | 'friend_accepted'
  | 'inner_circle_check_in'
  | 'moderation_warning'
  | 'moderation_content_removed'
  | 'account_suspended'
  | 'account_reinstated'
  | 'appeal_upheld'
  | 'appeal_overturned';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  actorName: string | null;
  checkInId: string | null;
  data: { venue_name?: string; category?: string; until?: string; effect?: string };
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  friend_requests: boolean;
  friend_accepted: boolean;
  inner_circle_check_ins: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  spam: 'spam',
  harassment: 'harassment',
  hate: 'hate speech',
  sexual_content: 'sexual content',
  violence: 'violence or threats',
  impersonation: 'impersonation',
  underage: 'age requirements',
  other: 'community guidelines',
};

function category(n: AppNotification): string {
  return CATEGORY_LABEL[n.data.category ?? ''] ?? 'community guidelines';
}

/** What the row says. Never includes who reported or who moderated. */
export function notificationText(n: AppNotification): string {
  const who = n.actorName ?? 'Someone';
  switch (n.kind) {
    case 'friend_request': return `${who} sent you a friend request`;
    case 'friend_accepted': return `${who} accepted your friend request`;
    case 'inner_circle_check_in': return `${who} checked in${n.data.venue_name ? ` at ${n.data.venue_name}` : ''}`;
    case 'moderation_warning':
      return `Pulze recorded a warning on your account (${category(n)}). Repeated problems can lead to a suspension.`;
    case 'moderation_content_removed':
      return `Pulze removed your check-in${n.data.venue_name ? ` at ${n.data.venue_name}` : ''} (${category(n)}).`;
    case 'account_suspended': {
      const until = n.data.until ? new Date(n.data.until).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
      return `Your account was suspended${until ? ` until ${until}` : ''} (${category(n)}).`;
    }
    case 'account_reinstated': return 'Your account suspension was lifted. Welcome back.';
    case 'appeal_upheld': return 'Your appeal was reviewed. The original decision stands.';
    case 'appeal_overturned':
      return n.data.effect === 'check_in_restored' ? 'Your appeal was accepted. Your check-in is visible again.'
        : n.data.effect === 'suspension_ended' ? 'Your appeal was accepted. Your suspension has ended.'
        : 'Your appeal was accepted. The warning was withdrawn.';
  }
}

/** Notices about a decision that can be appealed (submit_appeal decides if it still can). */
export function isAppealable(kind: NotificationKind): boolean {
  return kind === 'moderation_warning' || kind === 'moderation_content_removed' || kind === 'account_suspended';
}

const APPEAL_ERRORS: Record<string, string> = {
  appeal_already_submitted: 'You already appealed this decision. You will be notified of the outcome.',
  appeal_window_closed: 'Appeals can be sent within 30 days of a decision; this one is older.',
  appeal_not_available: 'This decision can no longer be appealed.',
  appeal_message_too_short: 'Tell us a little more (at least 10 characters).',
  appeal_message_too_long: 'Keep it under 1000 characters.',
};

export async function submitAppeal(notificationId: string, message: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await (supabase.rpc as any)('submit_appeal', { p_notification_id: notificationId, p_message: message.trim() });
  if (!error) return { ok: true };
  const code = Object.keys(APPEAL_ERRORS).find((k) => (error.message ?? '').includes(k));
  return { ok: false, error: code ? APPEAL_ERRORS[code] : 'Something went wrong. Check your connection and try again.' };
}

export function isAccountNotice(kind: NotificationKind): boolean {
  return kind.startsWith('moderation_') || kind.startsWith('account_') || kind.startsWith('appeal_');
}

/** null = could not load (offline / server error), not "no notifications". */
export async function listNotifications(limit = 50): Promise<AppNotification[] | null> {
  const { data, error } = await (supabase.from('notifications' as any) as any)
    .select('id, kind, actor_id, check_in_id, data, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return null;
  const rows = (data ?? []) as any[];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, username, display_name').in('id', actorIds);
    for (const p of (profiles ?? []) as any[]) names.set(p.id, p.display_name || p.username);
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    actorId: r.actor_id,
    actorName: r.actor_id ? names.get(r.actor_id) ?? null : null,
    checkInId: r.check_in_id,
    data: r.data ?? {},
    createdAt: r.created_at,
    read: r.read_at !== null,
  }));
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await (supabase.from('notifications' as any) as any)
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return error ? 0 : count ?? 0;
}

/** Marks the given notices (or, with none, all of mine) read. */
export async function markNotificationsRead(ids?: string[]): Promise<boolean> {
  const { error } = await (supabase.rpc as any)('mark_notifications_read', { p_ids: ids && ids.length ? ids : null });
  return !error;
}

export async function dismissNotification(id: string): Promise<boolean> {
  const { error } = await (supabase.from('notifications' as any) as any).delete().eq('id', id);
  return !error;
}

const DEFAULT_PREFS: NotificationPreferences = { friend_requests: true, friend_accepted: true, inner_circle_check_ins: true };

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await (supabase.from('notification_preferences' as any) as any)
    .select('friend_requests, friend_accepted, inner_circle_check_ins')
    .maybeSingle();
  return { ...DEFAULT_PREFS, ...(data ?? {}) };
}

export async function setNotificationPreference(userId: string, key: keyof NotificationPreferences, value: boolean): Promise<boolean> {
  // Update first; only a user with no row yet inserts one. (An upsert would
  // also try to update user_id, which is deliberately not writable.)
  const table = () => supabase.from('notification_preferences' as any) as any;
  const { data, error } = await table().update({ [key]: value }).eq('user_id', userId).select('user_id');
  if (error) return false;
  if ((data ?? []).length > 0) return true;
  const { error: insertError } = await table().insert({ user_id: userId, [key]: value });
  return !insertError;
}
