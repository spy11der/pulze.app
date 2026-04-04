import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useSecureWallet, type SecureDocument } from '@/providers/SecureWalletProvider';

const AGE_VERIFIED_KEY = 'pulze_age_verified_v1';

interface AgeVerificationState {
  verified: boolean;
  verifiedAt: string | null;
  documentId: string | null;
  documentType: string | null;
}

const DEFAULT_STATE: AgeVerificationState = {
  verified: false,
  verifiedAt: null,
  documentId: null,
  documentType: null,
};

async function loadVerification(): Promise<AgeVerificationState> {
  try {
    const stored = await AsyncStorage.getItem(AGE_VERIFIED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AgeVerificationState;
      console.log('[AgeVerification] Loaded state:', parsed.verified ? 'verified' : 'not verified');
      return parsed;
    }
  } catch (e) {
    console.log('[AgeVerification] Error loading state:', e);
  }
  return DEFAULT_STATE;
}

async function saveVerification(state: AgeVerificationState): Promise<AgeVerificationState> {
  await AsyncStorage.setItem(AGE_VERIFIED_KEY, JSON.stringify(state));
  console.log('[AgeVerification] Saved state:', state.verified ? 'verified' : 'cleared');
  return state;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function findVerifiableDocument(documents: SecureDocument[]): SecureDocument | null {
  const validTypes = ['drivers_license', 'state_id', 'passport'];
  for (const doc of documents) {
    if (validTypes.includes(doc.type) && doc.dateOfBirth) {
      const expDate = new Date(doc.expirationDate);
      if (expDate > new Date()) {
        return doc;
      }
    }
  }
  for (const doc of documents) {
    if (validTypes.includes(doc.type) && doc.dateOfBirth) {
      return doc;
    }
  }
  return null;
}

export const [AgeVerificationProvider, useAgeVerification] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { documents } = useSecureWallet();

  const verificationQuery = useQuery({
    queryKey: ['age_verification'],
    queryFn: loadVerification,
  });

  const state = useMemo(() => verificationQuery.data ?? DEFAULT_STATE, [verificationQuery.data]);

  const verifyMutation = useMutation({
    mutationFn: async (doc: SecureDocument) => {
      const age = calculateAge(doc.dateOfBirth);
      console.log('[AgeVerification] Calculated age:', age, 'from DOB:', doc.dateOfBirth);
      if (age >= 21) {
        const newState: AgeVerificationState = {
          verified: true,
          verifiedAt: new Date().toISOString(),
          documentId: doc.id,
          documentType: doc.label,
        };
        return saveVerification(newState);
      }
      throw new Error('User is under 21');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['age_verification'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      return saveVerification(DEFAULT_STATE);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['age_verification'] });
    },
  });

  const verifiableDocument = useMemo(() => findVerifiableDocument(documents), [documents]);

  const canVerify = useMemo(() => {
    if (state.verified) return false;
    return verifiableDocument !== null;
  }, [state.verified, verifiableDocument]);

  const verify = useCallback(async () => {
    if (!verifiableDocument) {
      throw new Error('No valid document found');
    }
    return verifyMutation.mutateAsync(verifiableDocument);
  }, [verifiableDocument, verifyMutation]);

  const clearVerification = useCallback(() => clearMutation.mutateAsync(), [clearMutation]);

  return useMemo(() => ({
    isVerified: state.verified,
    verifiedAt: state.verifiedAt,
    documentType: state.documentType,
    canVerify,
    verifiableDocument,
    verify,
    clearVerification,
    isVerifying: verifyMutation.isPending,
    isLoading: verificationQuery.isLoading,
    verifyError: verifyMutation.error,
  }), [
    state.verified,
    state.verifiedAt,
    state.documentType,
    canVerify,
    verifiableDocument,
    verify,
    clearVerification,
    verifyMutation.isPending,
    verificationQuery.isLoading,
    verifyMutation.error,
  ]);
});
