export type FriendTier = 'public' | 'friends' | 'inner_circle';

// The `permissions` string arrays that previously lived on each tier
// described features Pulze does not ship (live location sharing,
// saved-spots visibility, "Can see private check-ins" outside the
// close-friend RLS gate). They were never rendered — only `color`,
// `label`, and `description` are read by the UI — but keeping the
// copy in the bundle risked a future PR surfacing it accidentally.
export interface TierInfo {
  id: FriendTier;
  label: string;
  description: string;
  color: string;
}

export interface FriendCheckInFeedItem {
  id: string;
  friendName: string;
  friendHandle: string;
  friendAvatar: string;
  friendId: string;
  venueName: string;
  venueId: string;
  neighborhood: string;
  photoUri: string;
  timeAgo: string;
  caption?: string;
}

export const tierDefinitions: TierInfo[] = [
  {
    id: 'public',
    label: 'Public',
    description: 'Basic visibility only',
    color: '#5B8792',
  },
  {
    id: 'friends',
    label: 'Friends',
    description: 'General vibe access',
    color: '#35D4CF',
  },
  {
    id: 'inner_circle',
    label: 'Inner Circle',
    description: 'Full visibility',
    color: '#2BBFBA',
  },
];

export function getTierInfo(tier: FriendTier): TierInfo {
  return tierDefinitions.find((t) => t.id === tier) ?? tierDefinitions[0];
}
