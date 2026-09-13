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
import { getLocationConsent } from '@/services/consent';
import { insertCheckIn } from '@/services/checkInDatabase';
import { hasCompletedAgeGate, hasSeenOptionalDemographicsStep } from '@/services/demographics';
import { AgeGateScreen } from '@/components/AgeGateScreen';
import { DemographicsOnboardingScreen } from '@/components/DemographicsOnboardingScreen';
import { drainAnalyticsQueue } from '@/services/analytics';

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
      <Stack.Screen name="saved-venues" options={{ presentation: 'card' }} />
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

  // Post-auth router state machine. Runs in order and only mounts
  // the main tab tree once every gate is 'passed'.
  //
  //   Age gate: 21+ DOB. Failing this doesn't sign the user out — it
  //   just blocks the app until they submit an eligible DOB.
  //   Retroactive: existing accounts with no user_demographics row
  //   are routed through the picker on their next session.
  //
  //   Demographic step: optional gender/race + explicit demographic-
  //   analytics consent. Skippable; skipping still marks the step
  //   complete so a legitimately-declining user isn't re-prompted.
  //   Also retroactive: any pre-Batch-3 row has NULL
  //   optional_step_completed_at and the user sees the screen once.
  const [ageGateStatus, setAgeGateStatus] = useState<'unknown' | 'needed' | 'passed'>('unknown');
  const [demographicsStepStatus, setDemographicsStepStatus] = useState<'unknown' | 'needed' | 'passed'>('unknown');

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setAgeGateStatus('unknown');
      setDemographicsStepStatus('unknown');
      return;
    }
    let cancelled = false;
    void (async () => {
      const done = await hasCompletedAgeGate();
      if (cancelled) return;
      setAgeGateStatus(done ? 'passed' : 'needed');
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  // Chained after the age gate: once the DOB row exists, check
  // whether the demographic step still needs to be shown.
  useEffect(() => {
    if (ageGateStatus !== 'passed') {
      setDemographicsStepStatus('unknown');
      return;
    }
    let cancelled = false;
    void (async () => {
      const seen = await hasSeenOptionalDemographicsStep();
      if (cancelled) return;
      setDemographicsStepStatus(seen ? 'passed' : 'needed');
    })();
    return () => { cancelled = true; };
  }, [ageGateStatus]);

  const handleAgeGateComplete = useCallback(() => {
    setAgeGateStatus('passed');
  }, []);

  const handleDemographicsComplete = useCallback(() => {
    setDemographicsStepStatus('passed');
  }, []);

  // Initialize notifications and geofence when authenticated AND
  // both onboarding gates have cleared. Holding the effect back
  // until 'passed'/'passed' means a user still on the DOB screen or
  // the optional demographic screen never registers a device for
  // notifications, never starts background location, and never
  // opens a location-related consent record.
  useEffect(() => {
    if (!isAuthenticated || !user || !splashDone) return;
    if (ageGateStatus !== 'passed' || demographicsStepStatus !== 'passed') return;

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

      // Reconcile background monitoring with persisted server consent.
      // If the user had Location-based check-ins ON at last exit and
      // permissions are still valid, start the task. If they had it
      // OFF (or turned it off from another device), make sure any
      // stale registered task on THIS device is torn down — otherwise
      // reinstalls / migrated code paths could silently keep running.
      setCurrentUserId(user.id);

      // Best-effort drain of any first-party analytics events that
      // were queued while offline. Runs once per session behind
      // the same gates as the geofence startup so no orphan events
      // fire before onboarding completes. Fire-and-forget — an
      // error here never affects app startup.
      void drainAnalyticsQueue();

      if (geofenceStartedRef.current) return;

      const consented = await getLocationConsent(user.id);
      if (!consented) {
        await stopGeofenceMonitoring();
        console.log('[App] Location consent OFF at startup — ensured monitoring stopped');
        return;
      }
      const result = await startGeofenceMonitoring(user.id);
      if (result.started) {
        geofenceStartedRef.current = true;
        console.log('[App] Geofence monitoring started');
      } else {
        console.log('[App] Geofence monitoring not started:', result.reason);
      }
    })();

    return () => {
      // Cleanup on unmount (logout)
      if (notifSubRef.current) {
        notifSubRef.current.remove();
      }
    };
  }, [isAuthenticated, user, splashDone, ageGateStatus, demographicsStepStatus, router]);

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

  // Age-gate router: while the DOB check is still resolving, show
  // the splash; while it's known-needed, show the picker. Neither
  // branch mounts the main tab tree, so the user has no path into
  // the app until the 21+ gate is satisfied.
  if (ageGateStatus === 'unknown' || !splashDone) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PulseSplash onComplete={handleSplashComplete} />
      </>
    );
  }

  if (ageGateStatus === 'needed') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AgeGateScreen onComplete={handleAgeGateComplete} />
      </>
    );
  }

  // Age gate cleared but the optional demographic step is still
  // resolving or still needed. `'unknown'` at this point means the
  // demographic-step check has yet to land — hold on the splash so
  // we don't briefly flash the main app between the two checks.
  if (demographicsStepStatus === 'unknown') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PulseSplash onComplete={handleSplashComplete} />
      </>
    );
  }

  if (demographicsStepStatus === 'needed') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <DemographicsOnboardingScreen onComplete={handleDemographicsComplete} />
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
