import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, Ticket, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TEAL = '#2BBFBA';
const STORAGE_KEY = 'pulze_open_count';
const MAX_OPENS = 5;

type Feature = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
};

const features: Feature[] = [
  {
    icon: <MapPin size={22} color={TEAL} />,
    title: 'Live crowd levels',
    subtitle: "Know if it's packed before you arrive",
  },
  {
    icon: <Users size={22} color={TEAL} />,
    title: 'Friend activity',
    subtitle: 'See where your people are tonight',
  },
  {
    icon: <Ticket size={22} color={TEAL} />,
    title: 'Events near you',
    subtitle: "Discover what's happening right now",
  },
];

export function WelcomeModal() {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const current = raw ? parseInt(raw, 10) : 0;
        const safeCurrent = Number.isFinite(current) ? current : 0;
        const next = safeCurrent + 1;
        await AsyncStorage.setItem(STORAGE_KEY, String(next));
        if (!cancelled && next <= MAX_OPENS) {
          setVisible(true);
        }
        console.log('[WelcomeModal] open count:', next);
      } catch (err) {
        console.log('[WelcomeModal] error reading open count', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="welcome-modal">
      <View style={styles.card}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>WELCOME TO PULZE</Text>
        </View>
        <Text style={styles.headline}>Know before you go.</Text>
        <Text style={styles.subtext}>
          See real-time crowd levels, vibes, and events at bars, venues, and parks near you.
        </Text>

        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>{f.icon}</View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setVisible(false)}
          activeOpacity={0.85}
          testID="welcome-modal-cta"
        >
          <Text style={styles.buttonText}>Let&apos;s Go</Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>Shows for your first 5 opens</Text>
      </View>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0a2228',
    borderRadius: 24,
    padding: 32,
  },
  pill: {
    alignSelf: 'flex-start',
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
    marginTop: 12,
  },
  subtext: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  featureList: {
    marginTop: 28,
    gap: 18,
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
  button: {
    marginTop: 28,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#041318',
    fontSize: 16,
    fontWeight: '700',
  },
  footnote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
