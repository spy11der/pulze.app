export type VenueType = 'bar' | 'club' | 'lounge' | 'brewery' | 'dive' | 'rooftop' | 'speakeasy';
export type BusynessLevel = 'quiet' | 'getting_busy' | 'packed';

export interface PulzeVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: VenueType;
  typeLabel: string;
  busyness: BusynessLevel;
  busynessPercent: number;
  neighborhood: string;
  address: string;
  vibe: string;
  tags: string[];
  photo?: string;
  photos: string[];
  eta?: string;
  isOpen?: boolean;
  checkins?: number;
  views?: number;
  // Real Supabase fields — only present for venues that have them (imported
  // or otherwise). Not required by any current UI path; added here so
  // mergeWithMock()'s real-data fallback has somewhere to put them.
  phone?: string;
  rating?: number;
  priceLevel?: number;
  // Locality from the feed. Search is nationwide, so a result list needs the
  // city to tell two same-named venues apart.
  city?: string;
  region?: string;
  // 0-100 from live_venue_scores.confidence_score. Absent (undefined) means
  // "not fetched" — treated as insufficient by `hasReliableBusyness` so we
  // never surface a busyness figure derived from no signal.
  confidence?: number;

  // --- Placement contract (Phase 6A-1, decision A3) ---
  //
  // Set from the authoritative feed and nothing else. They are inert for the
  // whole of 6A: pulze_discover_feed hardcodes is_sponsored=false and the
  // other two to null, and pulze_organic_score takes no monetization input at
  // all. The fields and their rendering boundary ship now so that 6B (CPC)
  // and 6C (boosts) plug into a disclosure path that already exists and has
  // already been tested, instead of reopening the organic ranker.
  //
  // Disclosure rule, non-negotiable: whenever isSponsored is true the card
  // MUST render the sponsored label. There is no client-side inference here —
  // the server decides, the client only displays.
  isSponsored?: boolean;
  placementId?: string | null;
  placementReason?: string | null;
}

// Threshold below which pulze_score is treated as insufficient live data.
// The scoring view derives `confidence_score = LEAST(100, active_visitors * 10)`,
// so this maps to "at least 2 concurrent presence signals for the venue" —
// the minimum where a Quiet/Getting-Busy/Packed claim is defensible.
export const MIN_BUSYNESS_CONFIDENCE = 20;

// True only when we can defensibly show a real busyness figure. UI code
// should render the neutral "no live data" state when this returns false,
// including for busyness-based filters (Popping now / Low wait).
//
// This deliberately takes NO account of isSponsored. A sponsored venue with
// insufficient live signal shows "No live data" exactly like any other venue:
// paid placement buys position, never an implied crowd level. A sponsored card
// sitting at position 1 displaying "No live data" is the correct rendering.
export function hasReliableBusyness(v: { confidence?: number }): boolean {
  return typeof v.confidence === 'number' && v.confidence >= MIN_BUSYNESS_CONFIDENCE;
}

export interface CheckIn {
  id: string;
  userId: string;
  userName: string;
  venueId: string;
  venueName: string;
  photoUri: string;
  caption: string;
  createdAt: string;
}

export function getBusynessLabel(level: BusynessLevel): string {
  switch (level) {
    case 'quiet': return 'Quiet';
    case 'getting_busy': return 'Getting Busy';
    case 'packed': return 'Packed';
  }
}

export function getBusynessColor(level: BusynessLevel): string {
  switch (level) {
    case 'quiet': return '#6B8E7B';
    case 'getting_busy': return '#E8A840';
    case 'packed': return '#E8443A';
  }
}

export function getBusynessBgColor(level: BusynessLevel): string {
  switch (level) {
    case 'quiet': return 'rgba(107, 142, 123, 0.15)';
    case 'getting_busy': return 'rgba(232, 168, 64, 0.15)';
    case 'packed': return 'rgba(232, 68, 58, 0.15)';
  }
}
