import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import createContextHook from '@nkzw/create-context-hook';

const BIOMETRIC_ENABLED_KEY = 'pulze_biometric_enabled';

export const [BiometricAuthProvider, useBiometricAuth] = createContextHook(() => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasCheckedInitial = useRef<boolean>(false);

  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (Platform.OS === 'web') {
        setBiometricAvailable(false);
        setIsLoading(false);
        return;
      }

      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setBiometricAvailable(available);

        if (available) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }
        }

        const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        const enabled = stored === 'true';
        setBiometricEnabled(enabled);

        if (enabled && available && !hasCheckedInitial.current) {
          setIsLocked(true);
          hasCheckedInitial.current = true;
        }
      } catch (e) {
        console.log('Biometric check error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    void checkBiometricSupport();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        if (biometricEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [biometricEnabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setIsLocked(false);
      return true;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Pulze',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      console.log('Auth failed:', result.error);
      return false;
    } catch (e) {
      console.log('Auth error:', e);
      return false;
    }
  }, []);

  const toggleBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const newValue = !biometricEnabled;

    if (newValue) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) return false;
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(newValue));
    setBiometricEnabled(newValue);

    if (!newValue) {
      setIsLocked(false);
    }

    return true;
  }, [biometricEnabled]);

  return useMemo(() => ({
    isLocked,
    biometricEnabled,
    biometricAvailable,
    biometricType,
    isLoading,
    authenticate,
    toggleBiometric,
  }), [isLocked, biometricEnabled, biometricAvailable, biometricType, isLoading, authenticate, toggleBiometric]);
});
