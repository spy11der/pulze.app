export type EventGenre = 'music' | 'comedy' | 'sports' | 'arts' | 'festival' | 'nightlife';
export type EventStatus = 'on_sale' | 'few_left' | 'sold_out';

export interface PulzeVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: EventGenre;
  categoryLabel: string;
  vibe_score: number;        // derived from soldOutPercent — keep same field name so map code doesn't break
  open_status: 'open' | 'closed' | 'closing_soon';
  address: string;
  neighborhood: string;
  mood: string;              // becomes event tagline e.g. "Doors at 8 · Show at 9"
  people: string;            // becomes "82% sold"
  peopleCount: number;       // raw sold percent 0-100
  eta: string;               // distance, keep as-is
  blurb: string;             // short event description
  avatar: string;            // artist/event image
  postedAgo: string;         // becomes time until show e.g. "Tonight 9 PM"
  photo?: string;
  // New event-specific fields
  eventDate: string;         // "Tonight" | "Tomorrow" | "Sat Mar 15"
  eventTime: string;         // "9:00 PM"
  soldOutPercent: number;    // 0-100
  ticketStatus: EventStatus;
  startingPrice: number;
  venueId: string;           // links to ticketing screen
}

export interface MapCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  venues: PulzeVenue[];
  avgVibeScore: number;
}

export type MapFilterId = 'all' | 'tonight' | 'tomorrow' | 'music' | 'comedy' | 'sports' | 'arts';

export interface MapFilter {
  id: MapFilterId;
  label: string;
  icon: string;
}

export const MAP_FILTERS: MapFilter[] = [
  { id: 'all',      label: 'All',      icon: 'Sparkles'    },
  { id: 'tonight',  label: 'Tonight',  icon: 'Zap'         },
  { id: 'tomorrow', label: 'Tomorrow', icon: 'CalendarDays' },
  { id: 'music',    label: 'Music',    icon: 'Music'        },
  { id: 'comedy',   label: 'Comedy',   icon: 'Laugh'        },
  { id: 'sports',   label: 'Sports',   icon: 'Trophy'       },
  { id: 'arts',     label: 'Arts',     icon: 'Sparkles'     },
];