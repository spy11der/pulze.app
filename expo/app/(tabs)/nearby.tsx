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
import { Bell, Clock, MapPin, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  getNearbyVenuesLive,
  metersToWalkMinutes,
  type NearbyVenue,
} from '@/hooks/useNearbyVenues';
import { SponsoredBadge } from '@/components/SponsoredBadge';
import { NEARBY_RADIUS_M } from '@/services/venues';
import {
  buildHappeningNowIndex,
  fetchHappyHoursHappeningNow,
  formatLocalTimeLabel,
  type HappyHourNow,
} from '@/services/happyHours';
import { hasReliableBusyness } from '@/types/venue';
import { recordSponsoredOpen } from '@/services/venues';

function NearbyCard({
  venue,
  onPress,
  happyHourNow,
}: {
  venue: NearbyVenue;
  onPress: () => void;
  happyHourNow?: HappyHourNow;
}) {
  const { colors, isDark } = useTheme();

  const busynessPercent = venue.busynessPercent;
  const photoUri = venue.photoUri;
  const displayTags = (venue.tags ?? []).slice(0, 2);
  const walkMins = metersToWalkMinutes(venue.distanceMeters);
  const happyHourEndsLabel = happyHourNow ? formatLocalTimeLabel(happyHourNow.ends_at_local) : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
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
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={styles.cardRow1Right}>
            <Text style={[styles.walkMins, { color: colors.textMuted }]}>{walkMins}</Text>
            <View style={[styles.typeChip, { backgroundColor: colors.aqua + '14' }]}>
              <Text style={[styles.typeChipText, { color: colors.aqua }]}>
                {venue.categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRow2}>
          <MapPin color={colors.textMuted} size={10} />
          <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
            {venue.neighborhood}
          </Text>
        </View>

        {/* Inert through all of 6A -- the server hardcodes is_sponsored=false.
            Rendered from the server flag only; never inferred client-side. */}
        <SponsoredBadge isSponsored={venue.isSponsored} />

        {happyHourNow ? (
          <View style={styles.happyHourRow}>
            <Clock color={colors.amber} size={11} />
            <Text style={[styles.happyHourText, { color: colors.amber }]} numberOfLines={1}>
              Happy Hour now{happyHourEndsLabel ? ` · until ${happyHourEndsLabel}` : ''}
            </Text>
          </View>
        ) : null}

        {hasReliableBusyness(venue) ? (
          <Text style={[styles.busynessPercent, { color: colors.text }]}>
            {busynessPercent}%
          </Text>
        ) : (
          <Text style={[styles.busynessPercent, { color: colors.textMuted }]}>
            No live data
          </Text>
        )}

        {displayTags.length > 0 && (
          <View style={styles.tagsRow}>
            {displayTags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { userLocation, hasResolved } = useMapLocation();
  const { onScroll } = useTabScroll();

  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(true);
  // Phase 6A-1: no client-side personalization state. pulze_discover_feed
  // applies the limit and then the 70/30 blend server-side, in that order --
  // which is exactly what this screen used to do by slicing and only then
  // calling blendVenueOrder. The array arrives final.
  // venue_id -> current happy-hour row (empty until the RPC resolves).
  const [happeningNow, setHappeningNow] = useState<Map<string, HappyHourNow>>(() => new Map());
  const [showOnlyHappyHour, setShowOnlyHappyHour] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // "Near you" means near you: no stand-in coordinates. Without a real fix
  // this screen asks for location instead of showing some other city.
  const lat = userLocation?.latitude ?? null;
  const lng = userLocation?.longitude ?? null;

  const loadVenues = useCallback(() => {
    if (lat == null || lng == null) {
      if (hasResolved) {
        setNearbyVenues([]);
        setIsLoadingVenues(false);
      }
      return;
    }
    setIsLoadingVenues(true);
    // Phase 6B: this screen renders SponsoredBadge on every card, so it may
    // receive disclosed placements. The Happy Hour filter is applied by the
    // SERVER (a hard filter, like category), so a client-side filter can never
    // drop or shift a sponsored row out of its disclosed position.
    getNearbyVenuesLive(lat, lng, 12, { placements: true, happyHourNow: showOnlyHappyHour }).then((venues) => {
      if (isMountedRef.current) {
        setNearbyVenues(venues);
        setIsLoadingVenues(false);
      }
    });
    // Happy Hour Now runs in parallel over the same circle as the venue
    // list; a failure leaves the map empty and the filter falls back to
    // "no venues currently in HH".
    void fetchHappyHoursHappeningNow({ lat, lng, radiusM: NEARBY_RADIUS_M }).then((rows) => {
      if (isMountedRef.current) setHappeningNow(buildHappeningNowIndex(rows));
    });
  }, [lat, lng, hasResolved, showOnlyHappyHour]);

  // The server already ordered this list (organic_rank). Kept as a named
  // value so the happy-hour filter below reads the same way it did before;
  // re-sorting here would double-apply the personalization blend.
  const orderedVenues = nearbyVenues;

  // Already filtered server-side when Happy Hour Now is on. Never re-filter
  // or re-sort here: sponsored rows must stay where the server placed them.
  const visibleVenues = orderedVenues;

  const happyHourCount = useMemo(
    () => orderedVenues.reduce((n, v) => n + (happeningNow.has(v.id) ? 1 : 0), 0),
    [orderedVenues, happeningNow],
  );

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVenues();
    setTimeout(() => {
      if (isMountedRef.current) setIsRefreshing(false);
    }, 800);
  }, [loadVenues]);

  const handleVenuePress = useCallback(
    (venueId: string, sponsoredPlacementId?: string | null) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Opening detail from a sponsored card is the CPC billable event (6B).
      // Fire-and-forget; navigation never waits on it.
      recordSponsoredOpen(sponsoredPlacementId);
      router.push({ pathname: '/venue-detail', params: { venueId } });
    },
    [router],
  );

  const toggleHappyHourFilter = useCallback(() => {
    void Haptics.selectionAsync();
    setShowOnlyHappyHour((prev) => !prev);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <View style={styles.timeRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.aquaBright }]} />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Near you, right now</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/search')}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              hitSlop={8}
              accessibilityLabel="Search venues"
              testID="open-search"
            >
              <Search color={colors.textMuted} size={20} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/activity')}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Bell color={colors.textMuted} size={20} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <Pressable
            onPress={toggleHappyHourFilter}
            style={[
              styles.filterPill,
              {
                backgroundColor: showOnlyHappyHour
                  ? colors.amber
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                borderColor: showOnlyHappyHour ? colors.amber : 'transparent',
              },
            ]}
          >
            <Clock color={showOnlyHappyHour ? '#060C10' : colors.amber} size={12} />
            <Text
              style={[
                styles.filterPillText,
                { color: showOnlyHappyHour ? '#060C10' : colors.textMuted },
              ]}
            >
              Happy Hour Now{happyHourCount > 0 ? ` · ${happyHourCount}` : ''}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.aqua}
            colors={[colors.aqua]}
          />
        }
      >
        {!isLoadingVenues && lat == null ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Turn on location to see what&apos;s near you
            </Text>
          </View>
        ) : !isLoadingVenues && nearbyVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No venues nearby
            </Text>
          </View>
        ) : !isLoadingVenues && showOnlyHappyHour && visibleVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No happy hour running nearby right now
            </Text>
          </View>
        ) : (
          visibleVenues.map((venue) => (
            <NearbyCard
              key={venue.id}
              venue={venue}
              happyHourNow={happeningNow.get(venue.id)}
              onPress={() => handleVenuePress(venue.id, venue.isSponsored ? venue.placementId : null)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const THUMBNAIL_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  brand: { fontSize: 22, fontWeight: '800' as const, letterSpacing: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  timeLabel: { fontSize: 13, fontWeight: '600' as const },
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
  happyHourRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  happyHourText: { fontSize: 11, fontWeight: '700' as const },
  busynessPercent: { fontSize: 12, fontWeight: '600' as const },
  filterScroll: { marginTop: 10, marginBottom: 2 },
  filterRow: { gap: 8, paddingRight: 16 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '600' as const },
  tagsRow: { flexDirection: 'row', gap: 5 },
  tagChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '500' as const },
  emptyState: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' as const },
});
