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
  venueId: string;
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
  energyType: 'quiet' | 'moderate' | 'high';
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

import { pulzeVenues } from '@/mocks/venues';

export const venueEvents: Record<string, PulzeEvent> = {};

const eventTemplates: Array<{
  venueId: string;
  title: string;
  tagline: string;
  heroImage: string;
  date: string;
  time: string;
  doorsOpen: string;
  description: string;
  energyType: 'quiet' | 'moderate' | 'high';
  tags: string[];
  lineup: EventGuest[];
  whatToExpect: string[];
  bestTimeToArrive: string;
  currentVibeAround: string;
}> = [
  {
    venueId: 'v-001',
    title: 'Nothing More + Catch Your Breath',
    tagline: 'Hard-hitting rock with Archers and Doobie opening the night.',
    heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '5:30 PM – 11:00 PM',
    doorsOpen: '5:00 PM',
    description: 'Nothing More brings their explosive live energy to the Fillmore Auditorium with support from Catch Your Breath, Archers, and Doobie. Expect heavy riffs, massive crowd energy, and one of the best rock shows in Denver this month.',
    energyType: 'high',
    tags: ['Rock', 'Live Band', 'Headliner', 'Fillmore', 'Tonight'],
    lineup: [
      { id: 'g1', name: 'Nothing More', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face' },
      { id: 'g2', name: 'Catch Your Breath', role: 'Direct Support', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
      { id: 'g3', name: 'Archers', role: 'Opener', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
      { id: 'g4', name: 'Doobie', role: 'Opener', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'Full band live sets from 4 artists',
      'Standing room GA floor + balcony seating',
      'Full bar with craft Colorado beers on tap',
      'Merch booth with tour exclusives',
    ],
    bestTimeToArrive: '5:00 PM to catch openers — 7:00 PM if you just want the headliner',
    currentVibeAround: 'Colfax is active. Pre-show crowd building at nearby spots.',
  },
  {
    venueId: 'v-002',
    title: 'The Strumbellas: Into Dust Tour',
    tagline: 'Indie folk anthems in an iconic Denver venue.',
    heroImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '8:00 PM – 11:30 PM',
    doorsOpen: '7:00 PM',
    description: 'The Strumbellas bring their "Into Dust Tour" to the Gothic Theatre. Known for anthemic tracks like "Spirits," this will be an emotional, high-energy indie folk show in one of Denver\'s most beloved venues.',
    energyType: 'moderate',
    tags: ['Indie Folk', 'Tour', 'Gothic Theatre', 'Live Music', 'Tonight'],
    lineup: [
      { id: 'g5', name: 'The Strumbellas', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'Full band performance with new album tracks',
      'Intimate venue atmosphere with great sightlines',
      'Craft cocktail bar and local brews',
      'Post-show meet & greet possibility',
    ],
    bestTimeToArrive: '7:30 PM for good floor positioning',
    currentVibeAround: 'South Broadway is lively tonight — restaurants and bars filling up early.',
  },
  {
    venueId: 'v-003',
    title: 'The Barr Brothers: Let It Hiss Tour',
    tagline: 'Atmospheric folk-rock at the Bluebird.',
    heroImage: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '8:00 PM – 11:00 PM',
    doorsOpen: '7:00 PM',
    description: 'The Barr Brothers bring their layered, cinematic folk-rock to the Bluebird Theater on their "Let It Hiss" tour. A beautifully crafted live experience in one of Colfax\'s most iconic rooms.',
    energyType: 'moderate',
    tags: ['Folk Rock', 'Bluebird', 'Atmospheric', 'Tour', 'Tonight'],
    lineup: [
      { id: 'g6', name: 'The Barr Brothers', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'Layered instrumental performances',
      'Standing room with balcony option',
      'Full bar with local craft selections',
      'Intimate 500-cap room with perfect acoustics',
    ],
    bestTimeToArrive: '7:15 PM for balcony seats, 7:45 PM for GA floor',
    currentVibeAround: 'East Colfax is active — food trucks and pre-show crowds gathering.',
  },
  {
    venueId: 'v-007',
    title: 'Heyz Live at the Ogden',
    tagline: 'Rising star energy at Denver\'s Ogden Theatre.',
    heroImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '9:00 PM – 12:00 AM',
    doorsOpen: '8:00 PM',
    description: 'Heyz takes the stage at the Ogden Theatre for a high-energy set blending pop, electronic, and R&B. This is the breakout tour you don\'t want to miss.',
    energyType: 'high',
    tags: ['Pop', 'Electronic', 'R&B', 'Ogden', 'Tonight'],
    lineup: [
      { id: 'g7', name: 'Heyz', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'High-energy pop/electronic performance',
      'Light show and visual production',
      'Classic Ogden Theatre standing room vibes',
      'Full bar and merch available',
    ],
    bestTimeToArrive: '8:30 PM — floor fills fast for this one',
    currentVibeAround: 'Colfax has 3 shows tonight — active all the way down.',
  },
  {
    venueId: 'v-006',
    title: 'Big Something + Special Guests',
    tagline: 'Genre-bending jams at Cervantes.',
    heroImage: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '8:00 PM – 1:00 AM',
    doorsOpen: '7:00 PM',
    description: 'Big Something brings their unique fusion of rock, funk, electronic, and pop to Cervantes\' Masterpiece Ballroom. With surprise special guests, expect an extended jam session that keeps the dance floor moving all night.',
    energyType: 'high',
    tags: ['Jam Band', 'Funk', 'Electronic', 'Cervantes', 'Tonight'],
    lineup: [
      { id: 'g8', name: 'Big Something', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=100&h=100&fit=crop&crop=face' },
      { id: 'g9', name: 'Special Guests TBA', role: 'Support', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'Extended jam sets with genre-blending energy',
      'Surprise guest sit-ins',
      'Denver\'s legendary Cervantes sound system',
      'Dance floor vibes all night',
    ],
    bestTimeToArrive: '7:30 PM to get a good spot on the floor',
    currentVibeAround: 'Five Points is active — crowds gathering on Welton St.',
  },
  {
    venueId: 'v-005',
    title: 'Vendredi Sur Mer at Meow Wolf',
    tagline: 'French dream-pop inside Denver\'s wildest art space.',
    heroImage: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=500&fit=crop',
    date: 'Sat, Mar 14',
    time: '7:00 PM – 11:00 PM',
    doorsOpen: '6:00 PM',
    description: 'Vendredi Sur Mer performs live inside Meow Wolf Denver (Convergence Station), blending French dream-pop with the immersive, psychedelic art installations. A truly one-of-a-kind concert experience you can only get in Denver.',
    energyType: 'high',
    tags: ['Dream Pop', 'French', 'Art', 'Meow Wolf', 'Immersive', 'Tonight'],
    lineup: [
      { id: 'g12', name: 'Vendredi Sur Mer', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
    ],
    whatToExpect: [
      'Live performance inside immersive art installation',
      'Full Meow Wolf Convergence Station access',
      'Psychedelic visuals and interactive rooms',
      'Craft cocktails and food vendors on-site',
    ],
    bestTimeToArrive: '6:00 PM to explore Meow Wolf before the set starts',
    currentVibeAround: 'Sun Valley is busy — Meow Wolf line already forming.',
  },
];

const sharedFriends: FriendAttending[] = [
  { id: 'f1', name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { id: 'f2', name: 'Sam', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  { id: 'f3', name: 'Kai', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
  { id: 'f4', name: 'Priya', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
  { id: 'f5', name: 'Jordan', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face' },
];

const tierTemplates: Record<string, TicketTier[]> = {
  rock: [
    { id: 'tier-early', name: 'Early Bird', price: 29, originalPrice: 45, perks: ['General admission', 'Access to GA floor', '1 drink token'], available: 4, total: 100, soldOut: false, tag: 'Almost Gone' },
    { id: 'tier-ga', name: 'General Admission', price: 45, perks: ['General admission', 'Access to all floors', 'Balcony access'], available: 120, total: 400, soldOut: false },
    { id: 'tier-vip', name: 'VIP Balcony', price: 95, perks: ['Priority entry', 'Reserved balcony seating', 'Open bar until 9 PM', 'Meet & greet access'], available: 18, total: 50, soldOut: false, tag: 'Most Popular' },
    { id: 'tier-last', name: 'Last Call', price: 55, perks: ['Late entry after 8 PM', 'GA floor access', '2 drink tokens'], available: 0, total: 50, soldOut: true },
  ],
  indie: [
    { id: 'tier-early', name: 'Early Bird', price: 22, originalPrice: 35, perks: ['General admission', 'Floor access'], available: 12, total: 80, soldOut: false, tag: 'Best Value' },
    { id: 'tier-ga', name: 'General Admission', price: 35, perks: ['General admission', 'Full venue access'], available: 90, total: 300, soldOut: false },
    { id: 'tier-vip', name: 'VIP', price: 75, perks: ['Skip the line', 'Reserved viewing area', 'Complimentary drinks', 'Signed poster'], available: 8, total: 30, soldOut: false, tag: 'Limited' },
  ],
  club: [
    { id: 'tier-early', name: 'Early Bird', price: 20, originalPrice: 35, perks: ['Entry before 11 PM', 'Main floor access'], available: 6, total: 100, soldOut: false, tag: 'Selling Fast' },
    { id: 'tier-ga', name: 'General Admission', price: 35, perks: ['Entry anytime', 'All rooms access'], available: 200, total: 500, soldOut: false },
    { id: 'tier-vip', name: 'VIP Table', price: 150, perks: ['Reserved table for 4', 'Bottle service', 'Skip the line', 'All rooms access'], available: 5, total: 20, soldOut: false, tag: 'Premium' },
    { id: 'tier-last', name: 'Door Price', price: 45, perks: ['Entry at the door', 'Subject to capacity'], available: 999, total: 999, soldOut: false },
  ],
  intimate: [
    { id: 'tier-ga', name: 'General Seating', price: 28, perks: ['Reserved seat', 'Full show access'], available: 45, total: 150, soldOut: false },
    { id: 'tier-premium', name: 'Premium Seats', price: 48, perks: ['Front rows reserved', 'Complimentary wine', 'Program booklet'], available: 10, total: 40, soldOut: false, tag: 'Best Seats' },
  ],
  meowwolf: [
    { id: 'tier-early', name: 'Early Access', price: 35, originalPrice: 50, perks: ['Entry at 6 PM', 'Full Meow Wolf access', 'Concert included'], available: 15, total: 100, soldOut: false, tag: 'Explore First' },
    { id: 'tier-ga', name: 'Concert Only', price: 50, perks: ['Concert entry at 7 PM', 'Limited exhibit access'], available: 180, total: 400, soldOut: false },
    { id: 'tier-vip', name: 'VIP Experience', price: 110, perks: ['Full day Meow Wolf access', 'Priority concert viewing', 'Exclusive lounge', 'Commemorative poster'], available: 12, total: 40, soldOut: false, tag: 'Ultimate' },
  ],
  film: [
    { id: 'tier-ga', name: 'General Admission', price: 25, perks: ['Seated entry', 'Voting card', '1 drink ticket'], available: 60, total: 200, soldOut: false },
    { id: 'tier-vip', name: 'Front Row + After Party', price: 50, perks: ['Reserved front rows', 'After party access', '2 drink tickets', 'Exclusive swag'], available: 15, total: 40, soldOut: false, tag: 'Party On' },
  ],
};

const tierMap: Record<string, string> = {
  'v-001': 'rock',
  'v-002': 'indie',
  'v-003': 'indie',
  'v-005': 'meowwolf',
  'v-006': 'rock',
  'v-007': 'rock',
};

for (const template of eventTemplates) {
  const venue = pulzeVenues.find(v => v.id === template.venueId);
  if (!venue) continue;
  const tiers = tierTemplates[tierMap[template.venueId] ?? 'indie'] ?? tierTemplates.indie;
  venueEvents[template.venueId] = {
    id: `evt-${template.venueId}`,
    venueId: template.venueId,
    title: template.title,
    tagline: template.tagline,
    heroImage: template.heroImage,
    date: template.date,
    time: template.time,
    doorsOpen: template.doorsOpen,
    venueName: venue.name,
    venueAddress: venue.address,
    venueLatitude: venue.latitude,
    venueLongitude: venue.longitude,
    distanceFromUser: venue.eta,
    vibeScore: venue.vibe_score,
    vibeLabel: venue.vibe_score >= 90 ? 'Almost sold out' : venue.vibe_score >= 75 ? 'Selling fast' : venue.vibe_score >= 60 ? 'Available' : 'Plenty left',
    energyType: template.energyType,
    interestedCount: Math.floor(Math.random() * 600) + 200,
    attendingCount: Math.floor(Math.random() * 300) + 100,
    hostName: 'Pulze Denver',
    hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    hostVerified: true,
    description: template.description,
    whatToExpect: template.whatToExpect,
    bestTimeToArrive: template.bestTimeToArrive,
    currentVibeAround: template.currentVibeAround,
    ticketTiers: tiers.map(t => ({ ...t, id: `${t.id}-${template.venueId}` })),
    lineup: template.lineup,
    friendsGoing: sharedFriends.slice(0, Math.floor(Math.random() * 3) + 2),
    serviceFeePercent: 12,
    tags: template.tags,
  };
}

export const sampleEvent: PulzeEvent = venueEvents['v-001'] ?? {
  id: 'evt-001',
  venueId: 'v-001',
  title: 'Nothing More + Catch Your Breath',
  tagline: 'Hard-hitting rock with Archers and Doobie opening the night.',
  heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
  date: 'Sat, Mar 14',
  time: '5:30 PM – 11:00 PM',
  doorsOpen: '5:00 PM',
  venueName: 'Fillmore Auditorium',
  venueAddress: '1510 Clarkson St, Denver, CO',
  venueLatitude: 39.7407,
  venueLongitude: -104.9785,
  distanceFromUser: '8 min away',
  vibeScore: 94,
  vibeLabel: 'Almost sold out',
  energyType: 'high',
  interestedCount: 847,
  attendingCount: 312,
  hostName: 'Pulze Denver',
  hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  hostVerified: true,
  description: 'Nothing More brings their explosive live energy to the Fillmore Auditorium.',
  whatToExpect: [
    'Full band live sets from 4 artists',
    'Standing room GA floor + balcony seating',
    'Full bar with craft Colorado beers on tap',
    'Merch booth with tour exclusives',
  ],
  bestTimeToArrive: '5:00 PM to catch openers',
  currentVibeAround: 'Colfax is buzzing.',
  ticketTiers: tierTemplates.rock.map(t => ({ ...t })),
  lineup: [
    { id: 'g1', name: 'Nothing More', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face' },
  ],
  friendsGoing: sharedFriends.slice(0, 3),
  serviceFeePercent: 12,
  tags: ['Rock', 'Live Band', 'Fillmore', 'Tonight'],
};

export function getEventForVenue(venueId: string): PulzeEvent {
  return venueEvents[venueId] ?? sampleEvent;
}

export interface ArtistListing {
  id: string;
  artistName: string;
  eventName: string;
  venue: string;
  venueId: string;
  date: string;
  startingPrice: number;
  image: string;
  genre: string;
  trending: boolean;
  sellingFast: boolean;
  soldOutPercent: number;
}

export const artistListings: ArtistListing[] = [
  {
    id: 'al-001',
    artistName: 'Nothing More',
    eventName: 'Nothing More + Catch Your Breath',
    venue: 'Fillmore Auditorium',
    venueId: 'v-001',
    date: 'Tonight, Mar 14',
    startingPrice: 29,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    genre: 'Hard Rock',
    trending: true,
    sellingFast: true,
    soldOutPercent: 88,
  },
  {
    id: 'al-002',
    artistName: 'The Strumbellas',
    eventName: 'Into Dust Tour',
    venue: 'Gothic Theatre',
    venueId: 'v-002',
    date: 'Tonight, Mar 14',
    startingPrice: 22,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    genre: 'Indie Folk',
    trending: true,
    sellingFast: true,
    soldOutPercent: 76,
  },
  {
    id: 'al-003',
    artistName: 'The Barr Brothers',
    eventName: 'Let It Hiss Tour',
    venue: 'Bluebird Theater',
    venueId: 'v-003',
    date: 'Tonight, Mar 14',
    startingPrice: 22,
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop',
    genre: 'Folk Rock',
    trending: false,
    sellingFast: false,
    soldOutPercent: 52,
  },
  {
    id: 'al-004',
    artistName: 'Heyz',
    eventName: 'Heyz Live at the Ogden',
    venue: 'Ogden Theatre',
    venueId: 'v-007',
    date: 'Tonight, Mar 14',
    startingPrice: 29,
    image: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=400&h=400&fit=crop',
    genre: 'Pop / Electronic',
    trending: true,
    sellingFast: true,
    soldOutPercent: 82,
  },
  {
    id: 'al-005',
    artistName: 'Big Something',
    eventName: 'Big Something + Special Guests',
    venue: 'Cervantes Masterpiece',
    venueId: 'v-006',
    date: 'Tonight, Mar 14',
    startingPrice: 29,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop',
    genre: 'Jam / Funk',
    trending: false,
    sellingFast: true,
    soldOutPercent: 71,
  },
  {
    id: 'al-006',
    artistName: 'Two Feet',
    eventName: 'The Next Steps Tour',
    venue: 'Summit Music Hall',
    venueId: 'v-001',
    date: 'Tonight, Mar 14',
    startingPrice: 22,
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
    genre: 'Dark Electronic',
    trending: true,
    sellingFast: false,
    soldOutPercent: 58,
  },
  {
    id: 'al-007',
    artistName: 'Justin Jay',
    eventName: 'Global Dance + TheHundred',
    venue: 'The Church Nightclub',
    venueId: 'v-001',
    date: 'Tonight, Mar 14',
    startingPrice: 20,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
    genre: 'House / Disco',
    trending: true,
    sellingFast: true,
    soldOutPercent: 85,
  },
  {
    id: 'al-008',
    artistName: 'Vendredi Sur Mer',
    eventName: 'Live at Meow Wolf',
    venue: 'Meow Wolf Denver',
    venueId: 'v-005',
    date: 'Tonight, Mar 14',
    startingPrice: 35,
    image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&h=400&fit=crop',
    genre: 'Dream Pop',
    trending: true,
    sellingFast: true,
    soldOutPercent: 90,
  },
  {
    id: 'al-009',
    artistName: 'John Gorka & Friends',
    eventName: 'On A Winter\'s Night',
    venue: 'Swallow Hill Music',
    venueId: 'v-001',
    date: 'Tonight, Mar 14',
    startingPrice: 28,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop',
    genre: 'Folk / Acoustic',
    trending: false,
    sellingFast: false,
    soldOutPercent: 40,
  },
  {
    id: 'al-010',
    artistName: 'HUMP! Film Fest',
    eventName: 'HUMP! Film Fest 2026',
    venue: 'Oriental Theater',
    venueId: 'v-001',
    date: 'Tonight, Mar 14',
    startingPrice: 25,
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=400&fit=crop',
    genre: 'Film / Arts',
    trending: false,
    sellingFast: false,
    soldOutPercent: 55,
  },
];
