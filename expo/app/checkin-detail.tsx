import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, MapPin } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { mockFriendCheckIns } from '@/mocks/friends';
import { pulzeVenues } from '@/mocks/venues';
import { getBusynessLabel } from '@/types/venue';

export default function CheckinDetailScreen() {
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

  const busynessLabel = venue ? getBusynessLabel(venue.busyness) : '';
  const busynessPercent = venue ? `${venue.busynessPercent}%` : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
      >
        {/* Hero photo */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: checkIn.photoUri }} style={styles.heroImage} />
          <View style={styles.heroGradient} />

          {/* Friend info overlaid at bottom of photo */}
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{checkIn.friendName}</Text>
            {checkIn.caption ? (
              <Text style={styles.heroCaption} numberOfLines={3}>{checkIn.caption}</Text>
            ) : null}
          </View>

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={handleBack}
              style={styles.backCircle}
            >
              <ArrowLeft color="#fff" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Minimal info below photo */}
        <View style={styles.info}>
          <View style={styles.venueRow}>
            <MapPin color={colors.textMuted} size={13} />
            <Text style={[styles.venueName, { color: colors.textMuted }]}>{checkIn.venueName}</Text>
            <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{checkIn.timeAgo}</Text>
          </View>

          {/* Busyness — simple white text, no bar */}
          {venue ? (
            <Text style={[styles.busyness, { color: colors.text }]}>
              {busynessLabel} · {busynessPercent} full
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  heroWrap: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 6,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroCaption: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  venueName: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dot: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  timeAgo: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  busyness: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
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
