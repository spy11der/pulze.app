import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { MapPin, Users, Ticket } from 'lucide-react-native';

const TEAL = '#2BBFBA';
const BG = '#041318';

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

export default function Onboarding() {
  const [page, setPage] = useState<number>(0);

  const handleComplete = async () => {
    await AsyncStorage.setItem('pulze_onboarded', 'true');
    router.replace('/(tabs)/');
  };

  const handleNext = () => {
    setPage((p) => p + 1);
  };

  return (
    <View style={styles.root} testID="onboarding-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {page === 0 && (
        <View style={styles.slide} testID="onboarding-slide-1">
          <View style={styles.heroSpacer} />
          <Text style={styles.brand}>Pulze</Text>
          <Text style={styles.headline}>Know before you go.</Text>
          <Text style={styles.subtext}>
            Real-time crowd levels, vibes, and events near you.
          </Text>
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              testID="onboarding-next-1"
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {page === 1 && (
        <View style={styles.slide} testID="onboarding-slide-2">
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
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              testID="onboarding-next-2"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {page === 2 && (
        <View style={styles.slide} testID="onboarding-slide-3">
          <View style={styles.iconHero}>
            <View style={styles.iconHeroCircle}>
              <MapPin color={TEAL} size={64} />
            </View>
          </View>
          <Text style={styles.headline}>Find what&apos;s near you</Text>
          <Text style={styles.subtext}>
            We use your location to show crowd levels nearby.
          </Text>
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              testID="onboarding-next-3"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {page === 3 && (
        <View style={styles.slide} testID="onboarding-slide-4">
          <View style={styles.iconHero}>
            <View style={styles.iconHeroCircle}>
              <Text style={styles.checkEmoji}>✓</Text>
            </View>
          </View>
          <Text style={styles.headline}>You&apos;re all set.</Text>
          <Text style={styles.subtext}>
            Let&apos;s find somewhere worth going tonight.
          </Text>
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleComplete}
              testID="onboarding-finish"
            >
              <Text style={styles.primaryButtonText}>Open Pulze</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 120,
    alignItems: 'center',
  },
  heroSpacer: {
    height: 60,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 60,
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
  bottomBlock: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    minWidth: 240,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#041318',
    fontSize: 17,
    fontWeight: '700',
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
  iconHero: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  iconHeroCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(43, 191, 186, 0.12)',
    borderWidth: 2,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmoji: {
    color: TEAL,
    fontSize: 72,
    fontWeight: '800',
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
