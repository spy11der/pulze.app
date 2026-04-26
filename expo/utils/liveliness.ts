export type LivelinessLabel = 'PACKED' | 'BUZZING' | 'LIVELY' | 'CHILL' | 'QUIET' | 'UNKNOWN';

export interface LivelinessInfo {
  score: number | null;
  label: LivelinessLabel;
  emoji: string;
  color: string;
}

export function calcLiveliness(
  capacity: number | null | undefined,
  activeListingsTotal: number | null | undefined,
): number | null {
  if (!capacity || capacity <= 0) return null;
  const remaining = activeListingsTotal ?? 0;
  const score = ((capacity - remaining) / capacity) * 100;
  return Math.max(0, Math.min(100, score));
}

export function getLivelinessLabel(score: number | null | undefined): LivelinessLabel {
  if (score === null || score === undefined || Number.isNaN(score)) return 'UNKNOWN';
  if (score >= 99) return 'PACKED';
  if (score >= 80) return 'BUZZING';
  if (score >= 50) return 'LIVELY';
  if (score >= 20) return 'CHILL';
  return 'QUIET';
}

const LABEL_COLORS: Record<LivelinessLabel, string> = {
  PACKED: '#E8443A',
  BUZZING: '#E8A830',
  LIVELY: '#2BBFBA',
  CHILL: '#1E9E9A',
  QUIET: '#567880',
  UNKNOWN: '#567880',
};

const LABEL_EMOJI: Record<LivelinessLabel, string> = {
  PACKED: '🔥',
  BUZZING: '⚡',
  LIVELY: '🎵',
  CHILL: '😌',
  QUIET: '🌙',
  UNKNOWN: '·',
};

export function getLivelinessInfo(score: number | null | undefined): LivelinessInfo {
  const label = getLivelinessLabel(score);
  return {
    score: score ?? null,
    label,
    emoji: LABEL_EMOJI[label],
    color: LABEL_COLORS[label],
  };
}

export function sumActiveListings(
  listings: Array<{ active: boolean | null; quantity: number | null }> | null | undefined,
): number {
  if (!listings || listings.length === 0) return 0;
  return listings.reduce((sum, l) => {
    if (l.active === false) return sum;
    return sum + (l.quantity ?? 0);
  }, 0);
}
