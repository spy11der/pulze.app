import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import createContextHook from '@nkzw/create-context-hook';

import {
  getAllVibes,
  insertVibe,
  deleteVibe,
  getAllSavedSpots,
  insertSavedSpot,
  deleteSavedSpot,
  isSpotSaved,
  getVibeCount,
  getSavedSpotCount,
} from '@/services/database';

const PREFS_KEY = 'pulze_user_prefs';

export interface UserPreferences {
  defaultPrivacy: 'public' | 'friends' | 'private';
  locationVisibility: 'precise' | 'area' | 'hidden';
  nearbyAlerts: boolean;
  savedPaceMix: 'quiet' | 'busy' | 'mixed';
}

const DEFAULT_PREFS: UserPreferences = {
  defaultPrivacy: 'friends',
  locationVisibility: 'area',
  nearbyAlerts: true,
  savedPaceMix: 'mixed',
};

async function loadPreferences(): Promise<UserPreferences> {
  try {
    const stored = await SecureStore.getItemAsync(PREFS_KEY);
    if (stored) {
      console.log('[SecureStore] Loaded user preferences');
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.log('[SecureStore] Error loading preferences:', e);
  }
  return DEFAULT_PREFS;
}

async function savePreferences(prefs: UserPreferences): Promise<UserPreferences> {
  console.log('[SecureStore] Saving user preferences:', prefs);
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}

export const [DataProvider, useData] = createContextHook(() => {
  const queryClient = useQueryClient();

  const isWeb = Platform.OS === 'web';

  const vibesQuery = useQuery({
    queryKey: ['vibes'],
    queryFn: getAllVibes,
    enabled: !isWeb,
  });

  const savedSpotsQuery = useQuery({
    queryKey: ['savedSpots'],
    queryFn: getAllSavedSpots,
    enabled: !isWeb,
  });

  const prefsQuery = useQuery({
    queryKey: ['userPrefs'],
    queryFn: loadPreferences,
  });

  const vibeCountQuery = useQuery({
    queryKey: ['vibeCount'],
    queryFn: getVibeCount,
    enabled: !isWeb,
  });

  const spotCountQuery = useQuery({
    queryKey: ['spotCount'],
    queryFn: getSavedSpotCount,
    enabled: !isWeb,
  });

  const addVibeMutation = useMutation({
    mutationFn: insertVibe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vibes'] });
      void queryClient.invalidateQueries({ queryKey: ['vibeCount'] });
    },
  });

  const removeVibeMutation = useMutation({
    mutationFn: deleteVibe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vibes'] });
      void queryClient.invalidateQueries({ queryKey: ['vibeCount'] });
    },
  });

  const addSpotMutation = useMutation({
    mutationFn: insertSavedSpot,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['savedSpots'] });
      void queryClient.invalidateQueries({ queryKey: ['spotCount'] });
    },
  });

  const removeSpotMutation = useMutation({
    mutationFn: deleteSavedSpot,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['savedSpots'] });
      void queryClient.invalidateQueries({ queryKey: ['spotCount'] });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['userPrefs'], data);
    },
  });

  const preferences = prefsQuery.data ?? DEFAULT_PREFS;

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const updated = { ...preferences, [key]: value };
      updatePrefsMutation.mutate(updated);
    },
    [preferences, updatePrefsMutation]
  );

  const checkSpotSaved = useCallback(async (venueId: string): Promise<boolean> => {
    return isSpotSaved(venueId);
  }, []);

  return useMemo(
    () => ({
      vibes: vibesQuery.data ?? [],
      savedSpots: savedSpotsQuery.data ?? [],
      preferences,
      vibeCount: vibeCountQuery.data ?? 0,
      spotCount: spotCountQuery.data ?? 0,
      isLoading: vibesQuery.isLoading || savedSpotsQuery.isLoading || prefsQuery.isLoading,
      addVibe: addVibeMutation.mutate,
      isAddingVibe: addVibeMutation.isPending,
      removeVibe: removeVibeMutation.mutate,
      addSpot: addSpotMutation.mutate,
      isAddingSpot: addSpotMutation.isPending,
      removeSpot: removeSpotMutation.mutate,
      updatePreference,
      checkSpotSaved,
    }),
    [
      vibesQuery.data,
      savedSpotsQuery.data,
      preferences,
      vibeCountQuery.data,
      spotCountQuery.data,
      vibesQuery.isLoading,
      savedSpotsQuery.isLoading,
      prefsQuery.isLoading,
      addVibeMutation.mutate,
      addVibeMutation.isPending,
      removeVibeMutation.mutate,
      addSpotMutation.mutate,
      addSpotMutation.isPending,
      removeSpotMutation.mutate,
      updatePreference,
      checkSpotSaved,
    ]
  );
});
