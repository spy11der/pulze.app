// Blocking, reporting and deleting your own check-ins. Every rule is enforced
// by the backend (user_blocks policies + triggers, report_content(),
// delete_my_check_in()); this file only calls those and turns their error
// codes into sentences.
import { supabase } from '@/services/supabase';

export interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
  blockedAt: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual_content'
  | 'violence'
  | 'impersonation'
  | 'underage'
  | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam or scam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'sexual_content', label: 'Sexual content' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'impersonation', label: 'Pretending to be someone else' },
  { id: 'underage', label: 'May be under 21' },
  { id: 'other', label: 'Something else' },
];

export const REPORT_DETAILS_MAX = 1000;

type Result = { ok: true } | { ok: false; error: string };

function messageFor(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? '';
  if (/report_limit_reached/.test(m)) return "You've sent a lot of reports today. Try again tomorrow.";
  if (/cannot_report_yourself/.test(m)) return "You can't report yourself.";
  if (/report_target_not_found/.test(m)) return 'That content is no longer available.';
  if (/report_details_too_long/.test(m)) return `Keep the details under ${REPORT_DETAILS_MAX} characters.`;
  if (/check_in_not_found/.test(m)) return 'That check-in was already deleted.';
  if (/user_blocks_not_self/.test(m)) return "You can't block yourself.";
  return 'Something went wrong. Check your connection and try again.';
}

/** Blocks someone. Ends any friendship and hides each person's check-ins from the other. */
export async function blockUser(myId: string, otherId: string): Promise<Result> {
  const { error } = await (supabase.from('user_blocks' as any) as any).insert({ blocker_id: myId, blocked_id: otherId });
  // Already blocked is success from the user's point of view.
  if (error && error.code !== '23505') return { ok: false, error: messageFor(error) };
  return { ok: true };
}

export async function unblockUser(otherId: string): Promise<Result> {
  const { error } = await (supabase.from('user_blocks' as any) as any).delete().eq('blocked_id', otherId);
  return error ? { ok: false, error: messageFor(error) } : { ok: true };
}

/** Only the people I blocked: nobody can see who blocked them. */
export async function listBlockedUsers(): Promise<BlockedUser[] | null> {
  const { data, error } = await (supabase.from('user_blocks' as any) as any).select('blocked_id, created_at');
  if (error) return null;
  const rows = (data ?? []) as { blocked_id: string; created_at: string }[];
  if (rows.length === 0) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', rows.map((r) => r.blocked_id));
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.blocked_id);
    return {
      userId: r.blocked_id,
      username: p?.username ?? 'deleted account',
      displayName: p?.display_name ?? p?.username ?? 'Deleted account',
      blockedAt: r.created_at,
    };
  });
}

/**
 * Reports a profile or a check-in. Reporting the same thing again while the
 * first report is open returns success without creating a duplicate.
 */
export async function reportContent(
  kind: 'user' | 'check_in',
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<Result> {
  const { error } = await (supabase.rpc as any)('report_content', {
    p_target_kind: kind,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details.trim() || null,
  });
  return error ? { ok: false, error: messageFor(error) } : { ok: true };
}

/**
 * Deletes one of my check-ins for everyone, then its photo file. The server
 * refuses other people's check-ins and returns the photo path only for mine;
 * Storage policies only let me delete files in my own folder.
 */
export async function deleteMyCheckIn(checkInId: string): Promise<Result> {
  const { data: photoPath, error } = await (supabase.rpc as any)('delete_my_check_in', { p_check_in_id: checkInId });
  if (error) return { ok: false, error: messageFor(error) };
  if (typeof photoPath === 'string' && photoPath.length > 0) {
    const { error: removeError } = await supabase.storage.from('check-in-photos').remove([photoPath]);
    // The check-in is already gone for everyone; a leftover file is private
    // (only I can read my folder) and is removed with my account.
    if (removeError) console.log('[Safety] Photo file not removed:', removeError.message);
  }
  return { ok: true };
}

export type VerificationOutcome = 'verified' | 'too_far' | 'inaccurate' | 'stale' | 'suspect' | 'no_location';

/** The verification outcome of one of MY check-ins (others' are not readable). */
export async function getMyCheckInVerification(checkInId: string): Promise<VerificationOutcome | null> {
  const { data } = await (supabase.from('check_in_verifications' as any) as any)
    .select('outcome')
    .eq('check_in_id', checkInId)
    .maybeSingle();
  return (data?.outcome as VerificationOutcome | undefined) ?? null;
}

export function verificationLabel(outcome: VerificationOutcome | null): string {
  switch (outcome) {
    case 'verified': return 'Location verified at check-in';
    case 'too_far': return 'Not verified: you seemed too far from the venue';
    case 'inaccurate': return 'Not verified: location was too imprecise';
    case 'stale': return 'Not verified: location or upload was too late';
    case 'suspect': return 'Not verified';
    case 'no_location': return 'Not verified: location was off';
    default: return 'Not verified';
  }
}
