export type VenueType = 'bar' | 'club' | 'lounge' | 'brewery' | 'dive' | 'rooftop' | 'speakeasy';
export type BusynessLevel = 'quiet' | 'getting_busy' | 'packed';
export type Neighborhood = 'RiNo' | 'LoDo' | 'Cap Hill' | 'South Broadway' | 'LoHi' | 'Five Points' | 'Uptown' | 'Baker' | 'Downtown' | 'Colfax';

export interface PulzeVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: VenueType;
  typeLabel: string;
  busyness: BusynessLevel;
  busynessPercent: number;
  neighborhood: Neighborhood;
  address: string;
  vibe: string;
  photo?: string;
  photos: string[];
  eta: string;
  isOpen: boolean;
  checkins: number;
  views: number;
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
