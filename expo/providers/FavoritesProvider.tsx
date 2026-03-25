import { useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface FavoriteItem {
  id: string;
  type: 'event' | 'venue';
  name: string;
  timestamp: string;
}

const FAVORITES_KEY = 'pulze_favorites_v1';

async function loadFavorites(): Promise<FavoriteItem[]> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITES_KEY);
    if (stored) {
      console.log('[Favorites] Loaded favorites from storage');
      return JSON.parse(stored) as FavoriteItem[];
    }
  } catch (e) {
    console.log('[Favorites] Error loading favorites:', e);
  }
  return [];
}

async function saveFavorites(items: FavoriteItem[]): Promise<FavoriteItem[]> {
  console.log('[Favorites] Saving', items.length, 'favorites');
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  return items;
}

export const [FavoritesProvider, useFavorites] = createContextHook(() => {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: loadFavorites,
  });

  const saveMutation = useMutation({
    mutationFn: saveFavorites,
    onSuccess: (data) => {
      queryClient.setQueryData(['favorites'], data);
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
    (id: string): boolean => {
      return favorites.some((f) => f.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (id: string, type: 'event' | 'venue', name: string) => {
      const exists = favorites.some((f) => f.id === id);
      let updated: FavoriteItem[];
      if (exists) {
        console.log('[Favorites] Removing favorite:', id);
        updated = favorites.filter((f) => f.id !== id);
      } else {
        console.log('[Favorites] Adding favorite:', id, type, name);
        updated = [...favorites, { id, type, name, timestamp: new Date().toISOString() }];
      }
      saveMutation.mutate(updated);
    },
    [favorites, saveMutation]
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
