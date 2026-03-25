export type UrgencyLabel = 'Peak now' | 'Filling fast' | 'Best in next 30 min' | 'Crowd dropping' | 'Steady' | 'Quiet spot';

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
    return { label: 'Peak now', color: '#E8564A', icon: 'flame' };
  }
  if (vibeScore >= 70 && peopleCount >= 80) {
    return { label: 'Filling fast', color: '#E8A830', icon: 'trending-up' };
  }
  if (vibeScore >= 40 && vibeScore < 70 && pace !== 'packed') {
    return { label: 'Best in next 30 min', color: '#4EBE7A', icon: 'clock' };
  }
  if (vibeScore < 40 && peopleCount >= 50) {
    return { label: 'Crowd dropping', color: '#6AADCC', icon: 'trending-down' };
  }
  if (vibeScore < 20) {
    return { label: 'Quiet spot', color: '#567880', icon: 'moon' };
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
      label: 'GO NOW',
      color: '#FFFFFF',
      bgColor: '#2EAD6A',
      reason: vibeScore >= 80
        ? `Energy at ${vibeScore}. ${peopleCount}+ people. This is the move.`
        : `Good energy right now. ${etaMinutes} min away. Worth the trip.`,
    };
  }

  if (goScore >= 0.35) {
    return {
      action: 'WAIT',
      label: 'WAIT',
      color: '#1A1A1A',
      bgColor: '#F0C030',
      reason: vibeScore < 50
        ? `Energy still building. Check back in 30 min for better timing.`
        : `Crowd is moderate. Could peak soon — monitor before heading out.`,
    };
  }

  return {
    action: 'SKIP',
    label: 'SKIP',
    color: '#FFFFFF',
    bgColor: '#D04040',
    reason: vibeScore < 20
      ? `Very quiet right now. Not much happening.`
      : `Low activity for the distance. Better options nearby.`,
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
    'Get Tickets': 'Lock in spot',
    'Directions': 'Get there now',
    'Save Place': 'Save this spot',
    'Save': 'Save this spot',
    'Details': 'Full details',
  };
  return map[original] ?? original;
}
