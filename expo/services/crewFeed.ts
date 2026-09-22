import { supabase } from '@/services/supabase';
import { signedUrlFor } from '@/services/storageUrls';
import type { FriendCheckInFeedItem } from '@/mocks/friends';

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Phase 6A-3: neighborhoods(name) is embedded directly. That became possible
// when venues.neighborhood_id got its foreign key in 6A-3 -- before that
// PostgREST could not auto-embed, and this file fell back to the MOCK
// catalogue for the neighborhood name, which was wrong for every venue where
// mock and reality disagreed (a Temple Nightclub check-in rendered "LoDo";
// the venue is in the Golden Triangle).
const CHECKIN_SELECT = 'id, user_id, venue_id, photo_url, caption, visibility, created_at, profiles(username, display_name, avatar_url), venues(name, city, neighborhoods(name))';

// Storage buckets are private — photo_url and profiles.avatar_url hold
// raw object paths (or legacy full URLs, which extractStoragePath still
// handles). Resolve both to signed URLs before handing back to the UI.
async function rowToFeedItem(row: any): Promise<FriendCheckInFeedItem> {
  const [photoUri, friendAvatar] = await Promise.all([
    row.photo_url ? signedUrlFor('check-in-photos', row.photo_url) : Promise.resolve(null),
    row.profiles?.avatar_url ? signedUrlFor('avatars', row.profiles.avatar_url) : Promise.resolve(null),
  ]);
  return {
    id: row.id,
    friendName: row.profiles?.display_name || row.profiles?.username || 'Someone',
    friendHandle: row.profiles?.username ?? '',
    friendAvatar: friendAvatar ?? '',
    friendId: row.user_id,
    venueName: row.venues?.name ?? '',
    venueId: row.venue_id,
    // Database only. City is a last resort and is not a neighborhood; an
    // absent neighborhood renders as absence rather than as "Denver".
    neighborhood: row.venues?.neighborhoods?.name ?? row.venues?.city ?? '',
    photoUri: photoUri ?? '',
    timeAgo: getTimeAgo(row.created_at),
    caption: row.caption ?? undefined,
  };
}

export async function getCrewFeed(currentUserId: string): Promise<FriendCheckInFeedItem[]> {
  const { data: friendRows } = await supabase
    .from('user_friendships')
    .select('user_id_a, user_id_b')
    .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`)
    .eq('status', 'accepted');

  const friendIds = (friendRows ?? []).map((f: any) => (f.user_id_a === currentUserId ? f.user_id_b : f.user_id_a));
  const relevantIds = [...friendIds, currentUserId];

  // RLS already enforces the exact visibility rules (public / own /
  // inner-circle-private) — no client-side re-filtering needed.
  const { data: rows, error } = await supabase
    .from('check_ins')
    .select(CHECKIN_SELECT)
    .in('user_id', relevantIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !rows) {
    console.log('[CrewFeed] Error:', error?.message);
    return [];
  }
  return Promise.all((rows as any[]).map(rowToFeedItem));
}

export async function getCheckInById(checkInId: string): Promise<FriendCheckInFeedItem | null> {
  const { data, error } = await supabase.from('check_ins').select(CHECKIN_SELECT).eq('id', checkInId).maybeSingle();
  // Log failures explicitly — a silently swallowed error here (e.g. the
  // missing profiles foreign key) renders as a blank detail screen and is
  // near-impossible to diagnose from the UI alone.
  if (error) {
    console.log('[CrewFeed] getCheckInById error:', error.message);
  }
  if (error || !data) return null;
  return rowToFeedItem(data);
}

// The authenticated user's own check-in history — no friendship lookup
// needed (RLS already lets a user see all of their own rows regardless of
// visibility), reuses the same row shape and mapping as the crew feed.
export async function getMyCheckIns(userId: string): Promise<FriendCheckInFeedItem[]> {
  const { data: rows, error } = await supabase
    .from('check_ins')
    .select(CHECKIN_SELECT)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !rows) {
    console.log('[CrewFeed] getMyCheckIns error:', error?.message);
    return [];
  }
  return Promise.all((rows as any[]).map(rowToFeedItem));
}
