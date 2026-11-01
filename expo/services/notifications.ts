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
  | 'account_reinstated';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  actorName: string | null;
  checkInId: string | null;
  data: { venue_name?: string; category?: string; until?: string };
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
  }
}

export function isAccountNotice(kind: NotificationKind): boolean {
  return kind.startsWith('moderation_') || kind.startsWith('account_');
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
