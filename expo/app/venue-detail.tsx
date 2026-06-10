import React, { useCallback, useMemo, useState } from 'react';
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
import {
  ArrowLeft,
  Heart,
  MapPin,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { pulzeVenues } from '@/mocks/venues';
import { getBusynessLabel, getBusynessColor, getBusynessBgColor } from '@/types/venue';
import type { PulzeVenue } from '@/types/venue';

export default function VenueDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId: string }>();
  const { isFavorited, toggleFavorite } = useFavorites();

  const venue = pulzeVenues.find((v) => v.id === params.venueId);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleHeart = useCallback(() => {
    if (!venue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(venue.id, 'venue', venue.name);
  }, [venue, toggleFavorite]);

  if (!venue) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Venue not found</Text>
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.aqua }]}>
            <Text style={[styles.backBtnText, { color: isDark ? colors.background : '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hearted = isFavorited(venue.id);
  const busynessColor = getBusynessColor(venue.busyness);
  const busynessBg = getBusynessBgColor(venue.busyness);
  const busynessLabel = getBusynessLabel(venue.busyness);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          {venue.photo ? (
            <Image source={{ uri: venue.photo }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
              <MapPin color={colors.aqua} size={48} />
            </View>
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroName} numberOfLines={2}>{venue.name}</Text>
            <View style={styles.heroChips}>
              <View style={[styles.chip, { backgroundColor: colors.aqua + '20' }]}>
                <Text style={[styles.chipText, { color: colors.aqua }]}>{venue.typeLabel}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <MapPin color="rgba(255,255,255,0.7)" size={10} />
                <Text style={[styles.chipText, { color: 'rgba(255,255,255,0.7)' }]}>{venue.neighborhood}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleBack}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          >
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Pressable
            onPress={handleHeart}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          >
            <Heart
              color={hearted ? '#FF6B6B' : '#fff'}
              size={20}
              fill={hearted ? '#FF6B6B' : 'transparent'}
            />
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Busyness gauge */}
          <View style={[styles.busynessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.busynessHeader}>
              <View style={[styles.busynessBadge, { backgroundColor: busynessBg }]}>
                <View style={[styles.busynessDot, { backgroundColor: busynessColor }]} />
                <Text style={[styles.busynessBadgeText, { color: busynessColor }]}>{busynessLabel}</Text>
              </View>
              <Text style={[styles.busynessPercent, { color: colors.text }]}>{venue.busynessPercent}% full</Text>
            </View>
            {/* Busyness bar */}
            <View style={[styles.busynessBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <View
                style={[
                  styles.busynessBarFill,
                  {
                    backgroundColor: busynessColor,
                    width: `${venue.busynessPercent}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.busynessLabels}>
              <Text style={[styles.busynessLabelSmall, { color: colors.textSoft }]}>Quiet</Text>
              <Text style={[styles.busynessLabelSmall, { color: colors.textSoft }]}>Getting Busy</Text>
              <Text style={[styles.busynessLabelSmall, { color: colors.textSoft }]}>Packed</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Users color={colors.aqua} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.checkins}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Checked in</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Users color={colors.textSoft} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.views}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Views tonight</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MapPin color={colors.aqua} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.eta}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Away</Text>
            </View>
          </View>

          {/* Vibe */}
          <View style={[styles.vibeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.vibeLabel, { color: colors.textMuted }]}>THE VIBE</Text>
            <Text style={[styles.vibeText, { color: colors.text }]}>{venue.vibe}</Text>
          </View>

          {/* Address */}
          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin color={colors.aqua} size={16} />
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>{venue.address}</Text>
          </View>

          {/* Photos */}
          {venue.photos.length > 1 && (
            <View>
              <Text style={[styles.photosHeading, { color: colors.text }]}>Photos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosRow}
              >
                {venue.photos.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={[styles.thumb, { borderColor: colors.border }]}
                  />
                ))}
              </ScrollView>
            </View>
          )}


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
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  busynessCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  busynessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  busynessBadge: {
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
  busynessBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  busynessPercent: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  busynessBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  busynessBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  busynessLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busynessLabelSmall: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  vibeCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  vibeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  vibeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  photosHeading: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  photosRow: {
    gap: 10,
    paddingRight: 4,
  },
  thumb: {
    width: 110,
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    resizeMode: 'cover',
  },


  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
  },
  errorText: {
    fontSize: 16,
  },
});
