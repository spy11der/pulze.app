export interface VibeStory {
  id: string;
  title: string;
  venue: string;
  neighborhood: string;
  vibe: string;
  intensity: number;
  pace: 'quiet' | 'steady' | 'busy' | 'packed';
  privacy: 'public' | 'friends';
  distance: string;
  summary: string;
  tags: string[];
  mediaLabel: string;
}

export interface MapVenue {
  id: string;
  name: string;
  address?: string;
  category: string;
  mood: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  energy: number;
  people: string;
  peopleCount: number;
  eta: string;
  blurb: string;
  avatar: string;
  postedAgo: string;
  photo?: string;
}

export interface FeedFilter {
  id: string;
  label: string;
}

export const feedFilters: FeedFilter[] = [
  { id: 'all', label: 'Free for all' },
  { id: 'friends', label: 'Friends only' },
  { id: 'quiet', label: 'Quiet spots' },
  { id: 'busy', label: 'Busy now' },
  { id: 'events', label: 'Events' },
];

export const vibeStories: VibeStory[] = [
  {
    id: '1',
    title: 'Golden hour on the riverwalk',
    venue: 'Pier Lantern Steps',
    neighborhood: 'Seaport Edge',
    vibe: 'Calm glow',
    intensity: 34,
    pace: 'quiet',
    privacy: 'public',
    distance: '4 min away',
    summary: 'Good book energy. Street violin nearby, but soft enough to stay in your own world.',
    tags: ['sunset', 'reading', 'outside'],
    mediaLabel: 'Local newsletter picked up the riverside string set',
  },
  {
    id: '2',
    title: 'The line is real but it is worth it',
    venue: 'Mica Rooftop',
    neighborhood: 'Warehouse District',
    vibe: 'Alive and loud',
    intensity: 92,
    pace: 'packed',
    privacy: 'friends',
    distance: '11 min away',
    summary: 'Everyone is outside, DJ already started, no one is sitting down.',
    tags: ['dj', 'cocktails', 'crowded'],
    mediaLabel: 'Concert account says surprise guest at 10:30',
  },
  {
    id: '3',
    title: 'Neighborhood market turned into a block party',
    venue: 'Juniper Square',
    neighborhood: 'North Loop',
    vibe: 'Busy and bright',
    intensity: 76,
    pace: 'busy',
    privacy: 'public',
    distance: '7 min away',
    summary: 'Food stalls, dancers, and a lot more families than expected. Feels social, not chaotic.',
    tags: ['food', 'community', 'music'],
    mediaLabel: 'City events board lists an open-air film after dark',
  },
  {
    id: '4',
    title: 'Cafe stayed unexpectedly hushed today',
    venue: 'Paper Moon Cafe',
    neighborhood: 'East Garden',
    vibe: 'Quiet window seat',
    intensity: 18,
    pace: 'quiet',
    privacy: 'public',
    distance: '9 min away',
    summary: 'No laptop rush, mostly people journaling and talking low. Great fallback spot.',
    tags: ['coffee', 'quiet', 'study'],
    mediaLabel: 'Arts blog says poetry reading starts later tonight',
  },
];

export const mapVenues: MapVenue[] = [
  {
    id: 'v1',
    name: 'Paramount Theatre',
    address: '1621 Glenarm Pl, Denver, CO 80202',
    category: 'Historic theater',
    mood: 'Pre-show energy',
    neighborhood: 'Downtown Denver',
    latitude: 39.744306,
    longitude: -104.992281,
    energy: 92,
    people: '180+ here',
    peopleCount: 180,
    eta: '7 min',
    blurb: 'Good test venue for real downtown Denver walking directions.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    postedAgo: '2m ago',
    photo: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
  },
  {
    id: 'v2',
    name: 'Paper Moon Cafe',
    category: 'Cafe',
    mood: 'Quiet right now',
    neighborhood: 'East Garden',
    latitude: 40.7298,
    longitude: -73.9859,
    energy: 18,
    people: '14 here',
    peopleCount: 14,
    eta: '8 min',
    blurb: 'Low-volume room with table space and soft lighting.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    postedAgo: '8m ago',
  },
  {
    id: 'v3',
    name: 'Juniper Square',
    category: 'Outdoor plaza',
    mood: 'Busy but easy',
    neighborhood: 'North Loop',
    latitude: 40.7188,
    longitude: -73.9897,
    energy: 76,
    people: '90+ here',
    peopleCount: 90,
    eta: '6 min',
    blurb: 'Street food, live chatter, and enough room to hang without shouting.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    postedAgo: '4m ago',
    photo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
  },
  {
    id: 'v4',
    name: 'Harbor Reading Lawn',
    category: 'Park',
    mood: 'Soft and spacious',
    neighborhood: 'Seaport Edge',
    latitude: 40.7066,
    longitude: -74.0027,
    energy: 22,
    people: '20 here',
    peopleCount: 20,
    eta: '14 min',
    blurb: 'Bring a blanket. Easy place to disappear without being isolated.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    postedAgo: '15m ago',
  },
  {
    id: 'v5',
    name: 'Neon Alley',
    category: 'Night market',
    mood: 'Vibrant chaos',
    neighborhood: 'Lower East',
    latitude: 40.7155,
    longitude: -73.9945,
    energy: 85,
    people: '140+ here',
    peopleCount: 140,
    eta: '9 min',
    blurb: 'Street vendors, neon signs, and the best late-night tacos in the city.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    postedAgo: '1m ago',
    photo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  },
  {
    id: 'v6',
    name: 'Elm Street Library',
    category: 'Library',
    mood: 'Dead silent',
    neighborhood: 'Midtown',
    latitude: 40.7265,
    longitude: -73.9960,
    energy: 8,
    people: '6 here',
    peopleCount: 6,
    eta: '10 min',
    blurb: 'If you need absolute silence. Not a single conversation happening.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    postedAgo: '22m ago',
  },
];

export const mediaSignals: string[] = [
  'Transit alerts show the riverfront is moving slowly after the market rush.',
  'Local radio says the jazz set in North Loop is spilling onto the sidewalk.',
  'Community calendar shows three open-air screenings tonight.',
];
