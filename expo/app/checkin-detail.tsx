import React, { useCallback, useMemo } from 'react';
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
import { ArrowLeft } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { mockFriendCheckIns } from '@/mocks/friends';
import { pulzeVenues } from '@/mocks/venues';

export default function CheckinDetailScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ checkInId: string }>();

  const checkIn = useMemo(
    () => mockFriendCheckIns.find((c) => c.id === params.checkInId),
    [params.checkInId],
  );

  const venue = useMemo(
    () => (checkIn ? pulzeVenues.find((v) => v.id === checkIn.venueId) : undefined),
    [checkIn],
  );

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const topPanelHeight = Math.round(screenHeight * 0.23);

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
        {/* Back button */}
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            style={[
              styles.backCircle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
        </View>

        {/* Main info area */}
        <View style={styles.panelContent}>
          {/* Row: avatar + name … percentage */}
          <View style={styles.nameRow}>
            <Image source={{ uri: checkIn.friendAvatar }} style={styles.avatar} />
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
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
