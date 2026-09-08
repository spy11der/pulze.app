import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/services/supabase';

const AVATAR_BUCKET = 'avatars';

/**
 * Uploads a profile avatar to Storage under a versioned path and returns its
 * public URL. Reads the local file as base64 and uploads raw bytes so the
 * stored object is a real JPEG (same byte-upload pattern as check-in photos).
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<{ url: string; path: string }> {
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
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Best-effort deletion of a previous avatar object. Only deletes when the
 * object's Storage path belongs to the same user — foreign or unrecognized
 * URLs are ignored silently.
 */
export async function deletePreviousAvatar(userId: string, previousUrl: string | null | undefined): Promise<void> {
  if (!previousUrl) return;
  try {
    const marker = `/object/public/${AVATAR_BUCKET}/`;
    const idx = previousUrl.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(previousUrl.slice(idx + marker.length));
    if (!path.startsWith(`${userId}/`)) return;
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  } catch (e) {
    console.log('[Avatar] Best-effort delete of previous avatar failed:', e);
  }
}
