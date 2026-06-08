import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Flame,
  MapPin,
  Users,
  Clock,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getVenuesSortedByBusyness, getPackedVenues } from '@/mocks/venues';
import { useTheme } from '@/providers/ThemeProvider';
import { getBusynessLabel, getBusynessColor, getBusynessBgColor } from '@/types/venue';
import type { PulzeVenue } from '@/types/venue';

const allVenues = getVenuesSortedByBusyness();

function formatTimeAgo(): string {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 2) return 'Late night';
  if (hour >= 18) return 'Prime time';
  if (hour >= 14) return 'Afternoon';
  return 'Morning';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const t = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(t);
  }, []);

  const packedCount = useMemo(() => getPackedVenues().length, []);
  const totalCheckins = useMemo(() => allVenues.reduce((sum, v) => sum + v.checkins, 0), []);
  const timeLabel = useMemo(() => formatTimeAgo(), []);

  const handleVenuePress = useCallback((venueId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/venue-detail', params: { venueId } });
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.aqua}
            colors={[colors.aqua]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>Denver, tonight</Text>
          </View>
          <View style={styles.moodRow}>
            <View style={[styles.pulseDot, { backgroundColor: colors.aquaBright }]} />
            <Text style={[styles.moodText, { color: colors.textSoft }]}>
              {timeLabel} · {packedCount} spots packed
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Flame color={colors.amber} size={16} />
            <Text style={[styles.statNumber, { color: colors.amber }]}>{packedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSoft }]}>packed</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Users color={colors.aqua} size={16} />
            <Text style={[styles.statNumber, { color: colors.aqua }]}>{totalCheckins}</Text>
            <Text style={[styles.statLabel, { color: colors.textSoft }]}>checked in</Text>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What&apos;s busy</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Sorted by how packed right now</Text>
        </View>

        {/* Venue cards */}
        {allVenues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onPress={() => handleVenuePress(venue.id)}
          />
        ))}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const VenueCard = React.memo(function VenueCard({
  venue,
  onPress,
}: {
  venue: PulzeVenue;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const busynessColor = getBusynessColor(venue.busyness);
  const busynessBg = getBusynessBgColor(venue.busyness);
  const busynessLabel = getBusynessLabel(venue.busyness);
  const photoUri = venue.photo ?? venue.photos[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardImageWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
            <MapPin color={colors.aqua} size={24} />
          </View>
        )}
        <View style={[styles.cardImageGradient]} pointerEvents="none" />
        {/* Busyness badge */}
        <View style={[styles.busynessBadge, { backgroundColor: busynessBg }]}>
          <View style={[styles.busynessDot, { backgroundColor: busynessColor }]} />
          <Text style={[styles.busynessText, { color: busynessColor }]}>{busynessLabel}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={[styles.cardTypeChip, { backgroundColor: colors.aqua + '14' }]}>
            <Text style={[styles.cardTypeText, { color: colors.aqua }]}>{venue.typeLabel}</Text>
          </View>
        </View>

        <Text style={[styles.cardVibe, { color: colors.textMuted }]} numberOfLines={1}>
          {venue.vibe}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <MapPin color={colors.textSoft} size={12} />
            <Text style={[styles.cardMetaText, { color: colors.textSoft }]}>{venue.neighborhood}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Clock color={colors.textSoft} size={12} />
            <Text style={[styles.cardMetaText, { color: colors.textSoft }]}>{venue.eta}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Zap color={colors.textSoft} size={12} />
            <Text style={[styles.cardMetaText, { color: colors.textSoft }]}>{venue.checkins} here</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  header: { gap: 6 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    gap: 2,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionSub: {
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  cardImageWrap: {
    position: 'relative' as const,
  },
  cardImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover' as const,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardImageGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  busynessBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  busynessDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  busynessText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    flex: 1,
  },
  cardTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardVibe: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 2,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
