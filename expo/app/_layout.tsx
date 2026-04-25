import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/error-boundary';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { BiometricAuthProvider } from '@/providers/BiometricAuthProvider';
import { DataProvider } from '@/providers/DataProvider';
import { FavoritesProvider } from '@/providers/FavoritesProvider';
import { SecureWalletProvider } from '@/providers/SecureWalletProvider';
import { AgeVerificationProvider } from '@/providers/AgeVerificationProvider';
import { WalletPassProvider } from '@/providers/WalletPassProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { LockScreen } from '@/components/LockScreen';
import { PulseSplash } from '@/components/PulseSplash';
import { CityWelcome } from '@/components/CityWelcome';
import { AuthScreen } from '@/components/AuthScreen';

SplashScreen.preventAutoHideAsync().catch(() => {
  console.log('[SplashScreen] preventAutoHideAsync failed');
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="friends" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="qr-code" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="ticketing" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="secure-wallet" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="verify-identity/index" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="ticket-pass" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="my-tickets" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="wallet-pass" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
      <Stack.Screen name="terms-of-service" options={{ presentation: 'card' }} />
      <Stack.Screen name="location-selector" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="venue-detail" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="event-detail" options={{ presentation: 'card', headerShown: false }} />
    </Stack>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [splashDone, setSplashDone] = useState<boolean>(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (authLoading && !splashDone) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PulseSplash onComplete={handleSplashComplete} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {!splashDone && <PulseSplash onComplete={handleSplashComplete} />}
        {splashDone && <AuthScreen />}
      </>
    );
  }

  return (
    <DataProvider>
      <FavoritesProvider>
      <SecureWalletProvider>
      <AgeVerificationProvider>
      <WalletPassProvider>
      <BiometricAuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootLayoutNav />
        <LockScreen />
        {splashDone && (
          <CityWelcome
            cityName="Denver"
            cityTagline="10 live spots tonight — St. Patrick's weekend energy"
          />
        )}
        {!splashDone && <PulseSplash onComplete={handleSplashComplete} />}
      </BiometricAuthProvider>
      </WalletPassProvider>
      </AgeVerificationProvider>
      </SecureWalletProvider>
      </FavoritesProvider>
    </DataProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </AppErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
