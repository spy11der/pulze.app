import { supabase } from '@/services/supabase';

export type FriendTier = 'friends' | 'inner_circle';

export interface RealFriend {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tier: FriendTier; // what THEY grant ME (drives what I can see of theirs)
  iGrantClose: boolean; // what I grant THEM (my own outbound setting)
  isMeA: boolean; // whether I'm user_id_a in the underlying row (needed for setCloseFriend)
}

export interface RealFriendRequest {
  friendshipId: string;
  fromUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
}

export async function getFriendsAndRequests(
  currentUserId: string,
): Promise<{ friends: RealFriend[]; requests: RealFriendRequest[] }> {
  const { data: rows, error } = await supabase
    .from('user_friendships')
    .select('*')
    .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`);

  if (error || !rows) return { friends: [], requests: [] };

  const otherIds = (rows as any[]).map((f) => (f.user_id_a === currentUserId ? f.user_id_b : f.user_id_a));
  if (otherIds.length === 0) return { friends: [], requests: [] };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', otherIds);
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const friends: RealFriend[] = [];
  const requests: RealFriendRequest[] = [];

  for (const f of rows as any[]) {
    const isMeA = f.user_id_a === currentUserId;
    const otherId = isMeA ? f.user_id_b : f.user_id_a;
    const profile = profileById.get(otherId);
    if (!profile) continue;

    if (f.status === 'pending') {
      if (f.user_id_a !== currentUserId) {
        requests.push({
          friendshipId: f.id,
          fromUserId: otherId,
          username: profile.username,
          displayName: profile.display_name ?? profile.username,
          avatarUrl: profile.avatar_url,
          requestedAt: f.created_at,
        });
      }
      continue;
    }

    if (f.status === 'accepted') {
      const grantsMeClose = isMeA ? f.is_close_friend_b_to_a : f.is_close_friend_a_to_b;
      const iGrantClose = isMeA ? f.is_close_friend_a_to_b : f.is_close_friend_b_to_a;
      friends.push({
        friendshipId: f.id,
        userId: otherId,
        username: profile.username,
        displayName: profile.display_name ?? profile.username,
        avatarUrl: profile.avatar_url,
        tier: grantsMeClose ? 'inner_circle' : 'friends',
        iGrantClose,
        isMeA,
      });
    }
  }

  return { friends, requests };
}

export async function findUserByUsername(username: string): Promise<{ id: string; displayName: string } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .ilike('username', username.trim())
    .maybeSingle();
  if (!data) return null;
  return { id: (data as any).id, displayName: (data as any).display_name ?? (data as any).username };
}

export async function sendFriendRequest(currentUserId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
  if (currentUserId === targetUserId) return { success: false, error: "You can't friend yourself" };
  const { error } = await supabase.from('user_friendships').insert({
    user_id_a: currentUserId,
    user_id_b: targetUserId,
    status: 'pending',
  } as any);
  if (error) {
    return { success: false, error: error.code === '23505' ? 'Already friends or request pending' : error.message };
  }
  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  // `user_friendships` isn't in the generated Supabase types — the builder
  // resolves to `never`, so cast the client call.
  const { error } = await (supabase.from('user_friendships') as any).update({ status: 'accepted' }).eq('id', friendshipId);
  return !error;
}

export async function declineFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase.from('user_friendships').delete().eq('id', friendshipId);
  return !error;
}

export async function unfriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase.from('user_friendships').delete().eq('id', friendshipId);
  return !error;
}

// Sets MY OWN outbound close-friend grant toward this friend. The backend
// trigger (enforce_friendship_column_privacy) rejects any attempt to touch
// the other person's field, so `isMeA` must be accurate — use the value
// already returned on the RealFriend object, don't recompute it.
export async function setCloseFriend(friendshipId: string, isMeA: boolean, value: boolean): Promise<boolean> {
  const field = isMeA ? 'is_close_friend_a_to_b' : 'is_close_friend_b_to_a';
  const { error } = await (supabase.from('user_friendships') as any).update({ [field]: value }).eq('id', friendshipId);
  return !error;
}
