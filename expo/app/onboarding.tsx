import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, Users, Ticket } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const TEAL = '#2BBFBA';
const BG = '#041318';
const ONBOARDED_KEY = 'pulze_onboarded';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function PulseRing() {
  const scale1 = useRef(new Animated.Value(0.8)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const scale2 = useRef(new Animated.Value(0.8)).current;
  const opacity2 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animate = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(scale, {
              toValue: 2.2,
              duration: 2400,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2400,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]),
      );
    };
    const a1 = animate(scale1, opacity1, 0);
    const a2 = animate(scale2, opacity2, 1200);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [scale1, opacity1, scale2, opacity2]);

  return (
    <View style={styles.pulseContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: scale1 }], opacity: opacity1 },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: scale2 }], opacity: opacity2 },
        ]}
      />
    </View>
  );
}

function PulzeLogo() {
  return (
    <View style={styles.logoWrap} testID="pulze-logo">
      <View style={styles.logoCircle}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={10} fill={TEAL} />
          <Circle cx={32} cy={32} r={20} stroke={TEAL} strokeWidth={2.5} fill="none" opacity={0.6} />
          <Circle cx={32} cy={32} r={28} stroke={TEAL} strokeWidth={1.5} fill="none" opacity={0.3} />
        </Svg>
      </View>
      <Text style={styles.logoText}>Pulze</Text>
    </View>
  );
}

function AnimatedCheckmark() {
  const circleProgress = useRef(new Animated.Value(0)).current;
  const checkProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleProgress, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.timing(checkProgress, {
        toValue: 1,
        duration: 450,
        useNativeDriver: false,
      }),
    ]).start();
  }, [circleProgress, checkProgress]);

  const CIRCLE_LEN = 2 * Math.PI * 56;
  const CHECK_LEN = 60;

  const circleDashOffset = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_LEN, 0],
  });
  const checkDashOffset = checkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CHECK_LEN, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedPath = Animated.createAnimatedComponent(Path);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.checkWrap}>
        <Svg width={140} height={140} viewBox="0 0 140 140">
          <Circle cx={70} cy={70} r={56} stroke={TEAL} strokeWidth={5} fill="none" />
          <Path
            d="M44 72 L62 90 L96 54"
            stroke={TEAL}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  return (
    <View style={styles.checkWrap}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        <AnimatedCircle
          cx={70}
          cy={70}
          r={56}
          stroke={TEAL}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${CIRCLE_LEN}`}
          strokeDashoffset={circleDashOffset as unknown as number}
          strokeLinecap="round"
        />
        <AnimatedPath
          d="M44 72 L62 90 L96 54"
          stroke={TEAL}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${CHECK_LEN}`}
          strokeDashoffset={checkDashOffset as unknown as number}
        />
      </Svg>
    </View>
  );
}

function LocationPinIllustration() {
  return (
    <View style={styles.pinWrap}>
      <Svg width={160} height={200} viewBox="0 0 160 200">
        <Circle cx={80} cy={170} rx={40} ry={8} fill={TEAL} opacity={0.15} />
        <Path
          d="M80 20 C50 20 30 42 30 72 C30 110 80 170 80 170 C80 170 130 110 130 72 C130 42 110 20 80 20 Z"
          fill={TEAL}
          opacity={0.95}
        />
        <Circle cx={80} cy={70} r={18} fill={BG} />
        <Circle cx={80} cy={70} r={9} fill={TEAL} />
      </Svg>
    </View>
  );
}

interface FeatureRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function FeatureRow({ icon, title, subtitle }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState<number>(0);
  const [requestingLocation, setRequestingLocation] = useState<boolean>(false);

  const goTo = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== page) setPage(idx);
  }, [page]);

  const handleAllowLocation = useCallback(async () => {
    setRequestingLocation(true);
    try {
      if (Platform.OS !== 'web') {
        await Location.requestForegroundPermissionsAsync();
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 5000 },
          );
        });
      }
    } catch (err) {
      console.log('[Onboarding] location request failed', err);
    } finally {
      setRequestingLocation(false);
      goTo(3);
    }
  }, [goTo]);

  const handleSkipLocation = useCallback(() => {
    goTo(3);
  }, [goTo]);

  const handleFinish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch (err) {
      console.log('[Onboarding] persist failed', err);
    }
    router.replace('/(tabs)');
  }, [router]);

  return (
    <View style={styles.root} testID="onboarding-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Slide 1 */}
        <View style={styles.slide}>
          <View style={styles.heroBlock}>
            <PulseRing />
            <PulzeLogo />
          </View>
          <Text style={styles.headline}>Know before you go.</Text>
          <Text style={styles.subtext}>
            Real-time crowd levels, vibes, and events for bars, venues, and parks near you.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => goTo(1)}
            testID="onboarding-next-1"
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>

        {/* Slide 2 */}
        <View style={styles.slide}>
          <Text style={styles.headlineTop}>How it works</Text>
          <View style={styles.featureList}>
            <FeatureRow
              icon={<MapPin color={TEAL} size={26} />}
              title="See what's busy"
              subtitle="Live crowd scores updated in real time"
            />
            <FeatureRow
              icon={<Users color={TEAL} size={26} />}
              title="Check in"
              subtitle="Tell others how it feels right now"
            />
            <FeatureRow
              icon={<Ticket color={TEAL} size={26} />}
              title="Find events"
              subtitle="Discover what's happening tonight"
            />
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => goTo(2)}
            testID="onboarding-next-2"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>

        {/* Slide 3 */}
        <View style={styles.slide}>
          <LocationPinIllustration />
          <Text style={styles.headline}>Find what&apos;s near you</Text>
          <Text style={styles.subtext}>
            We use your location to show crowd levels and events nearby. We never share your location.
          </Text>
          <Pressable
            style={[styles.primaryButton, requestingLocation && styles.buttonDisabled]}
            onPress={handleAllowLocation}
            disabled={requestingLocation}
            testID="onboarding-allow-location"
          >
            <Text style={styles.primaryButtonText}>
              {requestingLocation ? 'Requesting…' : 'Allow Location'}
            </Text>
          </Pressable>
          <Pressable onPress={handleSkipLocation} style={styles.skipLink} testID="onboarding-skip-location">
            <Text style={styles.skipText}>Not now</Text>
          </Pressable>
        </View>

        {/* Slide 4 */}
        <View style={styles.slide}>
          <AnimatedCheckmark />
          <Text style={styles.headline}>You&apos;re all set.</Text>
          <Text style={styles.subtext}>Let&apos;s find somewhere worth going tonight.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={handleFinish}
            testID="onboarding-finish"
          >
            <Text style={styles.primaryButtonText}>Open Pulze</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.dots} pointerEvents="none">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, page === i && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 120,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  heroBlock: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  pulseContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: TEAL,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(43, 191, 186, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  headlineTop: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 40,
    marginTop: 20,
  },
  subtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    minWidth: 240,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#041318',
    fontSize: 17,
    fontWeight: '700',
  },
  skipLink: {
    marginTop: 16,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontWeight: '500',
  },
  featureList: {
    width: '100%',
    gap: 28,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(43, 191, 186, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
  },
  pinWrap: {
    marginTop: 30,
    marginBottom: 30,
    alignItems: 'center',
  },
  checkWrap: {
    marginTop: 30,
    marginBottom: 30,
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: TEAL,
    width: 24,
  },
});
