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

export interface Venue {
  id: string;
  name: string;
  shortName: string;
  image: string;
  vibeScore: number;
  energyType: 'quiet' | 'moderate' | 'pulze';
  address: string;
  latitude: number;
  longitude: number;
  distanceFromUser: string;
}

export const venues: Venue[] = [
  {
    id: 'v-001',
    name: 'Mica Rooftop',
    shortName: 'Mica',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=200&h=200&fit=crop',
    vibeScore: 94,
    energyType: 'pulze',
    address: '47 Warehouse Blvd, Lower East Side',
    latitude: 40.7229,
    longitude: -73.9986,
    distanceFromUser: '12 min away',
  },
  {
    id: 'v-002',
    name: 'The Velvet Room',
    shortName: 'Velvet',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
    vibeScore: 87,
    energyType: 'pulze',
    address: '220 Canal St, SoHo',
    latitude: 40.7195,
    longitude: -74.0010,
    distanceFromUser: '18 min away',
  },
  {
    id: 'v-003',
    name: 'Skyline Terrace',
    shortName: 'Skyline',
    image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=200&h=200&fit=crop',
    vibeScore: 72,
    energyType: 'moderate',
    address: '88 Greenwich Ave, West Village',
    latitude: 40.7352,
    longitude: -74.0003,
    distanceFromUser: '22 min away',
  },
  {
    id: 'v-004',
    name: 'Neon Garden',
    shortName: 'Neon',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop',
    vibeScore: 91,
    energyType: 'pulze',
    address: '15 Rivington St, LES',
    latitude: 40.7207,
    longitude: -73.9903,
    distanceFromUser: '8 min away',
  },
  {
    id: 'v-005',
    name: 'Dusk Lounge',
    shortName: 'Dusk',
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=200&h=200&fit=crop',
    vibeScore: 65,
    energyType: 'quiet',
    address: '401 W 14th St, Meatpacking',
    latitude: 40.7410,
    longitude: -74.0072,
    distanceFromUser: '25 min away',
  },
  {
    id: 'v-006',
    name: 'Prism Hall',
    shortName: 'Prism',
    image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d50?w=200&h=200&fit=crop',
    vibeScore: 83,
    energyType: 'moderate',
    address: '99 Bowery, NoHo',
    latitude: 40.7251,
    longitude: -73.9937,
    distanceFromUser: '15 min away',
  },
  {
    id: 'v-007',
    name: 'Echo Warehouse',
    shortName: 'Echo',
    image: 'https://images.unsplash.com/photo-1504704911898-68304a7d2e80?w=200&h=200&fit=crop',
    vibeScore: 78,
    energyType: 'moderate',
    address: '12 Kent Ave, Williamsburg',
    latitude: 40.7143,
    longitude: -73.9614,
    distanceFromUser: '30 min away',
  },
  {
    id: 'v-008',
    name: 'Aura Club',
    shortName: 'Aura',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=200&h=200&fit=crop',
    vibeScore: 96,
    energyType: 'pulze',
    address: '55 Little West St, FiDi',
    latitude: 40.7078,
    longitude: -74.0160,
    distanceFromUser: '20 min away',
  },
];

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
  energyType: 'quiet' | 'moderate' | 'pulze';
  tags: string[];
}> = [
  {
    venueId: 'v-001',
    title: 'Neon Drift: Rooftop After Dark',
    tagline: 'Where the city skyline meets deep house and craft cocktails.',
    heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
    date: 'Sat, Mar 22',
    time: '9:00 PM – 2:00 AM',
    doorsOpen: '8:30 PM',
    description: 'Neon Drift is an immersive rooftop experience blending deep house, ambient visuals, and curated cocktails under the open sky.',
    energyType: 'pulze',
    tags: ['Rooftop', 'Deep House', 'Cocktails', 'Live DJ', 'Night Life'],
  },
  {
    venueId: 'v-002',
    title: 'Velvet Sessions: Jazz & Soul',
    tagline: 'An intimate night of jazz, soul, and smooth vibes.',
    heroImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop',
    date: 'Fri, Mar 21',
    time: '8:00 PM – 1:00 AM',
    doorsOpen: '7:30 PM',
    description: 'Velvet Sessions brings together the finest jazz and soul artists for an unforgettable evening in the heart of SoHo.',
    energyType: 'pulze',
    tags: ['Jazz', 'Soul', 'Live Music', 'Cocktails', 'Intimate'],
  },
  {
    venueId: 'v-003',
    title: 'Skyline Sunset Mixer',
    tagline: 'Networking meets golden hour with panoramic views.',
    heroImage: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=500&fit=crop',
    date: 'Thu, Mar 20',
    time: '5:30 PM – 10:00 PM',
    doorsOpen: '5:00 PM',
    description: 'A curated sunset mixer on the terrace with craft drinks, light bites, and great company. Perfect for making new connections.',
    energyType: 'moderate',
    tags: ['Networking', 'Sunset', 'Terrace', 'Social', 'Drinks'],
  },
  {
    venueId: 'v-004',
    title: 'Neon Garden: Techno Bloom',
    tagline: 'Underground techno meets art in a garden paradise.',
    heroImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop',
    date: 'Sat, Mar 22',
    time: '10:00 PM – 4:00 AM',
    doorsOpen: '9:30 PM',
    description: 'Techno Bloom transforms the Neon Garden into a pulsating underground experience with immersive visuals and world-class DJs.',
    energyType: 'pulze',
    tags: ['Techno', 'Underground', 'Art', 'Garden', 'Late Night'],
  },
  {
    venueId: 'v-005',
    title: 'Dusk: Acoustic Sessions',
    tagline: 'Stripped-back acoustic sets in candlelit ambiance.',
    heroImage: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=500&fit=crop',
    date: 'Wed, Mar 19',
    time: '7:00 PM – 10:30 PM',
    doorsOpen: '6:30 PM',
    description: 'A quiet evening of acoustic performances in the warm, candlelit atmosphere of Dusk Lounge.',
    energyType: 'quiet',
    tags: ['Acoustic', 'Chill', 'Candles', 'Wine', 'Intimate'],
  },
  {
    venueId: 'v-006',
    title: 'Prism: Art After Hours',
    tagline: 'Late-night art gallery with live painting and beats.',
    heroImage: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d50?w=800&h=500&fit=crop',
    date: 'Fri, Mar 21',
    time: '9:00 PM – 1:00 AM',
    doorsOpen: '8:30 PM',
    description: 'Experience art in a whole new way with live painting, immersive installations, and curated beats.',
    energyType: 'moderate',
    tags: ['Art', 'Gallery', 'Live Painting', 'Beats', 'Culture'],
  },
  {
    venueId: 'v-007',
    title: 'Echo: Warehouse Rave',
    tagline: 'Raw energy in a converted warehouse space.',
    heroImage: 'https://images.unsplash.com/photo-1504704911898-68304a7d2e80?w=800&h=500&fit=crop',
    date: 'Sat, Mar 22',
    time: '11:00 PM – 5:00 AM',
    doorsOpen: '10:30 PM',
    description: 'Echo Warehouse hosts an authentic rave experience with industrial vibes, heavy bass, and no pretense.',
    energyType: 'moderate',
    tags: ['Rave', 'Warehouse', 'Bass', 'Industrial', 'Late Night'],
  },
  {
    venueId: 'v-008',
    title: 'Aura: Neon Nights',
    tagline: 'The hottest club night downtown with surprise headliners.',
    heroImage: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=500&fit=crop',
    date: 'Sat, Mar 22',
    time: '10:00 PM – 3:00 AM',
    doorsOpen: '9:30 PM',
    description: 'Aura Club delivers the ultimate nightlife experience with neon visuals, premium bottle service, and surprise headliners.',
    energyType: 'pulze',
    tags: ['Club', 'Neon', 'VIP', 'Headliners', 'Premium'],
  },
];

const sharedLineup: EventGuest[] = [
  { id: 'g1', name: 'DJ Sable', role: 'Headliner', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
  { id: 'g2', name: 'Mira Volta', role: 'Opening Set', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
  { id: 'g3', name: 'KVSH', role: 'Surprise Guest', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
];

const sharedFriends: FriendAttending[] = [
  { id: 'f1', name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { id: 'f2', name: 'Sam', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  { id: 'f3', name: 'Kai', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
  { id: 'f4', name: 'Priya', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
  { id: 'f5', name: 'Jordan', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face' },
];

const sharedTiers: TicketTier[] = [
  { id: 'tier-early', name: 'Early Bird', price: 25, originalPrice: 45, perks: ['General entry', 'Access to main floor', '1 welcome drink'], available: 8, total: 100, soldOut: false, tag: 'Best Value' },
  { id: 'tier-ga', name: 'General Admission', price: 45, perks: ['General entry', 'Access to all floors', '1 welcome drink'], available: 156, total: 400, soldOut: false },
  { id: 'tier-vip', name: 'VIP', price: 120, perks: ['Priority entry (skip the line)', 'Rooftop lounge access', 'Open bar until 11 PM', 'Dedicated seating area', 'Meet & greet with DJs'], available: 22, total: 60, soldOut: false, tag: 'Most Popular' },
  { id: 'tier-last', name: 'Last Call', price: 65, perks: ['Late entry after 11 PM', 'Access to main floor', '2 drink tokens'], available: 0, total: 50, soldOut: true },
];

for (const template of eventTemplates) {
  const venue = venues.find(v => v.id === template.venueId)!;
  venueEvents[template.venueId] = {
    id: `evt-${template.venueId}`,
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
    distanceFromUser: venue.distanceFromUser,
    vibeScore: venue.vibeScore,
    vibeLabel: venue.vibeScore >= 90 ? 'Electric' : venue.vibeScore >= 75 ? 'Vibing' : venue.vibeScore >= 60 ? 'Warming Up' : 'Chill',
    energyType: template.energyType,
    interestedCount: Math.floor(Math.random() * 600) + 200,
    attendingCount: Math.floor(Math.random() * 300) + 100,
    hostName: 'Pulze Collective',
    hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    hostVerified: true,
    description: template.description,
    whatToExpect: [
      'Live DJ sets from sunset to close',
      'Craft cocktail bar with exclusive event menu',
      'Surprise guest performance',
      'Photo lounge with themed backdrop',
    ],
    bestTimeToArrive: '9:15 – 9:45 PM for the best energy-to-crowd ratio',
    currentVibeAround: 'The block is already buzzing. Foot traffic is picking up fast.',
    ticketTiers: sharedTiers.map(t => ({ ...t, id: `${t.id}-${template.venueId}` })),
    lineup: sharedLineup,
    friendsGoing: sharedFriends.slice(0, Math.floor(Math.random() * 3) + 2),
    serviceFeePercent: 12,
    tags: template.tags,
  };
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

export function getEventForVenue(venueId: string): PulzeEvent {
  return venueEvents[venueId] ?? sampleEvent;
}
