import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

import { supabase } from '@/services/supabase';
import { useAuth } from '@/providers/AuthProvider';

export interface FavoriteItem {
  id: string;
  type: 'event' | 'venue';
  name: string;
  timestamp: string;
}

// AsyncStorage key from the pre-Supabase persistence model. Read once
// per install and migrated into user_venue_saves; then cleared. Never
// written to again.
const LEGACY_STORAGE_KEY = 'pulze_favorites_v1';

// Per-user read cache so cold starts don't flash empty while the
// server round-trip is in flight. Written on every successful fetch,
// keyed by user id so account switches don't leak state.
const CACHE_KEY_PREFIX = 'pulze_saves_cache_v1:';
function cacheKeyFor(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchServerFavorites(userId: string): Promise<FavoriteItem[]> {
  // Auto-embed venue name via the FK user_venue_saves.venue_id → venues.id.
  const { data, error } = await supabase
    .from('user_venue_saves')
    .select('venue_id, created_at, venues(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.log('[Favorites] Server fetch error:', error.message);
    throw error;
  }
  return (data as any[] | null ?? []).map((r) => ({
    id: r.venue_id as string,
    type: 'venue' as const,
    // venues is auto-embedded — an array in older PostgREST versions,
    // an object in newer ones. Handle both defensively.
    name: (Array.isArray(r.venues) ? r.venues[0]?.name : r.venues?.name) ?? '',
    timestamp: (r.created_at as string | null) ?? new Date().toISOString(),
  }));
}

// One-shot best-effort migration of the legacy AsyncStorage favorites
// list into user_venue_saves. Returns true if any legacy data was
// consumed (successfully migrated OR intentionally dropped) so callers
// can invalidate the server-favorites query. Idempotent — the UNIQUE
// (user_id, venue_id) constraint plus ON CONFLICT DO NOTHING (via
// supabase-js upsert with ignoreDuplicates) makes re-runs harmless.
// The legacy key is only removed on success — a network failure leaves
// it in place so the next mount retries.
async function migrateLegacyLocalFavorites(userId: string): Promise<boolean> {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return false;
  }
  if (!stored) return false;

  let items: unknown = [];
  try {
    items = JSON.parse(stored);
  } catch {
    // Corrupt payload — drop it, nothing recoverable.
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  }
  if (!Array.isArray(items)) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  }

  const venueIds: string[] = [];
  for (const raw of items) {
    if (
      raw && typeof raw === 'object' &&
      (raw as any).type === 'venue' &&
      typeof (raw as any).id === 'string'
    ) {
      venueIds.push((raw as any).id);
    }
  }
  if (venueIds.length === 0) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  }

  const realIds = venueIds.filter((id) => UUID_RE.test(id));
  const legacyIds = venueIds.filter((id) => !UUID_RE.test(id));
  const resolvedIds: string[] = [...realIds];

  if (legacyIds.length > 0) {
    const { data, error } = await supabase
      .from('venues')
      .select('id, legacy_mock_id')
      .in('legacy_mock_id', legacyIds);
    if (error) {
      console.log('[Favorites] Legacy migration lookup error:', error.message);
      return false; // leave legacy key in place — retry next mount
    }
    const idMap = new Map<string, string>();
    for (const row of (data as any[] | null ?? [])) {
      if (typeof row?.legacy_mock_id === 'string' && typeof row?.id === 'string') {
        idMap.set(row.legacy_mock_id, row.id);
      }
    }
    for (const lid of legacyIds) {
      const uuid = idMap.get(lid);
      if (uuid) resolvedIds.push(uuid);
    }
  }

  const uniqueIds = Array.from(new Set(resolvedIds));
  if (uniqueIds.length > 0) {
    const rows = uniqueIds.map((venue_id) => ({ user_id: userId, venue_id }));
    // postgrest-js v2.116+ requires every table in the Database schema
    // to declare a Relationships property to satisfy GenericTable; the
    // shared types/supabase.ts predates that constraint on most tables,
    // so insert payloads resolve to `never` schema-wide until that's
    // regenerated in a separate pass.
    const { error } = await supabase
      .from('user_venue_saves')
      .upsert(rows as any, { onConflict: 'user_id,venue_id', ignoreDuplicates: true });
    if (error) {
      console.log('[Favorites] Legacy migration insert error:', error.message);
      return false; // leave legacy key in place — retry next mount
    }
  }

  // Success (including the "everything unresolvable and dropped" case).
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  return true;
}

type ToggleVars = { venueId: string; wasSaved: boolean; venueName: string };
type ToggleContext = { previous: FavoriteItem[] };

export const [FavoritesProvider, useFavorites] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Prime the query cache from the per-user AsyncStorage snapshot on
  // first mount, so returning users see their saves instantly before
  // the server round-trip lands. Only seeds if the query doesn't
  // already have data.
  const primedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || primedRef.current === userId) return;
    primedRef.current = userId;
    void AsyncStorage.getItem(cacheKeyFor(userId))
      .then((raw) => {
        if (!raw) return;
        try {
          const cached = JSON.parse(raw);
          if (!Array.isArray(cached)) return;
          if (queryClient.getQueryData(['favorites', userId]) === undefined) {
            queryClient.setQueryData(['favorites', userId], cached);
          }
        } catch {}
      })
      .catch(() => {});
  }, [userId, queryClient]);

  // One-shot legacy-favorites migration. On success, invalidate the
  // server query so any newly-migrated rows show up immediately.
  const migrationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || migrationRef.current === userId) return;
    migrationRef.current = userId;
    void migrateLegacyLocalFavorites(userId).then((migrated) => {
      if (migrated) {
        void queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      }
    });
  }, [userId, queryClient]);

  const favoritesQuery = useQuery<FavoriteItem[]>({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const result = await fetchServerFavorites(userId);
      // Write-through per-user cache for next cold start.
      try {
        await AsyncStorage.setItem(cacheKeyFor(userId), JSON.stringify(result));
      } catch {}
      return result;
    },
  });

  const rawFavorites = favoritesQuery.data;
  const prevRef = useRef<FavoriteItem[]>([]);
  const favorites = useMemo(() => {
    const next = rawFavorites ?? [];
    if (
      prevRef.current.length === next.length &&
      prevRef.current.every((f, i) => f.id === next[i]?.id)
    ) {
      return prevRef.current;
    }
    prevRef.current = next;
    return next;
  }, [rawFavorites]);

  const isFavorited = useCallback(
    (id: string): boolean => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleMutation = useMutation<void, Error, ToggleVars, ToggleContext>({
    mutationFn: async ({ venueId, wasSaved }) => {
      if (!userId) throw new Error('not_authenticated');
      if (wasSaved) {
        const { error } = await supabase
          .from('user_venue_saves')
          .delete()
          .eq('user_id', userId)
          .eq('venue_id', venueId);
        if (error) throw error;
      } else {
        // See fetch-side comment on the schema-wide `never` from missing
        // Relationships on other tables.
        const { error } = await supabase
          .from('user_venue_saves')
          .insert({ user_id: userId, venue_id: venueId } as any);
        // 23505 = unique_violation — this venue is already saved (raced
        // with another device or a double-tap). Treat as success; the
        // desired end state is "saved" either way.
        if (error && (error as any).code !== '23505') throw error;
      }
    },
    onMutate: async ({ venueId, wasSaved, venueName }) => {
      if (!userId) return { previous: [] };
      await queryClient.cancelQueries({ queryKey: ['favorites', userId] });
      const previous = queryClient.getQueryData<FavoriteItem[]>(['favorites', userId]) ?? [];
      const optimistic: FavoriteItem[] = wasSaved
        ? previous.filter((f) => f.id !== venueId)
        : [
            { id: venueId, type: 'venue', name: venueName, timestamp: new Date().toISOString() },
            ...previous,
          ];
      queryClient.setQueryData(['favorites', userId], optimistic);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!userId || !ctx) return;
      queryClient.setQueryData(['favorites', userId], ctx.previous);
    },
    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const toggleFavorite = useCallback(
    (id: string, type: 'event' | 'venue', name: string) => {
      // Only 'venue' has a backing table today (user_venue_saves).
      // Silently ignore other types so the consumer signature can stay
      // the same while non-venue callers do nothing.
      if (type !== 'venue') return;
      const wasSaved = favorites.some((f) => f.id === id);
      toggleMutation.mutate({ venueId: id, wasSaved, venueName: name });
    },
    [favorites, toggleMutation]
  );

  const favoriteEvents = useMemo(
    () => favorites.filter((f) => f.type === 'event'),
    [favorites]
  );

  const favoriteVenues = useMemo(
    () => favorites.filter((f) => f.type === 'venue'),
    [favorites]
  );

  return useMemo(
    () => ({
      favorites,
      favoriteEvents,
      favoriteVenues,
      isFavorited,
      toggleFavorite,
      isLoading: favoritesQuery.isLoading,
    }),
    [favorites, favoriteEvents, favoriteVenues, isFavorited, toggleFavorite, favoritesQuery.isLoading]
  );
});
