import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';

/**
 * Calls onChange whenever one of MY friendships changes (a request arrives,
 * is accepted or removed, a grant changes). The server's row-level security
 * decides which changes reach this device, so no filter is trusted here.
 * Bursts are coalesced; the channel is removed on unmount.
 */
export function useFriendshipChanges(userId: string | undefined, onChange: () => void): void {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`friendships-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_friendships' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback.current(), 300);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
