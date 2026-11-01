import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/services/supabase';
import { countUnreadNotifications, listNotifications, type AppNotification } from '@/services/notifications';

/**
 * Subscribes to MY notifications (Realtime; RLS decides what arrives) and
 * refreshes on focus, since an event can be missed while the app is in the
 * background. Bursts are coalesced; the channel is removed on unmount.
 */
let instance = 0;

function useNotificationChanges(userId: string | undefined, onChange: () => void, channelName: string) {
  // Tabs stay mounted, so several bells can be alive at once: each needs its
  // own channel name (supabase-js does not share a channel between callers).
  const [suffix] = useState(() => ++instance);
  const cb = useRef(onChange);
  useEffect(() => { cb.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`${channelName}-${userId}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => cb.current(), 300);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, channelName, suffix]);
}

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const reload = useCallback(async () => {
    if (!userId) return;
    const list = await listNotifications();
    if (list === null) {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      return;
    }
    setItems(list);
    setStatus('ready');
  }, [userId]);

  // Focus covers the first load too.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useNotificationChanges(userId, reload, 'notifications-list');
  return { items, setItems, status, reload };
}

/** Unread count for the bell badge. */
export function useUnreadNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const reload = useCallback(async () => {
    if (!userId) return;
    setCount(await countUnreadNotifications());
  }, [userId]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useNotificationChanges(userId, reload, 'notifications-badge');
  return count;
}
