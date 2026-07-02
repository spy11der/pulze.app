import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ListRenderItem,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  type FriendCheckInFeedItem,
  type ProximityHint,
  mockFriendCheckIns,
  mockProximityHint,
} from '@/mocks/friends';
import { pulzeVenues } from '@/mocks/venues';
import { getLocalCheckIns, type CheckInRecord } from '@/services/checkInDatabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CARD_TOP_PANEL = 62;
const CARD_PHOTO_HEIGHT = CARD_WIDTH * 1.05;

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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

function localCheckInToFeedItem(
  c: CheckInRecord & { id: string },
  displayName: string,
  username: string,
  userId: string,
): FriendCheckInFeedItem {
  return {
    id: c.id,
    friendName: displayName || 'You',
    friendHandle: username || '',
    friendAvatar: '',
    friendId: userId,
    venueName: c.venueName,
    venueId: c.venueId,
    neighborhood: c.neighborhood,
    photoUri: c.photoUri ?? '',
    timeAgo: getTimeAgo(c.capturedAt),
    caption: c.quip ?? undefined,
  };
}

export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { userLocation } = useMapLocation();
  const { onScroll } = useTabScroll();

  const [localFeedItems, setLocalFeedItems] = useState<FriendCheckInFeedItem[]>([]);

  const loadLocal = useCallback(async () => {
    try {
      const locals = await getLocalCheckIns();
      const visible = locals.filter((c) => c.photoVisibility && c.photoUri);
      const items = visible.map((c) =>
        localCheckInToFeedItem(
          c,
          user?.displayName ?? 'You',
          user?.username ?? '',
          user?.id ?? '',
        ),
      );
      setLocalFeedItems(items);
    } catch {
      // Local storage unavailable — feed falls back to mock data
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadLocal();
    }, [loadLocal]),
  );

  const feedItems = useMemo(() => {
    // Real check-ins first, then mock friend check-ins
    return [...localFeedItems, ...mockFriendCheckIns];
  }, [localFeedItems]);

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
    ({ item }) => {
      const venue = pulzeVenues.find((v) => v.id === item.venueId);
      const busynessPercent = venue ? `${venue.busynessPercent}%` : '';

      return (
        <Pressable
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.feedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            pressed && { opacity: 0.92 },
          ]}
        >
          {/* Top info panel */}
          <View style={[styles.cardPanel, { backgroundColor: colors.surface }]}>
            {/* Row: avatar + name … busyness */}
            <View style={styles.cardNameRow}>
              {item.friendAvatar ? (
                <Image
                  source={{ uri: item.friendAvatar }}
                  style={styles.cardAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.cardAvatarPlaceholder,
                    { backgroundColor: colors.aqua + '1A' },
                  ]}
                >
                  <Text style={[styles.cardAvatarInitial, { color: colors.aqua }]}>
                    {item.friendName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.cardName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.friendName}
              </Text>
              <View style={styles.cardSpacer} />
              {busynessPercent !== '' ? (
                <Text style={styles.cardBusyness}>{busynessPercent}</Text>
              ) : null}
            </View>

            {/* Row: venue · time ago */}
            <View style={styles.cardSubRow}>
              <Text style={[styles.cardVenue, { color: colors.textMuted }]}>
                {item.venueName}
              </Text>
              <Text style={[styles.cardDot, { color: colors.textMuted }]}>·</Text>
              <Text style={[styles.cardTime, { color: colors.textMuted }]}>
                {item.timeAgo}
              </Text>
            </View>
          </View>

          {/* Photo fills the rest */}
          <View style={styles.cardPhotoContainer}>
            <Image
              source={{ uri: item.photoUri }}
              style={styles.cardPhoto}
              resizeMode="cover"
            />

            {/* Caption overlay */}
            {item.caption ? (
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cardCaptionOverlay}
                pointerEvents="none"
              >
                <Text style={styles.cardCaptionText} numberOfLines={1}>
                  {item.caption}
                </Text>
              </LinearGradient>
            ) : null}
          </View>
        </Pressable>
      );
    },
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
          {proximityHint.friendName} is {proximityHint.distanceLabel} ·{' '}
          {proximityHint.venueBusynessLabel}
        </Text>
      </Pressable>
    );
  }, [proximityHint, colors, handleProximityPress]);

  const keyExtractor = useCallback((item: FriendCheckInFeedItem) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Crew check-ins
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/activity')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Bell color={colors.textMuted} size={20} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

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
    padding: CARD_PADDING,
    paddingTop: 4,
  },

  // Feed card — same structure as checkin-detail
  feedCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cardAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarInitial: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  cardSpacer: {
    flex: 1,
  },
  cardBusyness: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardVenue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardDot: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '500' as const,
  },

  // Photo section
  cardPhotoContainer: {
    width: '100%',
    height: CARD_PHOTO_HEIGHT,
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  cardCaptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cardCaptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },

  // Proximity bar
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
