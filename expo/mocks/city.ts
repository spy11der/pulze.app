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
}

export interface MapVenue {
  id: string;
  name: string;
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
  { id: 'all', label: 'All' },
  { id: 'friends', label: 'Friends' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'busy', label: 'Busy' },
  { id: 'events', label: 'Events' },
];

export const vibeStories: VibeStory[] = [
  {
    id: '1',
    title: 'Bar crawl crowds filling Blake St',
    venue: 'Blake Street Tavern',
    venueId: 'v2',
    neighborhood: 'LoDo',
    vibe: 'Party',
    intensity: 91,
    pace: 'packed',
    privacy: 'public',
    distance: '6 min',
    summary: '300+ people inside. ~15 min wait at door. Multiple groups moving between venues on Blake.',
    tags: ['bar crawl', 'crowded'],
    mediaLabel: 'St. Patrick\'s parade afterparty — expect heavy foot traffic on Blake St through midnight',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop',
    likes: 47,
    comments: 12,
  },
  {
    id: '2',
    title: 'Line forming at Fillmore, doors at 5',
    venue: 'Fillmore Auditorium',
    venueId: 'v1',
    neighborhood: 'Capitol Hill',
    vibe: 'Active',
    intensity: 85,
    pace: 'busy',
    privacy: 'friends',
    distance: '8 min',
    summary: '~200 in line. Merch tent open. GA floor expected to fill by 6 PM.',
    tags: ['concert', 'tonight'],
    mediaLabel: 'Nothing More + Catch Your Breath — doors 5 PM, show 5:30 PM',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
    likes: 33,
    comments: 8,
  },
  {
    id: '3',
    title: 'Patio crowd steady at Ratio',
    venue: 'Ratio Beerworks',
    venueId: 'v3',
    neighborhood: 'RiNo Art District',
    vibe: 'Social',
    intensity: 72,
    pace: 'busy',
    privacy: 'public',
    distance: '12 min',
    summary: '80+ on patio and taproom. No wait. Gallery-hoppers passing through Larimer.',
    tags: ['beer', 'community'],
    mediaLabel: 'RiNo galleries extending hours — good for a walking loop before dinner',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    likes: 21,
    comments: 5,
  },
  {
    id: '4',
    title: 'Clear skies, calm crowd at Wash Park',
    venue: 'Washington Park',
    venueId: 'v4',
    neighborhood: 'Wash Park',
    vibe: 'Romantic',
    intensity: 28,
    pace: 'quiet',
    privacy: 'public',
    distance: '15 min',
    summary: '~50 people spread out. Mountain views visible. 55°F and dropping.',
    tags: ['park', 'sunset'],
    mediaLabel: 'Clear skies, 55°F — good conditions for outdoor time until 8 PM',
    likes: 14,
    comments: 2,
  },
  {
    id: '5',
    title: 'Early crowd building at Meow Wolf',
    venue: 'Meow Wolf Denver',
    venueId: 'v5',
    neighborhood: 'Sun Valley',
    vibe: 'Creative',
    intensity: 82,
    pace: 'busy',
    privacy: 'public',
    distance: '15 min',
    summary: '150+ people. Exhibit wait ~10 min. Arriving early to explore before the 7 PM set.',
    tags: ['art', 'immersive'],
    mediaLabel: 'Vendredi Sur Mer live at 7 PM — early access recommended for exhibit time',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    likes: 56,
    comments: 15,
  },
  {
    id: '6',
    title: 'The Church quiet now, surge expected at 10',
    venue: 'The Church Nightclub',
    venueId: 'v6',
    neighborhood: 'Capitol Hill',
    vibe: 'Quiet',
    intensity: 35,
    pace: 'steady',
    privacy: 'public',
    distance: '9 min',
    summary: '~20 people. Doors at 10 PM. Line expected by 10:30. Arrive before 11.',
    tags: ['nightclub', 'late night'],
    mediaLabel: 'Justin Jay + Global Dance — doors 10 PM. Line gets long after 11.',
    likes: 9,
    comments: 3,
  },
];

export const mapVenues: MapVenue[] = [
  {
    id: 'v1',
    name: 'Fillmore Auditorium',
    category: 'Concert venue',
    mood: 'Pre-show buzz building',
    neighborhood: 'Capitol Hill',
    latitude: 39.7407,
    longitude: -104.9785,
    energy: 85,
    people: '200+ here',
    peopleCount: 200,
    eta: '8 min',
    blurb: 'Nothing More tonight. Line forming, merch tent up, Colfax is alive.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    postedAgo: '3m ago',
    photo: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
  },
  {
    id: 'v2',
    name: 'Blake Street Tavern',
    category: 'Sports bar',
    mood: 'St. Paddy\'s madness',
    neighborhood: 'LoDo',
    latitude: 39.7536,
    longitude: -104.9968,
    energy: 94,
    people: '300+ here',
    peopleCount: 300,
    eta: '6 min',
    blurb: 'Bar crawl HQ. Green everything. If you want chaos, this is it.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    postedAgo: '1m ago',
    photo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
  },
  {
    id: 'v3',
    name: 'Ratio Beerworks',
    category: 'Brewery',
    mood: 'Creative and flowing',
    neighborhood: 'RiNo Art District',
    latitude: 39.7648,
    longitude: -104.9805,
    energy: 72,
    people: '80+ here',
    peopleCount: 80,
    eta: '12 min',
    blurb: 'Great local brews, art on the walls, and a patio that\'s perfect right now.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    postedAgo: '5m ago',
    photo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  },
  {
    id: 'v4',
    name: 'Washington Park',
    category: 'Park',
    mood: 'Golden hour calm',
    neighborhood: 'Wash Park',
    latitude: 39.6975,
    longitude: -104.9693,
    energy: 28,
    people: '50+ here',
    peopleCount: 50,
    eta: '15 min',
    blurb: 'Clear mountain views, joggers, and blanket hangs. Peaceful escape.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    postedAgo: '12m ago',
  },
  {
    id: 'v5',
    name: 'Meow Wolf Denver',
    category: 'Art / Music venue',
    mood: 'Buzzing and weird',
    neighborhood: 'Sun Valley',
    latitude: 39.7530,
    longitude: -105.0072,
    energy: 82,
    people: '150+ here',
    peopleCount: 150,
    eta: '15 min',
    blurb: 'Vendredi Sur Mer tonight. People exploring the art before the set.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    postedAgo: '2m ago',
    photo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop',
  },
  {
    id: 'v6',
    name: 'The Church Nightclub',
    category: 'Nightclub',
    mood: 'Calm before the storm',
    neighborhood: 'Capitol Hill',
    latitude: 39.7343,
    longitude: -104.9847,
    energy: 35,
    people: '20+ here',
    peopleCount: 20,
    eta: '9 min',
    blurb: 'Justin Jay at 10 PM. This will be the late-night spot tonight.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    postedAgo: '8m ago',
  },
  {
    id: 'v7',
    name: 'Cervantes Masterpiece',
    category: 'Music venue',
    mood: 'Warming up fast',
    neighborhood: 'Five Points',
    latitude: 39.7536,
    longitude: -104.9788,
    energy: 68,
    people: '90+ here',
    peopleCount: 90,
    eta: '10 min',
    blurb: 'Big Something + surprise guests tonight. Jam band crowd gathering.',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    postedAgo: '4m ago',
    photo: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400&h=300&fit=crop',
  },
  {
    id: 'v8',
    name: 'Ogden Theatre',
    category: 'Concert venue',
    mood: 'Getting loud',
    neighborhood: 'Capitol Hill',
    latitude: 39.7400,
    longitude: -104.9740,
    energy: 78,
    people: '120+ here',
    peopleCount: 120,
    eta: '6 min',
    blurb: 'Heyz at 9 PM. Colfax corridor has 3 shows tonight — pick your vibe.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    postedAgo: '6m ago',
  },
  {
    id: 'v9',
    name: 'Union Station',
    category: 'Transit hub / Social',
    mood: 'Bustling and festive',
    neighborhood: 'LoDo',
    latitude: 39.7527,
    longitude: -105.0007,
    energy: 75,
    people: '200+ here',
    peopleCount: 200,
    eta: '7 min',
    blurb: 'St. Patrick\'s weekend energy. Terminal Bar is packed, Great Hall has that golden light.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    postedAgo: '3m ago',
    photo: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=300&fit=crop',
  },
  {
    id: 'v11',
    name: 'Federales Tacos & Tequila',
    category: 'Mexican restaurant',
    mood: 'Busier than expected',
    neighborhood: 'RiNo Art District',
    latitude: 39.7615853,
    longitude: -104.9816542,
    energy: 55,
    people: '60+ here',
    peopleCount: 60,
    eta: '11 min',
    blurb: 'Running 30 pts above forecast for a Sunday afternoon. Tacos, tequila, and a surprisingly lively crowd.',
    avatar: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=100&h=100&fit=crop&crop=center',
    postedAgo: 'Live',
    photo: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
  },
  {
    id: 'v10',
    name: 'Tattered Cover',
    category: 'Bookstore / Cafe',
    mood: 'Cozy and quiet',
    neighborhood: 'McGregor Square',
    latitude: 39.7558,
    longitude: -104.9942,
    energy: 15,
    people: '12 here',
    peopleCount: 12,
    eta: '8 min',
    blurb: 'Perfect if you want to escape the St. Paddy\'s chaos. Coffee, books, silence.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    postedAgo: '20m ago',
  },
];

export const mediaSignals: string[] = [
  'Denver St. Patrick\'s Day Parade wrapped this morning — bar crawl energy carrying into the evening.',
  'Colfax corridor has 3 major concerts tonight: Fillmore, Ogden, and Bluebird all selling fast.',
  'Meow Wolf reporting record attendance today — Vendredi Sur Mer show expected to sell out.',
  'Clear skies tonight in Denver, 55°F — perfect for rooftop hangs and outdoor patios.',
  'RTD light rail running extended hours for concert-goers — last train at 1:30 AM.',
];
