import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, MapPin } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  type FriendCheckInFeedItem,
  type ProximityHint,
  mockFriendCheckIns,
  mockProximityHint,
} from '@/mocks/friends';
import { pulzeVenues } from '@/mocks/venues';

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function metersToMinutesAway(meters: number): string {
  const walkingSpeedMps = 1.4;
  const minutes = Math.round(meters / walkingSpeedMps / 60);
  if (minutes < 1) return '1 min away';
  return `${minutes} min away`;
}

function computeProximityHint(
  userLat: number | undefined,
  userLng: number | undefined,
  baseHint: ProximityHint | null,
): ProximityHint | null {
  if (!baseHint || userLat == null || userLng == null) return baseHint;

  const hintedVenue = pulzeVenues.find((v) => v.id === baseHint.venueId);
  if (!hintedVenue) return baseHint;

  const meters = haversineMeters(
    userLat,
    userLng,
    hintedVenue.latitude,
    hintedVenue.longitude,
  );

  return {
    ...baseHint,
    distanceLabel: metersToMinutesAway(meters),
    venueBusynessLabel: `${hintedVenue.name} is ${hintedVenue.busyness === 'packed' ? 'popping right now' : hintedVenue.busyness === 'getting_busy' ? 'picking up' : 'quiet right now'}`,
  };
}

export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { userLocation } = useMapLocation();
  const { onScroll } = useTabScroll();

  const proximityHint = useMemo<ProximityHint | null>(() => {
    return computeProximityHint(
      userLocation?.latitude,
      userLocation?.longitude,
      mockProximityHint,
    );
  }, [userLocation]);

  const handleItemPress = useCallback(
    (item: FriendCheckInFeedItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/checkin-detail',
        params: { checkInId: item.id },
      });
    },
    [router],
  );

  const handleProximityPress = useCallback(
    (hint: ProximityHint) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/venue-detail',
        params: { venueId: hint.venueId },
      });
    },
    [router],
  );

  const renderItem: ListRenderItem<FriendCheckInFeedItem> = useCallback(
    ({ item }) => (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={({ pressed }) => [
          styles.feedItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Image source={{ uri: item.photoUri }} style={styles.thumbnail} />
        <View style={styles.itemBody}>
          <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
            {item.friendName}
          </Text>
          <Text style={[styles.venueName, { color: colors.textSoft }]} numberOfLines={1}>
            {item.venueName}
          </Text>
          <View style={styles.itemMetaRow}>
            <MapPin color={colors.textMuted} size={10} />
            <Text style={[styles.neighborhood, { color: colors.textMuted }]} numberOfLines={1}>
              {item.neighborhood}
            </Text>
            <Text style={[styles.timeDot, { color: colors.textMuted }]}>·</Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{item.timeAgo}</Text>
          </View>
        </View>
      </Pressable>
    ),
    [colors, handleItemPress],
  );

  const renderHeader = useCallback(() => {
    if (!proximityHint) return null;

    return (
      <Pressable
        onPress={() => handleProximityPress(proximityHint)}
        style={({ pressed }) => [
          styles.proximityBar,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={[styles.proximityDot, { backgroundColor: colors.aqua }]} />
        <Text style={[styles.proximityText, { color: colors.textMuted }]} numberOfLines={1}>
          {proximityHint.friendName} is {proximityHint.distanceLabel} · {proximityHint.venueBusynessLabel}
        </Text>
      </Pressable>
    );
  }, [proximityHint, colors, handleProximityPress]);

  const keyExtractor = useCallback((item: FriendCheckInFeedItem) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/activity')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Bell color={colors.textMuted} size={20} />
          </Pressable>
          <View>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Crew check-ins</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={mockFriendCheckIns}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const THUMBNAIL_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 2,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,

  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemBody: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  venueName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  neighborhood: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  timeDot: {
    fontSize: 11,
  },
  timeAgo: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  proximityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  proximityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  proximityText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
});
