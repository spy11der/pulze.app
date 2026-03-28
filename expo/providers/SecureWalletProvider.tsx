import { useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

export type DocumentType = 'drivers_license' | 'state_id' | 'passport' | 'other';

export interface SecureDocument {
  id: string;
  type: DocumentType;
  label: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  dateOfBirth: string;
  expirationDate: string;
  issuingState: string;
  addedAt: string;
}

const WALLET_KEY = 'pulze_secure_wallet';

async function loadDocuments(): Promise<SecureDocument[]> {
  try {
    const stored = await SecureStore.getItemAsync(WALLET_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SecureDocument[];
      console.log('[SecureWallet] Loaded', parsed.length, 'documents');
      return parsed;
    }
  } catch (e) {
    console.log('[SecureWallet] Error loading documents:', e);
  }
  return [];
}

async function saveDocuments(docs: SecureDocument[]): Promise<SecureDocument[]> {
  await SecureStore.setItemAsync(WALLET_KEY, JSON.stringify(docs));
  console.log('[SecureWallet] Saved', docs.length, 'documents');
  return docs;
}

export const [SecureWalletProvider, useSecureWallet] = createContextHook(() => {
  const queryClient = useQueryClient();

  const docsQuery = useQuery({
    queryKey: ['secure_wallet'],
    queryFn: loadDocuments,
  });

  const documents = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const addMutation = useMutation({
    mutationFn: async (doc: Omit<SecureDocument, 'id' | 'addedAt'>) => {
      const current = await loadDocuments();
      const newDoc: SecureDocument = {
        ...doc,
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        addedAt: new Date().toISOString(),
      };
      const updated = [...current, newDoc];
      await saveDocuments(updated);
      return newDoc;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['secure_wallet'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (docId: string) => {
      const current = await loadDocuments();
      const updated = current.filter((d) => d.id !== docId);
      await saveDocuments(updated);
      console.log('[SecureWallet] Removed document:', docId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['secure_wallet'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await SecureStore.deleteItemAsync(WALLET_KEY);
      console.log('[SecureWallet] Cleared all documents');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['secure_wallet'] });
    },
  });

  const addDocument = useCallback(
    (doc: Omit<SecureDocument, 'id' | 'addedAt'>) => addMutation.mutateAsync(doc),
    [addMutation]
  );

  const removeDocument = useCallback(
    (docId: string) => removeMutation.mutateAsync(docId),
    [removeMutation]
  );

  const clearAll = useCallback(() => clearAllMutation.mutateAsync(), [clearAllMutation]);

  return useMemo(
    () => ({
      documents,
      isLoading: docsQuery.isLoading,
      addDocument,
      removeDocument,
      clearAll,
      isAdding: addMutation.isPending,
      isRemoving: removeMutation.isPending,
    }),
    [documents, docsQuery.isLoading, addDocument, removeDocument, clearAll, addMutation.isPending, removeMutation.isPending]
  );
});
