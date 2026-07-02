import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/ThemeProvider';

const WELCOMED_CITIES_KEY = 'pulze_welcomed_cities';

interface CityWelcomeProps {
  cityName: string;
  cityTagline: string;
}

export function CityWelcome({ cityName, cityTagline }: CityWelcomeProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    async function checkCity() {
      try {
        const stored = await AsyncStorage.getItem(WELCOMED_CITIES_KEY);
        const welcomed: string[] = stored ? JSON.parse(stored) : [];
        const cityKey = cityName.toLowerCase().trim();

        if (welcomed.includes(cityKey)) {
          console.log('[CityWelcome] Already welcomed to', cityName);
          return;
        }

        console.log('[CityWelcome] New city detected:', cityName);
        welcomed.push(cityKey);
        await AsyncStorage.setItem(WELCOMED_CITIES_KEY, JSON.stringify(welcomed));

        if (!mounted) return;
        setVisible(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.parallel([
          Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          if (!mounted) return;
          dismissRef.current();
        }, 6000);
      } catch (e) {
        console.log('[CityWelcome] Error checking city:', e);
      }
    }

    const timer = setTimeout(() => {
      void checkCity();
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [cityName, slideAnim, opacityAnim]);

  const dismissRef = useRef(() => {});
  dismissRef.current = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const dismiss = useCallback(() => {
    dismissRef.current();
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      testID="city-welcome-banner"
    >
      <View style={[styles.inner, { backgroundColor: isDark ? 'rgba(11, 35, 44, 0.96)' : 'rgba(255, 255, 255, 0.97)', borderColor: isDark ? 'rgba(53, 212, 207, 0.25)' : 'rgba(0,0,0,0.08)' }]}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.15)' : 'rgba(26, 168, 163, 0.1)' }]}>
          <MapPin color={colors.aqua} size={18} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to {cityName}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{cityTagline}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn} testID="city-welcome-close">
          <X color={colors.textMuted} size={14} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
  },
});
