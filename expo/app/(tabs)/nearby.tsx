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

import { useTheme } from '@/providers/ThemeProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  DENVER_COORDS,
  getNearbyVenuesLive,
  metersToWalkMinutes,
  type NearbyVenue,
} from '@/hooks/useNearbyVenues';
import { hasReliableBusyness } from '@/types/venue';

function NearbyCard({
  venue,
  onPress,
}: {
  venue: NearbyVenue;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();

  const busynessPercent = venue.busynessPercent;
  const photoUri = venue.photoUri;
  const displayTags = (venue.tags ?? []).slice(0, 2);
  const walkMins = metersToWalkMinutes(venue.distanceMeters);

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
  const { userLocation } = useMapLocation();
  const { onScroll } = useTabScroll();

  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(true);

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const lat = userLocation?.latitude ?? DENVER_COORDS.lat;
  const lng = userLocation?.longitude ?? DENVER_COORDS.lng;

  const loadVenues = useCallback(() => {
    setIsLoadingVenues(true);
    getNearbyVenuesLive(lat, lng, 12).then((venues) => {
      if (isMountedRef.current) {
        setNearbyVenues(venues);
        setIsLoadingVenues(false);
      }
    });
  }, [lat, lng]);

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
          <Pressable
            onPress={() => router.push('/activity')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Bell color={colors.textMuted} size={20} />
          </Pressable>
        </View>
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
        {!isLoadingVenues && nearbyVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No venues nearby
            </Text>
          </View>
        ) : (
          nearbyVenues.map((venue) => (
            <NearbyCard
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

const THUMBNAIL_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  busynessPercent: { fontSize: 12, fontWeight: '600' as const },
  tagsRow: { flexDirection: 'row', gap: 5 },
  tagChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '500' as const },
  emptyState: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' as const },
});
