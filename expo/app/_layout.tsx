import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/error-boundary';
import { WelcomeModal } from '@/components/WelcomeModal';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { BiometricAuthProvider } from '@/providers/BiometricAuthProvider';
import { DataProvider } from '@/providers/DataProvider';
import { FavoritesProvider } from '@/providers/FavoritesProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { TabScrollProvider } from '@/providers/TabScrollProvider';
import { LockScreen } from '@/components/LockScreen';
import { PulseSplash } from '@/components/PulseSplash';
import { CityWelcome } from '@/components/CityWelcome';
import { AuthScreen } from '@/components/AuthScreen';
import { PersistentFloatingTabBar } from '@/components/FloatingTabBar';
import { setupNotificationCategories, registerNotificationResponseHandler } from '@/services/checkInNotifications';
import { startGeofenceMonitoring, stopGeofenceMonitoring, setCurrentUserId } from '@/services/geofence';
import { insertCheckIn } from '@/services/checkInDatabase';

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
      <Stack.Screen name="checkin-history" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
      <Stack.Screen name="terms-of-service" options={{ presentation: 'card' }} />
      <Stack.Screen name="location-selector" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="venue-detail" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="check-in-capture" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="activity" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="checkin-detail" options={{ presentation: 'card', headerShown: false }} />
    </Stack>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isDark } = useTheme();
  const [splashDone, setSplashDone] = useState<boolean>(false);
  const router = useRouter();
  const notifSubRef = useRef<ReturnType<typeof registerNotificationResponseHandler> | null>(null);
  const geofenceStartedRef = useRef<boolean>(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  // Initialize notifications and geofence when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !splashDone) return;

    void (async () => {
      await setupNotificationCategories();
      console.log('[App] Notification categories set up');

      // Register notification response handler
      notifSubRef.current = registerNotificationResponseHandler(
        // "Let's go" — open camera capture
        (data) => {
          console.log('[App] Notification: Let\'s go', data);
          const venueId = data.venueId as string;
          const venueName = data.venueName as string;
          const neighborhood = data.neighborhood as string;
          if (venueId) {
            router.push({
              pathname: '/check-in-capture',
              params: { venueId, venueName, neighborhood },
            });
          }
        },
        // "Skip" — silent check-in
        async (data) => {
          console.log('[App] Notification: Skip', data);
          const venueId = data.venueId as string;
          const venueName = data.venueName as string;
          const neighborhood = data.neighborhood as string;
          if (venueId && user) {
            const result = await insertCheckIn({
              userId: user.id,
              venueId,
              venueName: venueName ?? '',
              neighborhood: neighborhood ?? '',
              photoUri: null,
              photoVisibility: false,
              capturedAt: new Date().toISOString(),
              quip: null,
            });
            console.log('[App] Skip check-in result:', result.status);
          }
        },
      );

      // Start geofence monitoring
      setCurrentUserId(user.id);
      if (!geofenceStartedRef.current) {
        const started = await startGeofenceMonitoring(user.id);
        if (started) {
          geofenceStartedRef.current = true;
          console.log('[App] Geofence monitoring started');
        }
      }
    })();

    return () => {
      // Cleanup on unmount (logout)
      if (notifSubRef.current) {
        notifSubRef.current.remove();
      }
    };
  }, [isAuthenticated, user, splashDone, router]);

  // Stop geofence on logout
  useEffect(() => {
    if (!isAuthenticated && geofenceStartedRef.current) {
      void stopGeofenceMonitoring();
      geofenceStartedRef.current = false;
      console.log('[App] Geofence monitoring stopped');
    }
  }, [isAuthenticated]);

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
        <BiometricAuthProvider>
          <TabScrollProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootLayoutNav />
            <PersistentFloatingTabBar />
            <LockScreen />
            {splashDone && (
              <CityWelcome
                cityName="Denver"
                cityTagline="See what's busy tonight"
              />
            )}
            {!splashDone && <PulseSplash onComplete={handleSplashComplete} />}
            <WelcomeModal />
          </TabScrollProvider>
        </BiometricAuthProvider>
      </FavoritesProvider>
    </DataProvider>
  );
}

LogBox.ignoreAllLogs(true);

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
