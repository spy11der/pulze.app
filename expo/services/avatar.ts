import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/services/supabase';
import { extractStoragePath, signedUrlFor } from '@/services/storageUrls';

const AVATAR_BUCKET = 'avatars';

/**
 * Uploads a profile avatar. Returns:
 *   path      — the object path to store in DB (profiles.avatar_url +
 *               auth.users raw_user_meta_data.avatar_url). Buckets are
 *               private, so a raw path is what read-side code signs.
 *   signedUrl — a short-lived signed URL for immediate on-screen display
 *               so the new avatar shows right after upload without a
 *               round trip through the auth-state effect.
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<{ path: string; signedUrl: string | null }> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  const signedUrl = await signedUrlFor(AVATAR_BUCKET, path);
  return { path, signedUrl };
}

/**
 * Best-effort deletion of a previous avatar object. Accepts either a
 * raw path or a legacy Storage URL — extracts the path via the shared
 * helper. Only proceeds if the object's folder matches the user, so a
 * caller passing another user's URL can't nuke it.
 */
export async function deletePreviousAvatar(
  userId: string,
  previousValue: string | null | undefined,
): Promise<void> {
  if (!previousValue) return;
  try {
    const path = extractStoragePath(AVATAR_BUCKET, previousValue);
    if (!path || !path.startsWith(`${userId}/`)) return;
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  } catch (e) {
    console.log('[Avatar] Best-effort delete of previous avatar failed:', e);
  }
}
