export type FriendTier = 'public' | 'friends' | 'inner_circle';

export interface TierInfo {
  id: FriendTier;
  label: string;
  description: string;
  color: string;
  permissions: string[];
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
    permissions: [
      'Can see public vibe drops',
      'Cannot see precise locations',
      'Cannot see saved spots',
    ],
  },
  {
    id: 'friends',
    label: 'Friends',
    description: 'General vibe access',
    color: '#35D4CF',
    permissions: [
      'Can see general vibe activity',
      'Can see venue names',
      'Cannot see exact real-time movement',
    ],
  },

  {
    id: 'inner_circle',
    label: 'Inner Circle',
    description: 'Full visibility',
    color: '#2BBFBA',
    permissions: [
      'Full live location access',
      'Can see saved spots',
      'Can see private check-ins',
    ],
  },
];

export function getTierInfo(tier: FriendTier): TierInfo {
  return tierDefinitions.find((t) => t.id === tier) ?? tierDefinitions[0];
}
