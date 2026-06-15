import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { mockFriendCheckIns, type FriendCheckInFeedItem } from '@/mocks/friends';
import { pulzeVenues } from '@/mocks/venues';
import { getLocalCheckIns, type CheckInRecord } from '@/services/checkInDatabase';

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

export default function CheckinDetailScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ checkInId: string }>();

  const [checkIn, setCheckIn] = useState<FriendCheckInFeedItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const resolve = async () => {
      try {
        // Search local check-ins first
        const locals = await getLocalCheckIns();
        const match = locals.find((c) => c.id === params.checkInId);
        if (match) {
          setCheckIn(
            localCheckInToFeedItem(
              match,
              user?.displayName ?? 'You',
              user?.username ?? '',
              user?.id ?? '',
            ),
          );
          setLoading(false);
          return;
        }
      } catch {
        // Local storage unavailable — fall back to mock
      }

      // Fall back to mock data
      const mock = mockFriendCheckIns.find((c) => c.id === params.checkInId) ?? null;
      setCheckIn(mock);
      setLoading(false);
    };
    void resolve();
  }, [params.checkInId, user]);

  const venue = useMemo(
    () => (checkIn ? pulzeVenues.find((v) => v.id === checkIn.venueId) : undefined),
    [checkIn],
  );

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const topPanelHeight = Math.round(screenHeight * 0.23);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notFound, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!checkIn) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notFound, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Check-in not found</Text>
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { backgroundColor: colors.aqua }]}
          >
            <Text style={[styles.backBtnText, { color: isDark ? colors.background : '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const busynessPercent = venue ? `${venue.busynessPercent}%` : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top dark info panel — ~23% of screen */}
      <View
        style={[
          styles.topPanel,
          {
            backgroundColor: colors.surface,
            height: topPanelHeight,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Main info area */}
        <View style={styles.panelContent}>
          {/* Row: avatar + name … percentage */}
          <View style={styles.nameRow}>
            {checkIn.friendAvatar ? (
              <Image source={{ uri: checkIn.friendAvatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: colors.aqua + '1A' },
                ]}
              >
                <Text style={[styles.avatarInitial, { color: colors.aqua }]}>
                  {checkIn.friendName?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text
              style={[styles.friendName, { color: colors.text }]}
              numberOfLines={1}
            >
              {checkIn.friendName}
            </Text>
            <View style={styles.spacer} />
            {venue ? (
              <Text style={styles.busynessPercent}>{busynessPercent}</Text>
            ) : null}
          </View>

          {/* Row: venue name · time ago */}
          <View style={styles.subRow}>
            <Text style={[styles.venueName, { color: colors.textMuted }]}>
              {checkIn.venueName}
            </Text>
            <Text style={[styles.subDot, { color: colors.textMuted }]}>·</Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
              {checkIn.timeAgo}
            </Text>
          </View>
        </View>
      </View>

      {/* Photo — fills remaining screen space */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: checkIn.photoUri }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* Subtle caption overlay pinned to bottom of photo */}
        {checkIn.caption ? (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.captionOverlay}
            pointerEvents="none"
          >
            <Text style={styles.captionText} numberOfLines={2}>
              {checkIn.caption}
            </Text>
          </LinearGradient>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topPanel: {
    width: '100%',
  },
  panelContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  friendName: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  busynessPercent: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  venueName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  subDot: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  timeAgo: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  photoContainer: {
    flex: 1,
    width: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 21,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
  },
  notFoundText: {
    fontSize: 16,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
