import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Clock,
  MapPin,
  Navigation,
  Users,
  X,
  Zap,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { PulzeVenue } from '@/types/venue';

function getVibeColor(score: number): string {
  if (score >= 80) return '#FF4D3A';
  if (score >= 60) return '#FFAA2E';
  if (score >= 40) return '#E8D544';
  if (score >= 20) return '#5BE89E';
  return '#4DB8E8';
}

function getVibeLabel(score: number): string {
  if (score >= 80) return 'On Fire';
  if (score >= 60) return 'Buzzing';
  if (score >= 40) return 'Lively';
  if (score >= 20) return 'Chill';
  return 'Quiet';
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', color: '#5BE89E' };
    case 'closing_soon':
      return { label: 'Closing Soon', color: '#FFAA2E' };
    case 'closed':
      return { label: 'Closed', color: '#FF4D3A' };
    default:
      return { label: 'Unknown', color: '#86AEB7' };
  }
}

interface VenueBottomSheetProps {
  venue: PulzeVenue;
  onClose: () => void;
  onViewDetails: (venue: PulzeVenue) => void;
  onDirections: (venue: PulzeVenue) => void;
  bottomInset: number;
}

export default function VenueBottomSheet({
  venue,
  onClose,
  onViewDetails,
  onDirections,
  bottomInset,
}: VenueBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(320)).current;
  const color = getVibeColor(venue.vibe_score);
  const statusInfo = getStatusLabel(venue.open_status);
  const vibeLabel = getVibeLabel(venue.vibe_score);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 9,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 320,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) slideAnim.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 60 || g.vy > 0.5) {
            dismiss();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              friction: 9,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [slideAnim, dismiss]
  );

  const sheetBg = isDark ? 'rgba(8, 24, 30, 0.97)' : 'rgba(255, 255, 255, 0.98)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomInset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.sheet, { backgroundColor: sheetBg, borderColor: colors.border }]}>
        <View {...panResponder.panHandlers} style={styles.dragZone}>
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
        </View>

        <Pressable
          onPress={dismiss}
          style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          testID="venue-sheet-close"
        >
          <X color={colors.textMuted} size={14} />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: venue.avatar }} style={styles.avatar} contentFit="cover" />
            <View style={[styles.avatarRing, { borderColor: color }]} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {venue.name}
            </Text>
            <View style={styles.subRow}>
              <MapPin color={colors.textMuted} size={10} />
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {venue.categoryLabel} · {venue.neighborhood}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: color + '14' }]}>
            <Zap color={color} size={11} />
            <Text style={[styles.statVal, { color }]}>{venue.vibe_score}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{vibeLabel}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Users color={colors.aqua} size={11} />
            <Text style={[styles.statVal, { color: colors.text }]}>{venue.people}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Clock color={colors.aqua} size={11} />
            <Text style={[styles.statVal, { color: colors.text }]}>{venue.eta}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: statusInfo.color + '14' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statVal, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => onDirections(venue)}
            style={({ pressed }) => [
              styles.dirBtn,
              { backgroundColor: colors.aquaBright },
              pressed && styles.pressed,
            ]}
            testID="venue-sheet-directions"
          >
            <Navigation color={isDark ? '#041318' : '#fff'} size={13} />
            <Text style={[styles.dirText, { color: isDark ? '#041318' : '#fff' }]}>Directions</Text>
          </Pressable>
          <Pressable
            onPress={() => onViewDetails(venue)}
            style={({ pressed }) => [
              styles.detailBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
            testID="venue-sheet-details"
          >
            <Text style={[styles.detailText, { color: colors.text }]}>Details</Text>
            <ChevronRight color={colors.textMuted} size={13} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 100,
  },
  sheet: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  dragZone: {
    alignItems: 'center',
    paddingBottom: 2,
  },
  handle: {
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 28,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 19,
    borderWidth: 2,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  subtitle: {
    fontSize: 11,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statVal: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    paddingVertical: 9,
  },
  dirText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
