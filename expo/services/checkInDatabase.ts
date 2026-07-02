import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { incrementVenueCheckInCount } from '@/services/checkInCounts';

const DEDUP_CACHE_KEY = 'pulze_geofence_dedup';
const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface DedupEntry {
  venueId: string;
  timestamp: number;
}

async function getDedupCache(userId: string): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(`${DEDUP_CACHE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setDedupCache(userId: string, cache: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(`${DEDUP_CACHE_KEY}_${userId}`, JSON.stringify(cache));
}

export async function shouldTriggerCheckIn(userId: string, venueId: string): Promise<boolean> {
  const cache = await getDedupCache(userId);
  const lastTrigger = cache[venueId];
  if (!lastTrigger) return true;
  const elapsed = Date.now() - lastTrigger;
  return elapsed >= DEDUP_WINDOW_MS;
}

export async function recordGeofenceTrigger(userId: string, venueId: string): Promise<void> {
  const cache = await getDedupCache(userId);
  cache[venueId] = Date.now();
  await setDedupCache(userId, cache);
}

export interface CheckInRecord {
  id?: string;
  userId: string;
  venueId: string;
  venueName: string;
  neighborhood: string;
  photoUri: string | null;
  photoVisibility: boolean; // true = shared with crew, false = silent
  capturedAt: string;
  quip: string | null;
}

export async function insertCheckIn(record: CheckInRecord): Promise<string | null> {
  try {
    const checkInId = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase.from('check_ins').insert({
      id: checkInId,
      user_id: record.userId,
      venue_id: record.venueId,
      venue_name: record.venueName,
      neighborhood: record.neighborhood,
      photo_url: record.photoUri ?? null,
      photo_visibility: record.photoVisibility,
      quip: record.quip ?? null,
      captured_at: record.capturedAt,
    } as any);

    if (error) {
      console.log('[CheckIn DB] Insert error:', error.message);
    } else {
      console.log('[CheckIn DB] Inserted check-in:', checkInId);
    }

    // Always cache locally so the crew feed has immediate access
    await storeLocalCheckIn(record, checkInId);

    // Increment venue check-in count
    if (record.venueId) {
      void incrementVenueCheckInCount(record.venueId);
    }

    return checkInId;
  } catch (e) {
    console.log('[CheckIn DB] Exception, storing locally:', e);
    const checkInId = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await storeLocalCheckIn(record, checkInId);
    // Increment venue check-in count
    if (record.venueId) {
      void incrementVenueCheckInCount(record.venueId);
    }
    return checkInId;
  }
}

async function storeLocalCheckIn(record: CheckInRecord, id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('pulze_local_checkins');
    const checkins: (CheckInRecord & { id: string })[] = raw ? JSON.parse(raw) : [];
    checkins.push({ ...record, id });
    await AsyncStorage.setItem('pulze_local_checkins', JSON.stringify(checkins));
    console.log('[CheckIn DB] Stored locally:', id);
  } catch (e) {
    console.log('[CheckIn DB] Local storage error:', e);
  }
}

export async function getLocalCheckIns(): Promise<(CheckInRecord & { id: string })[]> {
  try {
    const raw = await AsyncStorage.getItem('pulze_local_checkins');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
