import AsyncStorage from '@react-native-async-storage/async-storage';

const COUNTS_KEY = 'pulze_venue_checkin_counts';

async function getCounts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCounts(counts: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
}

export async function incrementVenueCheckInCount(venueId: string): Promise<number> {
  const counts = await getCounts();
  counts[venueId] = (counts[venueId] ?? 0) + 1;
  await saveCounts(counts);
  return counts[venueId];
}

export async function getVenueCheckInCount(venueId: string): Promise<number> {
  const counts = await getCounts();
  return counts[venueId] ?? 0;
}
