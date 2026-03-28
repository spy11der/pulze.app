import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Flame, TrendingUp, Clock, TrendingDown, Minus, Moon } from 'lucide-react-native';
import type { UrgencyInfo } from '@/utils/urgency';

const ICON_MAP = {
  'flame': Flame,
  'trending-up': TrendingUp,
  'clock': Clock,
  'trending-down': TrendingDown,
  'minus': Minus,
  'moon': Moon,
} as const;

interface UrgencyTagProps {
  urgency: UrgencyInfo;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const UrgencyTag = React.memo(function UrgencyTag({
  urgency,
  size = 'sm',
  pulse = false,
}: UrgencyTagProps) {
  const Icon = ICON_MAP[urgency.icon];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse && (urgency.label === 'Peak now' || urgency.label === 'Filling fast')) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  }, [pulse, urgency.label, pulseAnim]);

  const isMd = size === 'md';

  return (
    <Animated.View style={[
      styles.tag,
      isMd && styles.tagMd,
      { backgroundColor: urgency.color + '14', transform: [{ scale: pulseAnim }] },
    ]}>
      <Icon color={urgency.color} size={isMd ? 12 : 10} />
      <Text style={[
        styles.tagText,
        isMd && styles.tagTextMd,
        { color: urgency.color },
      ]}>
        {urgency.label}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  tagTextMd: {
    fontSize: 12,
  },
});
