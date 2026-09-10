import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const checkSpotSaved = useCallback(async (venueId: string): Promise<boolean> => {
    return isSpotSaved(venueId);
  }, []);

  return useMemo(
    () => ({
      vibes: vibesQuery.data ?? [],
      savedSpots: savedSpotsQuery.data ?? [],
      vibeCount: vibeCountQuery.data ?? 0,
      spotCount: spotCountQuery.data ?? 0,
      isLoading: vibesQuery.isLoading || savedSpotsQuery.isLoading,
      addVibe: addVibeMutation.mutate,
      isAddingVibe: addVibeMutation.isPending,
      removeVibe: removeVibeMutation.mutate,
      addSpot: addSpotMutation.mutate,
      isAddingSpot: addSpotMutation.isPending,
      removeSpot: removeSpotMutation.mutate,
      checkSpotSaved,
    }),
    [
      vibesQuery.data,
      savedSpotsQuery.data,
      vibeCountQuery.data,
      spotCountQuery.data,
      vibesQuery.isLoading,
      savedSpotsQuery.isLoading,
      addVibeMutation.mutate,
      addVibeMutation.isPending,
      removeVibeMutation.mutate,
      addSpotMutation.mutate,
      addSpotMutation.isPending,
      removeSpotMutation.mutate,
      checkSpotSaved,
    ]
  );
});
