import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Bell, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getDiscoverFeed, type DiscoverFilters, type FeedFacets } from '@/services/venues';
import { SponsoredBadge } from '@/components/SponsoredBadge';
import { useTheme } from '@/providers/ThemeProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  DENVER_COORDS,
  haversineMeters,
  metersToWalkMinutes,
} from '@/hooks/useNearbyVenues';

import { hasReliableBusyness, type PulzeVenue } from '@/types/venue';

type FilterCategory = 'busyness' | 'neighborhood' | 'type';

interface FilterPillDef {
  key: string;
  label: string;
  category: FilterCategory;
}

// Phase 6A-3: filtering moved server-side and the pill row is now DERIVED
// from the feed's facets instead of being hardcoded.
//
// The old list contained a "Baker" pill that matched zero venues in the
// database AND zero in the mock catalogue -- it could never return a result.
// It was not removed by deleting Baker (it is a real Denver neighborhood and
// decision D8 kept it in the vocabulary); it disappeared because pills are
// now built from neighborhoods that actually have active venues. When a Baker
// venue is added, the pill appears on its own.
//
// Busyness pills are static because they are claims about live crowd state
// rather than about the catalogue. Both require real signal at or above the
// confidence floor, so while confidence is zero everywhere they correctly
// return nothing -- the server enforces that, not this file.
const BUSYNESS_PILLS: FilterPillDef[] = [
  { key: 'popping', label: 'Popping now', category: 'busyness' },
  { key: 'low_wait', label: 'Low wait', category: 'busyness' },
];

// Display groupings over raw venue.category values. A group pill is rendered
// only when the facets show at least one venue in it.
const TYPE_GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: 'bars', label: 'Bars', categories: ['bar', 'dive', 'speakeasy'] },
  { key: 'clubs', label: 'Clubs', categories: ['club'] },
  { key: 'breweries', label: 'Breweries', categories: ['brewery'] },
  { key: 'lounges', label: 'Lounges', categories: ['lounge', 'rooftop'] },
];

// A neighborhood pill's key carries the neighborhood name, which is what
// makes the selected-filter -> server-filter translation independent of the
// facet list. See the `serverFilters` memo below for why that matters.
const NBHD_PILL_PREFIX = 'nbhd:';

function buildPills(facets: FeedFacets): FilterPillDef[] {
  const present = new Set((facets.categories ?? []).map((c) => c.value));
  const typePills: FilterPillDef[] = TYPE_GROUPS
    .filter((g) => g.categories.some((c) => present.has(c)))
    .map((g) => ({ key: g.key, label: g.label, category: 'type' as const }));

  const nbhdPills: FilterPillDef[] = (facets.neighborhoods ?? [])
    .filter((n) => n.venue_count > 0)
    .map((n) => ({
      key: `${NBHD_PILL_PREFIX}${n.name}`,
      label: n.name,
      category: 'neighborhood' as const,
    }));

  return [...BUSYNESS_PILLS, ...nbhdPills, ...typePills];
}

function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Denver, today';
  if (hour >= 12 && hour < 17) return 'Denver, afternoon';
  if (hour >= 17 && hour < 21) return 'Denver, tonight';
  if (hour >= 21 || hour < 3) return 'Denver, right now';
  return 'Denver, late night';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabScroll();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { userLocation } = useMapLocation();

  // Real location with the same Denver fallback Nearby uses, so walk-time
  // estimates match across Home, Nearby, and Venue Detail.
  const userLat = userLocation?.latitude ?? DENVER_COORDS.lat;
  const userLng = userLocation?.longitude ?? DENVER_COORDS.lng;

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [allVenues, setAllVenues] = useState<PulzeVenue[]>([]);
  // Facet vocabulary from the server. Until the first response lands there are
  // no pills, which is correct: the app does not know what exists yet.
  const [facets, setFacets] = useState<FeedFacets>({ neighborhoods: [], categories: [] });
  // Phase 6A-1: there is no client-side personalization state any more. The
  // discover-feed Edge Function derives auth.uid() server-side and
  // pulze_discover_feed applies the 70/30 live/preference blend before it
  // returns, so the array arrives already ordered by `organic_rank`.
  // Re-sorting here would double-apply the blend.

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const timeContext = useMemo(() => getTimeContext(), []);

  const pills = useMemo(() => buildPills(facets), [facets]);

  // Translate selected pill keys into the server-side filter contract.
  // Nothing is filtered on the device any more: these go to
  // pulze_discover_feed, which applies them as hard predicates.
  //
  // THIS DERIVES FROM `activeFilters` ALONE, NEVER FROM `pills`, AND THAT IS
  // LOAD-BEARING. `pills` is derived from `facets`, and `facets` is set from
  // every feed response. Reading `pills` here put the fetch inside its own
  // output: response -> setFacets (a fresh object off the wire, so never
  // reference-equal) -> new pills -> new serverFilters -> new loadVenues ->
  // effect refires -> fetch. That is an unbounded request loop against the
  // discover-feed Edge Function for as long as Discover is open.
  //
  // It is decoupled rather than merely memo-guarded because the pill key
  // already carries everything the contract needs: type pills key into the
  // static TYPE_GROUPS table, and a neighborhood pill's key is the
  // neighborhood name behind NBHD_PILL_PREFIX. The facet list is needed to
  // decide which pills to *render*, never to interpret one that is selected.
  const serverFilters = useMemo<DiscoverFilters>(() => {
    const categories = TYPE_GROUPS
      .filter((g) => activeFilters.has(g.key))
      .flatMap((g) => g.categories);
    const neighborhoods = [...activeFilters]
      .filter((k) => k.startsWith(NBHD_PILL_PREFIX))
      .map((k) => k.slice(NBHD_PILL_PREFIX.length));
    // Busyness is single-valued server-side; if both are somehow selected
    // 'popping' wins rather than silently returning the empty intersection.
    // Checked in BUSYNESS_PILLS order so the outcome does not depend on which
    // the user happened to tap first.
    const busyness = BUSYNESS_PILLS.find((p) => activeFilters.has(p.key))?.key as
      | 'popping'
      | 'low_wait'
      | undefined;
    return { categories, neighborhoods, busyness };
  }, [activeFilters]);

  const loadVenues = useCallback(() => {
    // One authenticated call returning both the filtered venues and the facet
    // vocabulary. Coordinates feed the proximity relevance term (6A-3).
    getDiscoverFeed(userLat, userLng, serverFilters).then((res) => {
      if (!isMountedRef.current) return;
      setAllVenues(res.venues);
      // Facets are computed over ALL active venues, not the filtered set, so
      // the pill row does not collapse as the user narrows.
      setFacets(res.facets);
    });
  }, [userLat, userLng, serverFilters]);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVenues();
    setTimeout(() => {
      if (isMountedRef.current) setIsRefreshing(false);
    }, 800);
  }, [loadVenues]);

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
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Phase 6A-3: no client-side filtering and no client-side ordering. The
  // server applied the filters and returned the list in authoritative
  // `organic_rank` order; this screen renders exactly what it was given.
  const filteredVenues = allVenues;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <View style={styles.timeRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.aquaBright }]} />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{timeContext}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/activity')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Bell color={colors.textMuted} size={20} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {pills.map((pill) => {
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
                <Text style={[styles.filterPillText, { color: isActive ? '#060C10' : colors.textMuted }]}>
                  {pill.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.aqua} colors={[colors.aqua]} />
        }
      >
        {filteredVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nothing matching right now</Text>
            <Pressable onPress={() => setActiveFilters(new Set())} style={[styles.clearFiltersBtn, { borderColor: colors.borderStrong }]}>
              <Text style={[styles.clearFiltersText, { color: colors.aqua }]}>Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredVenues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} userLat={userLat} userLng={userLng} onPress={() => handleVenuePress(venue.id)} />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const VenueCard = React.memo(function VenueCard({
  venue,
  userLat,
  userLng,
  onPress,
}: {
  venue: PulzeVenue;
  userLat: number;
  userLng: number;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const photoUri = venue.photo ?? venue.photos[0];
  const displayTags = venue.tags.slice(0, 2);
  const walkMins = metersToWalkMinutes(haversineMeters(userLat, userLng, venue.latitude, venue.longitude));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
          <MapPin color={colors.aqua} size={16} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardRow1}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.cardRow1Right}>
            <Text style={[styles.walkMins, { color: colors.textMuted }]}>{walkMins}</Text>
            <View style={[styles.typeChip, { backgroundColor: colors.aqua + '14' }]}>
              <Text style={[styles.typeChipText, { color: colors.aqua }]}>{venue.typeLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRow2}>
          <MapPin color={colors.textMuted} size={10} />
          <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>{venue.neighborhood}</Text>
        </View>

        {/* Inert through all of 6A — the server hardcodes is_sponsored=false.
            Rendered from the server flag only; never inferred client-side. */}
        <SponsoredBadge isSponsored={venue.isSponsored} />

        {hasReliableBusyness(venue) ? (
          <Text style={[styles.busynessPercent, { color: colors.text }]}>{venue.busynessPercent}%</Text>
        ) : (
          <Text style={[styles.busynessPercent, { color: colors.textMuted }]}>No live data</Text>
        )}

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

const THUMBNAIL_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandBlock: { gap: 2 },
  brand: { fontSize: 22, fontWeight: '800' as const, letterSpacing: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  timeLabel: { fontSize: 13, fontWeight: '600' as const },
  filterScroll: { marginTop: 10, marginBottom: 2 },
  filterRow: { gap: 8, paddingRight: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '600' as const },
  cardList: { paddingHorizontal: 16, gap: 8, paddingTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  thumbnailPlaceholder: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  cardBody: { flex: 1, gap: 3, justifyContent: 'center' as const },
  cardRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardRow1Right: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  walkMins: { fontSize: 10, fontWeight: '600' as const },
  cardName: { fontSize: 14, fontWeight: '700' as const, flex: 1 },
  typeChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeChipText: { fontSize: 10, fontWeight: '600' as const },
  cardRow2: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '500' as const },
  metaDot: { fontSize: 11 },
  busynessPercent: { fontSize: 12, fontWeight: '600' as const },
  tagsRow: { flexDirection: 'row', gap: 5 },
  tagChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '500' as const },
  emptyState: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' as const },
  clearFiltersBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  clearFiltersText: { fontSize: 14, fontWeight: '600' as const },
});
