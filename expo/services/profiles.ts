// Another person's profile, as the server lets the viewer see it
// (social_profile: blocks, friendship state and grants decided in Postgres).
import { supabase } from '@/services/supabase';
import { signedUrlFor } from '@/services/storageUrls';

export type Relationship = 'self' | 'none' | 'request_sent' | 'request_received' | 'friends' | 'blocked';

export interface SocialProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  relationship: Relationship;
  friendshipId: string | null;
  isMeA: boolean;
  iGrantClose: boolean;
  theyGrantClose: boolean;
  iShareLocation: boolean;
}

/** 'unavailable' when the profile doesn't exist or its owner blocked the viewer; null on a network error. */
export async function getSocialProfile(userId: string): Promise<SocialProfile | 'unavailable' | null> {
  const { data, error } = await (supabase.rpc as any)('social_profile', { p_user_id: userId });
  if (error) return null;
  const p = data as Record<string, any>;
  if (!p?.available) return 'unavailable';
  return {
    userId: p.user_id,
    username: p.username,
    displayName: p.display_name || p.username,
    avatarUrl: p.avatar_url ? await signedUrlFor('avatars', p.avatar_url) : null,
    bio: p.bio ?? null,
    relationship: p.relationship,
    friendshipId: p.friendship_id ?? null,
    isMeA: p.is_me_a === true,
    iGrantClose: p.i_grant_close === true,
    theyGrantClose: p.they_grant_close === true,
    iShareLocation: p.i_share_location === true,
  };
}
