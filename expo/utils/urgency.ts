export type UrgencyLabel = 'Peak now' | 'Filling fast' | 'Tickets available' | 'Plenty of seats' | 'Steady' | 'Wide open';

export type DecisionAction = 'GO_NOW' | 'WAIT' | 'SKIP';

export interface UrgencyInfo {
  label: UrgencyLabel;
  color: string;
  icon: 'flame' | 'trending-up' | 'clock' | 'trending-down' | 'minus' | 'moon';
}

export interface DecisionInfo {
  action: DecisionAction;
  label: string;
  color: string;
  bgColor: string;
  reason: string;
}

export interface LiveActivity {
  recentPeople: number;
  updatedMinutesAgo: number;
  friendsNearby: number;
}

export function getUrgencyLabel(vibeScore: number, peopleCount: number, pace?: string): UrgencyInfo {
  if (vibeScore >= 85 && peopleCount >= 150) {
    return { label: 'Peak now', color: '#2BBFBA', icon: 'flame' };
  }
  if (vibeScore >= 70 && peopleCount >= 80) {
    return { label: 'Filling fast', color: '#2BBFBA', icon: 'trending-up' };
  }
  if (vibeScore >= 40 && vibeScore < 70 && pace !== 'packed') {
    return { label: 'Tickets available', color: '#5CE8DC', icon: 'clock' };
  }
  if (vibeScore < 40 && peopleCount >= 50) {
    return { label: 'Plenty of seats', color: '#567880', icon: 'trending-down' };
  }
  if (vibeScore < 20) {
    return { label: 'Wide open', color: '#4A6E78', icon: 'moon' };
  }
  return { label: 'Steady', color: '#7BA3AD', icon: 'minus' };
}

export function getDecision(vibeScore: number, peopleCount: number, etaMinutes: number): DecisionInfo {
  const crowdFactor = Math.min(peopleCount / 200, 1);
  const energyFactor = vibeScore / 100;
  const accessFactor = etaMinutes <= 10 ? 1 : etaMinutes <= 20 ? 0.7 : 0.4;

  const goScore = (energyFactor * 0.4 + crowdFactor * 0.3 + accessFactor * 0.3);

  if (goScore >= 0.6) {
    return {
      action: 'GO_NOW',
      label: 'GET TICKETS',
      color: '#060F13',
      bgColor: '#2BBFBA',
      reason: vibeScore >= 80
        ? `${vibeScore}% sold. ${peopleCount}+ going. Moving fast.`
        : `Good availability right now. ${etaMinutes} min away.`,
    };
  }

  if (goScore >= 0.35) {
    return {
      action: 'WAIT',
      label: 'MONITOR',
      color: '#060F13',
      bgColor: '#5CE8DC',
      reason: vibeScore < 50
        ? `Still plenty of tickets. Check back closer to showtime.`
        : `Selling steadily. Worth watching before it moves.`,
    };
  }

  return {
    action: 'SKIP',
    label: 'LOW DEMAND',
    color: '#FFFFFF',
    bgColor: '#CC3428',
    reason: vibeScore < 20
      ? `Very few tickets moving. Low interest so far.`
      : `Low demand for the distance. Better options nearby.`,
  };
}

export function generateLiveActivity(vibeScore: number, peopleCount: number): LiveActivity {
  const recentPeople = Math.max(2, Math.floor(peopleCount * (vibeScore / 100) * 0.15));
  const updatedMinutesAgo = vibeScore >= 70 ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 15) + 3;
  const friendsNearby = vibeScore >= 60 ? Math.floor(Math.random() * 3) + 1 : 0;

  return { recentPeople, updatedMinutesAgo, friendsNearby };
}

export function parseEtaMinutes(eta: string): number {
  const match = eta.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 15;
}

export function getActionCopy(original: string): string {
  const map: Record<string, string> = {
    'Get Tickets': 'Get tickets',
    'Directions': 'Get there',
    'Save Place': 'Save event',
    'Save': 'Save event',
    'Details': 'View details',
  };
  return map[original] ?? original;
}
