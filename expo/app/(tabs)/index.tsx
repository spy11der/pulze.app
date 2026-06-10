import React, { useCallback, useMemo, useState } from 'react';
import {
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
  MapPin,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getVenuesSortedByBusyness } from '@/mocks/venues';
import { useTheme } from '@/providers/ThemeProvider';
import { getBusynessLabel, getBusynessColor } from '@/types/venue';
import type { PulzeVenue } from '@/types/venue';

const allVenues = getVenuesSortedByBusyness();

type FilterCategory = 'busyness' | 'neighborhood' | 'type';

interface FilterPillDef {
  key: string;
  label: string;
  category: FilterCategory;
}

const FILTER_PILLS: FilterPillDef[] = [
  { key: 'popping', label: 'Popping now', category: 'busyness' },
  { key: 'low_wait', label: 'Low wait', category: 'busyness' },
  { key: 'RiNo', label: 'RiNo', category: 'neighborhood' },
  { key: 'Cap Hill', label: 'Cap Hill', category: 'neighborhood' },
  { key: 'LoDo', label: 'LoDo', category: 'neighborhood' },
  { key: 'Baker', label: 'Baker', category: 'neighborhood' },
  { key: 'bars', label: 'Bars', category: 'type' },
  { key: 'clubs', label: 'Clubs', category: 'type' },
  { key: 'breweries', label: 'Breweries', category: 'type' },
] as const;

function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Denver, today';
  if (hour >= 12 && hour < 17) return 'Denver, afternoon';
  if (hour >= 17 && hour < 21) return 'Denver, tonight';
  if (hour >= 21 || hour < 3) return 'Denver, right now';
  return 'Denver, late night';
}

function venueMatchesTypeFilter(venue: PulzeVenue, filterKey: string): boolean {
  switch (filterKey) {
    case 'bars':
      return venue.type === 'bar' || venue.type === 'dive' || venue.type === 'speakeasy';
    case 'clubs':
      return venue.type === 'club';
    case 'breweries':
      return venue.type === 'brewery';
    default:
      return false;
  }
}

function venueMatchesBusynessFilter(venue: PulzeVenue, filterKey: string): boolean {
  switch (filterKey) {
    case 'popping':
      return venue.busynessPercent >= 80;
    case 'low_wait':
      return venue.busynessPercent <= 40;
    default:
      return false;
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const timeContext = useMemo(() => getTimeContext(), []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const t = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(t);
  }, []);

  const handleVenuePress = useCallback(
    (venueId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/venue-detail', params: { venueId } });
    },
    [router],
  );

  const toggleFilter = useCallback((key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const filteredVenues = useMemo(() => {
    if (activeFilters.size === 0) return allVenues;

    const busynessKeys = FILTER_PILLS.filter(
      (f) => f.category === 'busyness' && activeFilters.has(f.key),
    ).map((f) => f.key);
    const neighborhoodKeys = FILTER_PILLS.filter(
      (f) => f.category === 'neighborhood' && activeFilters.has(f.key),
    ).map((f) => f.key);
    const typeKeys = FILTER_PILLS.filter(
      (f) => f.category === 'type' && activeFilters.has(f.key),
    ).map((f) => f.key);

    return allVenues.filter((v) => {
      if (busynessKeys.length > 0) {
        if (!busynessKeys.some((k) => venueMatchesBusynessFilter(v, k))) return false;
      }
      if (neighborhoodKeys.length > 0) {
        if (!neighborhoodKeys.includes(v.neighborhood)) return false;
      }
      if (typeKeys.length > 0) {
        if (!typeKeys.some((k) => venueMatchesTypeFilter(v, k))) return false;
      }
      return true;
    });
  }, [activeFilters]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <View style={styles.timeRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.aquaBright }]} />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{timeContext}</Text>
            </View>
          </View>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilters.has(pill.key);
            return (
              <Pressable
                key={pill.key}
                onPress={() => toggleFilter(pill.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? colors.aqua : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    borderColor: isActive ? colors.aqua : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#060C10' : colors.textMuted },
                  ]}
                >
                  {pill.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Venue cards */}
      <ScrollView
        contentContainerStyle={styles.cardList}
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
        {filteredVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nothing matching right now
            </Text>
            <Pressable
              onPress={() => setActiveFilters(new Set())}
              style={[styles.clearFiltersBtn, { borderColor: colors.borderStrong }]}
            >
              <Text style={[styles.clearFiltersText, { color: colors.aqua }]}>Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onPress={() => handleVenuePress(venue.id)}
            />
          ))
        )}
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
  const busynessLabel = getBusynessLabel(venue.busyness);
  const photoUri = venue.photo ?? venue.photos[0];
  const displayTags = venue.tags.slice(0, 2);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Photo banner */}
      <View style={styles.cardPhotoWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.cardPhoto} />
        ) : (
          <View style={[styles.cardPhotoPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
            <MapPin color={colors.aqua} size={20} />
          </View>
        )}
        {/* Busyness badge on photo */}
        <View
          style={[
            styles.busynessBadge,
            { backgroundColor: busynessColor + '26' },
          ]}
        >
          <View style={[styles.busynessDot, { backgroundColor: busynessColor }]} />
          <Text style={[styles.busynessBadgeText, { color: busynessColor }]}>
            {busynessLabel}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        {/* Row 1: name + type chip */}
        <View style={styles.cardRow1}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={[styles.typeChip, { backgroundColor: colors.aqua + '14' }]}>
            <Text style={[styles.typeChipText, { color: colors.aqua }]}>{venue.typeLabel}</Text>
          </View>
        </View>

        {/* Row 2: neighborhood + distance */}
        <View style={styles.cardRow2}>
          <View style={styles.metaItem}>
            <MapPin color={colors.textSoft} size={11} />
            <Text style={[styles.metaText, { color: colors.textSoft }]}>{venue.neighborhood}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock color={colors.textSoft} size={11} />
            <Text style={[styles.metaText, { color: colors.textSoft }]}>{venue.eta}</Text>
          </View>
        </View>

        {/* Row 3: busyness bar */}
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: busynessColor,
                  width: `${venue.busynessPercent}%` as unknown as undefined,
                },
              ]}
            />
          </View>
          <Text style={[styles.barPercent, { color: busynessColor }]}>
            {venue.busynessPercent}%
          </Text>
        </View>

        {/* Row 4: vibe tags */}
        {displayTags.length > 0 && (
          <View style={styles.tagsRow}>
            {displayTags.map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
});

const PHOTO_HEIGHT = 78;

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    gap: 2,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },

  // Filter row
  filterScroll: {
    marginTop: 10,
    marginBottom: 2,
  },
  filterRow: {
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },

  // Cards
  cardList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },

  // Photo
  cardPhotoWrap: {
    position: 'relative' as const,
    height: PHOTO_HEIGHT,
  },
  cardPhoto: {
    width: '100%',
    height: PHOTO_HEIGHT,
    resizeMode: 'cover' as const,
  },
  cardPhotoPlaceholder: {
    width: '100%',
    height: PHOTO_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  busynessBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busynessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  busynessBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },

  // Card info
  cardInfo: {
    padding: 10,
    gap: 6,
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },

  // Busyness bar
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  barPercent: {
    fontSize: 12,
    fontWeight: '700' as const,
    width: 32,
    textAlign: 'right' as const,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },

  // Empty state
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  clearFiltersBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
