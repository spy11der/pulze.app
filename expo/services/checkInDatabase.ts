import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/services/supabase';
import { submitCheckInVerification, type CheckInFix } from '@/services/checkInVerification';

const DEDUP_CACHE_KEY = 'pulze_geofence_dedup';
const DEDUP_WINDOW_MS = 15 * 60 * 1000;
const LOCAL_CHECKINS_KEY = 'pulze_local_checkins';

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
  return Date.now() - lastTrigger >= DEDUP_WINDOW_MS;
}

export async function recordGeofenceTrigger(userId: string, venueId: string): Promise<void> {
  const cache = await getDedupCache(userId);
  cache[venueId] = Date.now();
  await setDedupCache(userId, cache);
}

export interface CheckInRecord {
  id?: string;
  userId: string;
  venueId: string; // real Supabase UUID preferred; 'v-XXX' legacy ids still resolved
  venueName: string;
  neighborhood: string;
  photoUri: string | null;
  photoVisibility: boolean;
  capturedAt: string;
  quip: string | null;
  /**
   * The app's own id for this check-in, kept across retries. The server
   * refuses a second check-in with the same id, so a retry after a dropped
   * connection can never create a duplicate.
   */
  clientRef?: string;
  /** Set once the photo is uploaded, so a retry reuses it instead of uploading again. */
  uploadedPhotoPath?: string;
}

export type CheckInSyncStatus = 'synced' | 'pending' | 'failed';
export interface CheckInResult {
  id: string;
  status: CheckInSyncStatus;
  error?: string;
}

// What's actually stored locally — includes sync state and, if a photo was
// already uploaded during a prior attempt, its Storage path (so a retry
// doesn't re-upload and orphan a second copy).
interface LocalCheckInEntry extends CheckInRecord {
  id: string;
  syncStatus: CheckInSyncStatus;
  uploadedPhotoPath?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveRealVenueId(venueId: string): Promise<string | null> {
  if (UUID_RE.test(venueId)) return venueId;
  const { data, error } = await supabase
    .from('venues')
    .select('id')
    .eq('legacy_mock_id', venueId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

async function uploadCheckInPhoto(userId: string, localUri: string): Promise<{ path: string }> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('check-in-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  // Store the raw object path in check_ins.photo_url — buckets are
  // private, so getPublicUrl() would return a URL that 403s. Read-side
  // code signs the path per-request.
  return { path };
}

async function deleteUploadedPhoto(path: string): Promise<void> {
  try {
    await supabase.storage.from('check-in-photos').remove([path]);
  } catch (e) {
    console.log('[CheckIn DB] Failed to clean up orphaned photo:', e);
  }
}

/**
 * locationFix: a reading started when the user tapped to check in. It is used
 * only if this call creates the check-in on the server right now; a check-in
 * queued offline and uploaded later is never verified (a late upload is not
 * fresh evidence of presence), so the retry path passes none.
 */
export async function insertCheckIn(
  input: CheckInRecord & { locationFix?: Promise<CheckInFix | null> },
): Promise<CheckInResult> {
  const { locationFix, ...given } = input;
  const record: CheckInRecord = { ...given, clientRef: given.clientRef ?? Crypto.randomUUID() };
  const localId = record.clientRef as string;

  let realVenueId: string | null;
  try {
    realVenueId = await resolveRealVenueId(record.venueId);
  } catch (e) {
    await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'pending' });
    return { id: localId, status: 'pending', error: 'Offline — venue lookup failed, queued for retry' };
  }

  if (!realVenueId) {
    await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'failed' });
    return { id: localId, status: 'failed', error: 'Venue not recognized' };
  }

  let photoPath: string | undefined = record.uploadedPhotoPath;
  if (record.photoUri && !photoPath) {
    try {
      const uploaded = await uploadCheckInPhoto(record.userId, record.photoUri);
      photoPath = uploaded.path;
    } catch (e) {
      await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'pending' });
      return { id: localId, status: 'pending', error: 'Photo upload failed — queued for retry' };
    }
  }

  try {
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: record.userId,
        venue_id: realVenueId,
        photo_url: photoPath ?? null,
        caption: record.quip,
        visibility: record.photoVisibility ? 'public' : 'private',
        client_ref: record.clientRef,
      } as any)
      .select('id')
      .single();

    if (error && /check_in_already_recorded/.test(error.message)) {
      // A retry of a check-in the server already has (the first attempt's
      // response was lost). Not a failure: adopt the existing row. It is NOT
      // verified now: a late upload is not fresh evidence of presence.
      const { data: existing } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', record.userId)
        .eq('client_ref' as any, record.clientRef as string)
        .maybeSingle();
      if (existing) {
        const id = (existing as { id: string }).id;
        await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'synced', uploadedPhotoPath: photoPath });
        return { id, status: 'synced' };
      }
    }

    if (error) {
      // Confirmed failure (server responded, rejected it) — the photo is
      // now orphaned, safe to clean up immediately.
      if (photoPath) await deleteUploadedPhoto(photoPath);
      await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'failed', uploadedPhotoPath: undefined });
      if (/check_in_duplicate/.test(error.message)) {
        return { id: localId, status: 'failed', error: 'You checked in here a few minutes ago.' };
      }
      return { id: localId, status: 'failed', error: 'The check-in could not be saved. Try again.' };
    }

    // The generated Supabase types don't cover this table — `.insert(as any)`
    // resolves the select result to `never`, so cast the returned row.
    const inserted = data as { id: string };
    await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'synced', uploadedPhotoPath: photoPath });
    if (locationFix) {
      // Finishes in the background; the server rejects it if it arrives late.
      void locationFix.then((fix) => submitCheckInVerification(inserted.id, fix));
    }
    return { id: inserted.id, status: 'synced' };
  } catch (e) {
    // Ambiguous — network dropped between request and response, insert may
    // have actually succeeded server-side. Do NOT delete the photo here;
    // an automatic delete could remove a photo a successful check-in is
    // now using. Leave it — retryPendingCheckIns will re-check on next attempt.
    await storeLocalCheckIn({ ...record, id: localId, syncStatus: 'pending', uploadedPhotoPath: photoPath });
    return { id: localId, status: 'pending', error: 'Network error — queued for retry' };
  }
}

async function storeLocalCheckIn(entry: LocalCheckInEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CHECKINS_KEY);
    const checkins: LocalCheckInEntry[] = raw ? JSON.parse(raw) : [];
    const idx = checkins.findIndex((c) => c.id === entry.id);
    if (idx >= 0) checkins[idx] = entry;
    else checkins.push(entry);
    await AsyncStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(checkins));
  } catch (e) {
    console.log('[CheckIn DB] Local storage error:', e);
  }
}

export async function getLocalCheckIns(): Promise<LocalCheckInEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CHECKINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Actual retry mechanism — re-attempts every locally queued pending/failed
// check-in. Call this from somewhere that runs periodically while the app
// is open (wired into crew.tsx's focus effect below). This was previously
// designed but never implemented; it now is.
export async function retryPendingCheckIns(): Promise<void> {
  const all = await getLocalCheckIns();
  // Only check-ins that never reached the server. One the server rejected
  // ('failed': unknown venue, duplicate) would be rejected again; it stays in
  // local storage rather than being retried forever or silently discarded.
  const outstanding = all.filter((c) => c.syncStatus === 'pending');
  if (outstanding.length === 0) return;

  for (const entry of outstanding) {
    const result = await insertCheckIn({
      userId: entry.userId,
      venueId: entry.venueId,
      venueName: entry.venueName,
      neighborhood: entry.neighborhood,
      photoUri: entry.photoUri,
      photoVisibility: entry.photoVisibility,
      capturedAt: entry.capturedAt,
      quip: entry.quip,
      // Same identity and photo as the first attempt: no duplicate row, no second upload.
      clientRef: entry.clientRef ?? (UUID_RE.test(entry.id) ? entry.id : undefined),
      uploadedPhotoPath: entry.uploadedPhotoPath,
    });
    console.log('[CheckIn DB] Retry result for', entry.id, ':', result.status);

    // Entries from before client refs keep their old local id; drop the stale one.
    if (result.status === 'synced' && !UUID_RE.test(entry.id)) {
      await removeLocalCheckIn(entry.id);
    }
  }
}

async function removeLocalCheckIn(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CHECKINS_KEY);
    const checkins: LocalCheckInEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = checkins.filter((c) => c.id !== id);
    await AsyncStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.log('[CheckIn DB] Failed to remove stale local check-in:', e);
  }
}
