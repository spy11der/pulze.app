export type VenueCategory = 'bar' | 'food' | 'coffee' | 'music' | 'nightclub' | 'park' | 'art' | 'social' | 'event';

export type OpenStatus = 'open' | 'closed' | 'closing_soon';

export interface PulzeVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: VenueCategory;
  categoryLabel: string;
  vibe_score: number;
  open_status: OpenStatus;
  address: string;
  neighborhood: string;
  mood: string;
  people: string;
  peopleCount: number;
  eta: string;
  blurb: string;
  avatar: string;
  postedAgo: string;
  photo?: string;
}

export interface MapCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  venues: PulzeVenue[];
  avgVibeScore: number;
}

export type MapFilterId = 'all' | 'pulze' | 'quiet' | 'food' | 'bars' | 'events' | 'coffee';

export interface MapFilter {
  id: MapFilterId;
  label: string;
  icon: string;
}

export const MAP_FILTERS: MapFilter[] = [
  { id: 'all', label: 'All', icon: 'Sparkles' },
  { id: 'pulze', label: 'Pulze', icon: 'Zap' },
  { id: 'quiet', label: 'Quiet', icon: 'Moon' },
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
  { id: 'bars', label: 'Bars', icon: 'Wine' },
  { id: 'events', label: 'Events', icon: 'CalendarDays' },
  { id: 'coffee', label: 'Coffee', icon: 'Coffee' },
];
