import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/error-boundary';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { BiometricAuthProvider } from '@/providers/BiometricAuthProvider';
import { DataProvider } from '@/providers/DataProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { LockScreen } from '@/components/LockScreen';
import { PulseSplash } from '@/components/PulseSplash';
import { CityWelcome } from '@/components/CityWelcome';
import { AuthScreen } from '@/components/AuthScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
      <Stack.Screen name="checkout" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [splashDone, setSplashDone] = useState<boolean>(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (authLoading) {
    return <PulseSplash onComplete={handleSplashComplete} />;
  }

  if (!isAuthenticated) {
    return (
      <>
        {!splashDone && <PulseSplash onComplete={handleSplashComplete} />}
        {splashDone && <AuthScreen />}
      </>
    );
  }

  return (
    <DataProvider>
      <BiometricAuthProvider>
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
