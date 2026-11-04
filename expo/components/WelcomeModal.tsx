import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { BarChart3, Camera, MapPin, Users, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/ThemeProvider';
import { CARD_MAX_WIDTH, CARD_PADDING, OVERLAY_GUTTER, slideWidthFor } from '@/components/welcomeModalLayout';

const TEAL = '#2BBFBA';
const STORAGE_KEY = 'pulze_open_count';
const ONBOARDING_DONE_KEY = 'pulze_onboarding_done';
const MAX_OPENS = 5;

type Step = 0 | 1 | 2;
const STEPS: Step[] = [0, 1, 2];

// Slides off screen are clipped, but VoiceOver would still read them.
const offscreenA11y = (hidden: boolean) =>
  hidden
    ? ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const)
    : {};

export function WelcomeModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // The real content width once the card has laid out; until then, the same
  // value computed from the window, so the first frame is already right.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const slideWidth = measuredWidth ?? slideWidthFor(windowWidth);
  const [visible, setVisible] = useState<boolean>(false);
  const [step, setStep] = useState<Step>(0);
  const [locationRequesting, setLocationRequesting] = useState<boolean>(false);
  const [slideAnim] = useState(() => new Animated.Value(0));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
        if (done === 'true') return;

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const current = raw ? parseInt(raw, 10) : 0;
        const safeCurrent = Number.isFinite(current) ? current : 0;
        const next = safeCurrent + 1;
        await AsyncStorage.setItem(STORAGE_KEY, String(next));
        if (!cancelled && next <= MAX_OPENS) {
          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      } catch (err) {
        console.log('[WelcomeModal] error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fadeAnim]);

  const animateToStep = useCallback(
    (next: Step) => {
      // The dots follow the tap at once, not after the slide finishes.
      setStep(next);
      Animated.timing(slideAnim, {
        toValue: -next * slideWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
    },
    [slideAnim, slideWidth],
  );

  // If the width changes (first measurement, Dynamic Type, split view), keep
  // the current slide exactly in place.
  useEffect(() => {
    slideAnim.setValue(-step * slideWidth);
    // step is deliberately not a dependency: animateToStep moves the track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideWidth, slideAnim]);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setMeasuredWidth((prev) => (prev === w ? prev : w));
  }, []);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [fadeAnim]);

  const requestLocation = useCallback(async () => {
    setLocationRequesting(true);
    try {
      if (Platform.OS !== 'web') {
        await Location.requestForegroundPermissionsAsync();
      }
    } catch (err) {
      console.log('[WelcomeModal] location permission error:', err);
    } finally {
      setLocationRequesting(false);
      animateToStep(2);
    }
  }, [animateToStep]);

  const handleFindFriends = useCallback(async () => {
    await finishOnboarding();
    router.push('/friends');
  }, [finishOnboarding, router]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} testID="welcome-modal">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
        // Scrolls only when the card is taller than the screen (small phones,
        // large text sizes); otherwise it stays centred and still.
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}
      >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* Page indicator dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((s) => (
            <View
              key={s}
              style={[
                styles.dot,
                s === step && styles.dotActive,
                { backgroundColor: s === step ? TEAL : 'rgba(255,255,255,0.2)' },
              ]}
            />
          ))}
        </View>

        {/* The viewport is the card's content box and clips the track, so
            only the current slide is ever visible (the card's own padding
            would otherwise show the neighbouring slides). */}
        <View style={styles.viewport} onLayout={onViewportLayout} testID="onboarding-viewport">
        <Animated.View
          style={[
            styles.screensTrack,
            { width: slideWidth * STEPS.length, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* ── Screen 1: Welcome & Value Prop ── */}
          <View style={[styles.screen, { width: slideWidth }]} {...offscreenA11y(step !== 0)}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>WELCOME TO PULZE</Text>
            </View>
            <Text style={styles.headline}>Know before you go.</Text>
            <Text style={styles.subtext}>
              See what&apos;s busy, discover the vibe, and let your crew know where you landed — all in real time.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <BarChart3 size={20} color={TEAL} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Real-time busyness</Text>
                  <Text style={styles.featureSubtitle}>
                    Every bar and club around you, updated live
                  </Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Zap size={20} color={TEAL} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Discover what&apos;s popping</Text>
                  <Text style={styles.featureSubtitle}>
                    Find the best spots near you tonight
                  </Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Camera size={20} color={TEAL} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Check in</Text>
                  <Text style={styles.featureSubtitle}>
                    Let your crew know where you landed
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => animateToStep(1)}
              activeOpacity={0.85}
              testID="onboarding-next-1"
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>

          {/* ── Screen 2: Location Permission ── */}
          <View style={[styles.screen, { width: slideWidth }]} {...offscreenA11y(step !== 1)}>
            <View style={[styles.largeIconWrap, { backgroundColor: 'rgba(43, 191, 186, 0.12)' }]}>
              <MapPin size={32} color={TEAL} />
            </View>
            <Text style={styles.headline}>Enable location</Text>
            <Text style={styles.subtext}>
              Pulze uses your location to show busyness in real time and let your crew see where you are.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={requestLocation}
              activeOpacity={0.85}
              disabled={locationRequesting}
              testID="onboarding-allow-location"
            >
              <Text style={styles.buttonText}>
                {locationRequesting ? 'Requesting...' : 'Allow Location'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => animateToStep(2)}
              activeOpacity={0.6}
              testID="onboarding-skip-location"
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* ── Screen 3: Connect with Friends ── */}
          <View style={[styles.screen, { width: slideWidth }]} {...offscreenA11y(step !== 2)}>
            <View style={[styles.largeIconWrap, { backgroundColor: 'rgba(43, 191, 186, 0.12)' }]}>
              <Users size={32} color={TEAL} />
            </View>
            <Text style={styles.headline}>Connect with friends</Text>
            <Text style={styles.subtext}>
              See where your people are tonight and stay in the loop.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleFindFriends}
              activeOpacity={0.85}
              testID="onboarding-find-friends"
            >
              <Text style={styles.buttonText}>Find Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={finishOnboarding}
              activeOpacity={0.6}
              testID="onboarding-skip-friends"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </View>
      </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 19, 24, 0.97)',
    zIndex: 999,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: OVERLAY_GUTTER,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: 24,
    padding: CARD_PADDING,
    paddingTop: 28,
    overflow: 'hidden',
  },
  viewport: {
    width: '100%',
    overflow: 'hidden',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
  },
  screensTrack: {
    flexDirection: 'row',
    // Each slide keeps its own height; the card is as tall as the tallest.
    alignItems: 'flex-start',
  },
  screen: {
    alignItems: 'center',
  },
  pill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(43, 191, 186, 0.15)',
  },
  pillText: {
    color: TEAL,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headline: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtext: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  featureList: {
    marginTop: 28,
    gap: 18,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(43, 191, 186, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  featureSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  largeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    marginTop: 32,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#041318',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
