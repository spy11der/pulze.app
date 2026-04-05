import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

export type WalletType = 'apple' | 'google';

export interface WalletPass {
  id: string;
  purchaseId: string;
  eventTitle: string;
  venueName: string;
  date: string;
  tierName: string;
  quantity: number;
  walletType: WalletType;
  addedAt: string;
  verified21: boolean;
}

const WALLET_PASSES_KEY = 'pulze_wallet_passes_v1';

async function loadPasses(): Promise<WalletPass[]> {
  try {
    const stored = await AsyncStorage.getItem(WALLET_PASSES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WalletPass[];
      console.log('[WalletPass] Loaded', parsed.length, 'passes');
      return parsed;
    }
  } catch (e) {
    console.log('[WalletPass] Error loading passes:', e);
  }
  return [];
}

async function savePasses(passes: WalletPass[]): Promise<WalletPass[]> {
  await AsyncStorage.setItem(WALLET_PASSES_KEY, JSON.stringify(passes));
  console.log('[WalletPass] Saved', passes.length, 'passes');
  return passes;
}

export const [WalletPassProvider, useWalletPass] = createContextHook(() => {
  const queryClient = useQueryClient();

  const passesQuery = useQuery({
    queryKey: ['wallet_passes'],
    queryFn: loadPasses,
  });

  const passes = useMemo(() => passesQuery.data ?? [], [passesQuery.data]);

  const addMutation = useMutation({
    mutationFn: async (pass: Omit<WalletPass, 'id' | 'addedAt'>) => {
      const current = await loadPasses();
      const existing = current.find(
        (p) => p.purchaseId === pass.purchaseId && p.walletType === pass.walletType
      );
      if (existing) {
        console.log('[WalletPass] Pass already exists for this purchase + wallet type');
        return existing;
      }
      const newPass: WalletPass = {
        ...pass,
        id: `wp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        addedAt: new Date().toISOString(),
      };
      const updated = [...current, newPass];
      await savePasses(updated);
      return newPass;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet_passes'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (passId: string) => {
      const current = await loadPasses();
      const updated = current.filter((p) => p.id !== passId);
      await savePasses(updated);
      console.log('[WalletPass] Removed pass:', passId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet_passes'] });
    },
  });

  const addPass = useCallback(
    (pass: Omit<WalletPass, 'id' | 'addedAt'>) => addMutation.mutateAsync(pass),
    [addMutation]
  );

  const removePass = useCallback(
    (passId: string) => removeMutation.mutateAsync(passId),
    [removeMutation]
  );

  const getPassForPurchase = useCallback(
    (purchaseId: string, walletType: WalletType): WalletPass | null => {
      return passes.find((p) => p.purchaseId === purchaseId && p.walletType === walletType) ?? null;
    },
    [passes]
  );

  const hasPassForPurchase = useCallback(
    (purchaseId: string): { apple: boolean; google: boolean } => {
      return {
        apple: passes.some((p) => p.purchaseId === purchaseId && p.walletType === 'apple'),
        google: passes.some((p) => p.purchaseId === purchaseId && p.walletType === 'google'),
      };
    },
    [passes]
  );

  return useMemo(
    () => ({
      passes,
      isLoading: passesQuery.isLoading,
      addPass,
      removePass,
      getPassForPurchase,
      hasPassForPurchase,
      isAdding: addMutation.isPending,
    }),
    [passes, passesQuery.isLoading, addPass, removePass, getPassForPurchase, hasPassForPurchase, addMutation.isPending]
  );
});
