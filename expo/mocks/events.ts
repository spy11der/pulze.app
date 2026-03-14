export interface TicketTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  perks: string[];
  available: number;
  total: number;
  soldOut: boolean;
  tag?: string;
}

export interface EventGuest {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface FriendAttending {
  id: string;
  name: string;
  avatar: string;
}

export interface PulzeEvent {
  id: string;
  title: string;
  tagline: string;
  heroImage: string;
  date: string;
  time: string;
  doorsOpen: string;
  venueName: string;
  venueAddress: string;
  venueLatitude: number;
  venueLongitude: number;
  distanceFromUser: string;
  vibeScore: number;
  vibeLabel: string;
  energyType: 'quiet' | 'moderate' | 'pulze';
  interestedCount: number;
  attendingCount: number;
  hostName: string;
  hostAvatar: string;
  hostVerified: boolean;
  description: string;
  whatToExpect: string[];
  bestTimeToArrive: string;
  currentVibeAround: string;
  ticketTiers: TicketTier[];
  lineup: EventGuest[];
  friendsGoing: FriendAttending[];
  serviceFeePercent: number;
  tags: string[];
}

export const sampleEvent: PulzeEvent = {
  id: 'evt-001',
  title: 'Neon Drift: Rooftop After Dark',
  tagline: 'Where the city skyline meets deep house and craft cocktails.',
  heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
  date: 'Sat, Mar 22',
  time: '9:00 PM – 2:00 AM',
  doorsOpen: '8:30 PM',
  venueName: 'Mica Rooftop',
  venueAddress: '47 Warehouse Blvd, Lower East Side',
  venueLatitude: 40.7229,
  venueLongitude: -73.9986,
  distanceFromUser: '12 min away',
  vibeScore: 94,
  vibeLabel: 'Electric',
  energyType: 'pulze',
  interestedCount: 847,
  attendingCount: 312,
  hostName: 'Pulze Collective',
  hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  hostVerified: true,
  description: 'Neon Drift is an immersive rooftop experience blending deep house, ambient visuals, and curated cocktails under the open sky. Expect panoramic city views, LED art installations, and a crowd that knows how to move. This is not your average rooftop night — it is a sensory experience designed for people who live for the energy.',
  whatToExpect: [
    'Live DJ sets from sunset to close',
    'LED art installations across the rooftop',
    'Craft cocktail bar with exclusive event menu',
    'Panoramic skyline views',
    'Surprise guest performance at midnight',
    'Photo lounge with neon backdrop',
  ],
  bestTimeToArrive: '9:15 – 9:45 PM for the best energy-to-crowd ratio',
  currentVibeAround: 'The block is already buzzing. Two nearby bars are at capacity and foot traffic is picking up fast.',
  ticketTiers: [
    {
      id: 'tier-early',
      name: 'Early Bird',
      price: 25,
      originalPrice: 45,
      perks: ['General entry', 'Access to main floor', '1 welcome drink'],
      available: 8,
      total: 100,
      soldOut: false,
      tag: 'Best Value',
    },
    {
      id: 'tier-ga',
      name: 'General Admission',
      price: 45,
      perks: ['General entry', 'Access to all floors', '1 welcome drink'],
      available: 156,
      total: 400,
      soldOut: false,
    },
    {
      id: 'tier-vip',
      name: 'VIP',
      price: 120,
      perks: ['Priority entry (skip the line)', 'Rooftop lounge access', 'Open bar until 11 PM', 'Dedicated seating area', 'Meet & greet with DJs'],
      available: 22,
      total: 60,
      soldOut: false,
      tag: 'Most Popular',
    },
    {
      id: 'tier-last',
      name: 'Last Call',
      price: 65,
      perks: ['Late entry after 11 PM', 'Access to main floor', '2 drink tokens'],
      available: 0,
      total: 50,
      soldOut: true,
    },
  ],
  lineup: [
    {
      id: 'g1',
      name: 'DJ Sable',
      role: 'Headliner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    },
    {
      id: 'g2',
      name: 'Mira Volta',
      role: 'Opening Set',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    },
    {
      id: 'g3',
      name: 'KVSH',
      role: 'Surprise Guest',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    },
  ],
  friendsGoing: [
    { id: 'f1', name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    { id: 'f2', name: 'Sam', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
    { id: 'f3', name: 'Kai', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
    { id: 'f4', name: 'Priya', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
    { id: 'f5', name: 'Jordan', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face' },
  ],
  serviceFeePercent: 12,
  tags: ['Rooftop', 'Deep House', 'Cocktails', 'Live DJ', 'Night Life'],
};
