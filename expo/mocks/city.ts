export interface VibeStory {
  id: string;
  title: string;
  venue: string;
  venueId: string;
  neighborhood: string;
  vibe: string;
  intensity: number;
  pace: 'quiet' | 'steady' | 'busy' | 'packed';
  privacy: 'public' | 'friends';
  distance: string;
  summary: string;
  tags: string[];
  mediaLabel: string;
  image?: string;
  likes: number;
  comments: number;
  soldOutPercent: number;
  eventTime: string;
  startingPrice: number;
}

export interface FeedFilter {
  id: string;
  label: string;
}

export const feedFilters: FeedFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'events', label: 'Music' },
];

export const vibeStories: VibeStory[] = [
  {
    id: '1',
    title: 'Fillmore line already forming',
    venue: 'Fillmore Auditorium',
    venueId: 'v-001',
    neighborhood: 'Capitol Hill',
    vibe: 'Music',
    intensity: 88,
    pace: 'busy',
    privacy: 'public',
    distance: '8 min',
    summary: 'Nothing More fans camped out front. Merch tent is up. Doors at 7, but the block is buzzing now.',
    tags: ['concert', 'tonight'],
    mediaLabel: 'Nothing More + Catch Your Breath · Doors 7 PM · Show 9 PM',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
    likes: 47,
    comments: 12,
    soldOutPercent: 88,
    eventTime: 'Tonight 9 PM',
    startingPrice: 29,
  },
  {
    id: '2',
    title: 'Red Rocks almost gone — last few tickets',
    venue: 'Red Rocks Amphitheatre',
    venueId: 'v-009',
    neighborhood: 'Morrison',
    vibe: 'Music',
    intensity: 97,
    pace: 'packed',
    privacy: 'public',
    distance: '35 min',
    summary: 'Khruangbin tonight. 97% sold, resale only. Gates open at 6, get there early for parking.',
    tags: ['concert', 'tonight', 'selling fast'],
    mediaLabel: 'Khruangbin · Gates 6 PM · Show 8 PM',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
    likes: 91,
    comments: 24,
    soldOutPercent: 97,
    eventTime: 'Tonight 8 PM',
    startingPrice: 120,
  },
  {
    id: '3',
    title: 'Comedy Works moving fast tonight',
    venue: 'Comedy Works Downtown',
    venueId: 'v-008',
    neighborhood: 'LoDo',
    vibe: 'Comedy',
    intensity: 83,
    pace: 'busy',
    privacy: 'public',
    distance: '7 min',
    summary: 'Word is out about the surprise guest. 83% sold and climbing. Grab tickets now.',
    tags: ['comedy', 'tonight'],
    mediaLabel: 'John Mulaney work-in-progress · Show 8 PM · 21+',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
    likes: 38,
    comments: 9,
    soldOutPercent: 83,
    eventTime: 'Tonight 8 PM',
    startingPrice: 30,
  },
  {
    id: '4',
    title: 'Bluebird still has good seats',
    venue: 'Bluebird Theater',
    venueId: 'v-003',
    neighborhood: 'Capitol Hill',
    vibe: 'Music',
    intensity: 62,
    pace: 'steady',
    privacy: 'public',
    distance: '9 min',
    summary: 'The Barr Brothers tonight. Early bird tickets still available. Intimate venue, great sound.',
    tags: ['concert', 'tonight'],
    mediaLabel: 'The Barr Brothers · Let It Hiss Tour · Doors 8 PM',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=400&fit=crop',
    likes: 21,
    comments: 5,
    soldOutPercent: 62,
    eventTime: 'Tonight 9 PM',
    startingPrice: 22,
  },
  {
    id: '5',
    title: 'Nuggets selling out — tip-off at 7:30',
    venue: 'Ball Arena',
    venueId: 'v-004',
    neighborhood: 'Sun Valley',
    vibe: 'Sports',
    intensity: 91,
    pace: 'packed',
    privacy: 'public',
    distance: '16 min',
    summary: 'Nuggets vs Lakers. Playoff implications. Parking lots filling fast, last few seats available.',
    tags: ['sports', 'tonight'],
    mediaLabel: 'Nuggets vs Lakers · Tip-off 7:30 PM',
    image: 'https://images.unsplash.com/photo-1504450758481-7338bbe75c8e?w=600&h=400&fit=crop',
    likes: 64,
    comments: 18,
    soldOutPercent: 91,
    eventTime: 'Tonight 7:30 PM',
    startingPrice: 85,
  },
  {
    id: '6',
    title: 'Cervantes tomorrow — tickets wide open',
    venue: 'Cervantes Masterpiece',
    venueId: 'v-006',
    neighborhood: 'Five Points',
    vibe: 'Music',
    intensity: 45,
    pace: 'steady',
    privacy: 'public',
    distance: '10 min',
    summary: 'Big Something tomorrow night. Jam band crowd, plenty of tickets, great venue for GA.',
    tags: ['concert', 'tomorrow'],
    mediaLabel: 'Big Something · Tomorrow · Doors 8 PM',
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&h=400&fit=crop',
    likes: 14,
    comments: 3,
    soldOutPercent: 45,
    eventTime: 'Tomorrow 9 PM',
    startingPrice: 18,
  },
];

export const mediaSignals: string[] = [
  'Colfax corridor has 3 major concerts tonight — Fillmore, Ogden, and Bluebird all selling fast.',
  'Red Rocks parking fills 90 min before showtime on sold-out nights. Leave early.',
  'RTD light rail running extended hours for concert-goers — last train at 1:30 AM.',
  'Comedy Works downtown is cash-only at the door. Buy tickets online before you go.',
  'Ball Arena doors open 90 min before tip-off. Parking garage on Auraria recommended.',
];
