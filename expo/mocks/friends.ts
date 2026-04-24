export type FriendTier = 'public' | 'friends' | 'inner_circle';

export interface TierInfo {
  id: FriendTier;
  label: string;
  description: string;
  color: string;
  permissions: string[];
}

export interface Friend {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  tier: FriendTier;
  mutualFriends: number;
  lastActive: string;
}

export interface FriendRequest {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  mutualFriends: number;
  requestedAt: string;
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

export const mockFriends: Friend[] = [
  {
    id: 'f1',
    name: 'Mia Chen',
    handle: 'mia.chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    tier: 'inner_circle',
    mutualFriends: 12,
    lastActive: '2m ago',
  },
  {
    id: 'f2',
    name: 'Dex Monroe',
    handle: 'dex.monroe',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    tier: 'friends',
    mutualFriends: 8,
    lastActive: '15m ago',
  },
  {
    id: 'f3',
    name: 'Lena Park',
    handle: 'lena.walks',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    tier: 'friends',
    mutualFriends: 5,
    lastActive: '1h ago',
  },
  {
    id: 'f4',
    name: 'Kai Rivera',
    handle: 'kai.explore',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    tier: 'friends',
    mutualFriends: 14,
    lastActive: '5m ago',
  },
  {
    id: 'f5',
    name: 'Sofia Laurent',
    handle: 'sofia.night',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    tier: 'inner_circle',
    mutualFriends: 18,
    lastActive: 'now',
  },
  {
    id: 'f6',
    name: 'Marcus Webb',
    handle: 'marc.chill',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    tier: 'public',
    mutualFriends: 2,
    lastActive: '3h ago',
  },
  {
    id: 'f7',
    name: 'Nia Thompson',
    handle: 'nia.rooftop',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face',
    tier: 'friends',
    mutualFriends: 6,
    lastActive: '30m ago',
  },
  {
    id: 'f8',
    name: 'Tyler Okafor',
    handle: 'ty.beats',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    tier: 'friends',
    mutualFriends: 3,
    lastActive: '45m ago',
  },
];

export const mockFriendRequests: FriendRequest[] = [
  {
    id: 'r1',
    name: 'Ava Kim',
    handle: 'ava.drift',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    mutualFriends: 4,
    requestedAt: '2h ago',
  },
  {
    id: 'r2',
    name: 'Jordan Blake',
    handle: 'jb.night',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=face',
    mutualFriends: 7,
    requestedAt: '5h ago',
  },
];

export function getTierInfo(tier: FriendTier): TierInfo {
  return tierDefinitions.find((t) => t.id === tier) ?? tierDefinitions[0];
}
