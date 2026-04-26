import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  MapPin,
  Ticket,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { artistListings } from '@/mocks/events';
import type { ArtistListing } from '@/mocks/events';

export default function TicketsTab() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  const trendingArtists = useMemo(() => artistListings.filter(a => a.trending), []);
  const allArtists = useMemo(() => artistListings, []);

  const handleArtistTap = useCallback((artist: ArtistListing) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/ticketing', params: { venueId: artist.venueId } });
  }, [router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, contentSlide]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="tickets-tab-screen">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 260, paddingTop: insets.top + 12 }]}
      >
        <Animated.View style={{ transform: [{ translateY: contentSlide }], opacity: heroOpacity }}>
          <View style={styles.mainContent}>

            {allArtists.length === 0 ? (
              <View style={styles.emptyStateCentered}>
                <Calendar color={colors.aqua} size={48} />
                <Text style={[styles.emptyHeading, { color: colors.text }]}>Nothing on tonight</Text>
                <Text style={[styles.emptySub, { color: colors.textSoft }]}>
                  Check back later or expand your city
                </Text>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(tabs)/map');
                  }}
                  style={({ pressed }) => [styles.emptyCtaBtn, { backgroundColor: colors.aqua }, pressed && { opacity: 0.85 }]}
                  testID="explore-map-btn"
                >
                  <MapPin color="#fff" size={16} />
                  <Text style={styles.emptyCtaText}>Explore Map</Text>
                </Pressable>
              </View>
            ) : null}

            {allArtists.length > 0 ? (
            <View style={styles.sectionBlock}>
              <View style={styles.artistSectionHeader}>
                <View style={styles.artistSectionTitleRow}>
                  <Zap color={colors.coral} size={18} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Hot Right Now</Text>
                </View>
                <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>Trending artists selling fast</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScrollContent}>
                {trendingArtists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} onPress={handleArtistTap} variant="featured" />
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.artistSectionHeader}>
                <View style={styles.artistSectionTitleRow}>
                  <Ticket color={colors.aqua} size={18} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>All Events</Text>
                </View>
                <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>{allArtists.length} shows in your city</Text>
              </View>
              <View style={styles.artistGrid}>
                {allArtists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} onPress={handleArtistTap} variant="compact" />
                ))}
              </View>
            </View>
            ) : null}

          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}


const ArtistCard = React.memo(function ArtistCard({
  artist,
  onPress,
  variant,
}: {
  artist: ArtistListing;
  onPress: (artist: ArtistListing) => void;
  variant: 'featured' | 'compact';
}) {
  const { colors, isDark } = useTheme();

  if (variant === 'featured') {
    return (
      <Pressable
        onPress={() => onPress(artist)}
        style={({ pressed }) => [
          styles.featuredArtistCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
        testID={`artist-featured-${artist.id}`}
      >
        <Image source={{ uri: artist.image }} style={styles.featuredArtistImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.featuredArtistGradient}
        />
        {artist.sellingFast && (
          <View style={[styles.sellingFastBadge, { backgroundColor: colors.coral }]}>
            <Zap color="#fff" size={10} />
            <Text style={styles.sellingFastText}>Selling Fast</Text>
          </View>
        )}
        <View style={styles.featuredArtistInfo}>
          <Text style={styles.featuredArtistName} numberOfLines={1}>{artist.artistName}</Text>
          <Text style={styles.featuredArtistEvent} numberOfLines={1}>{artist.eventName}</Text>
          <View style={styles.featuredArtistMeta}>
            <Text style={styles.featuredArtistVenue}>{artist.venue}</Text>
            <View style={styles.featuredArtistDot} />
            <Text style={styles.featuredArtistDate}>{artist.date}</Text>
          </View>
          <View style={styles.featuredArtistBottom}>
            <Text style={styles.featuredArtistPrice}>From ${artist.startingPrice}</Text>
            <View style={styles.soldOutBar}>
              <View style={[styles.soldOutBarFill, { width: `${artist.soldOutPercent}%`, backgroundColor: artist.soldOutPercent > 75 ? colors.coral : colors.aqua }]} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(artist)}
      style={({ pressed }) => [
        styles.compactArtistCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`artist-compact-${artist.id}`}
    >
      <Image source={{ uri: artist.image }} style={styles.compactArtistImage} />
      <View style={styles.compactArtistInfo}>
        <View style={styles.compactArtistTop}>
          <Text style={[styles.compactArtistName, { color: colors.text }]} numberOfLines={1}>{artist.artistName}</Text>
          {artist.sellingFast && (
            <View style={[styles.compactSellingFast, { backgroundColor: isDark ? 'rgba(255,109,94,0.1)' : 'rgba(224,85,69,0.06)' }]}>
              <Text style={[styles.compactSellingFastText, { color: colors.coral }]}>{artist.soldOutPercent}% sold</Text>
            </View>
          )}
          {!artist.sellingFast && artist.trending && (
            <View style={[styles.trendingBadge, { backgroundColor: isDark ? 'rgba(255,109,94,0.12)' : 'rgba(224,85,69,0.08)' }]}>
              <TrendingUp color={colors.coral} size={10} />
            </View>
          )}
        </View>
        <Text style={[styles.compactArtistEvent, { color: colors.textMuted }]} numberOfLines={1}>{artist.eventName}</Text>
        <View style={styles.compactArtistMeta}>
          <MapPin color={colors.textSoft} size={11} />
          <Text style={[styles.compactArtistVenue, { color: colors.textSoft }]}>{artist.venue}</Text>
          <View style={[styles.compactDot, { backgroundColor: colors.textSoft }]} />
          <Text style={[styles.compactArtistDate, { color: colors.textSoft }]}>{artist.date}</Text>
        </View>
        <View style={styles.compactArtistBottom}>
          <View style={[styles.genrePill, { backgroundColor: isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)' }]}>
            <Text style={[styles.genreText, { color: colors.aqua }]}>{artist.genre}</Text>
          </View>
          <Text style={[styles.compactArtistPrice, { color: colors.text }]}>${artist.startingPrice}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  scrollContent: {
    position: 'relative',
    zIndex: 2,
  },
  mainContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  artistSectionHeader: {
    gap: 4,
  },
  artistSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artistSectionSub: {
    fontSize: 13,
    marginLeft: 26,
  },
  artistScrollContent: {
    gap: 12,
    paddingRight: 4,
    paddingTop: 4,
  },
  featuredArtistCard: {
    width: 200,
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  featuredArtistImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredArtistGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  sellingFastBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sellingFastText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  featuredArtistInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 3,
  },
  featuredArtistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800' as const,
  },
  featuredArtistEvent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  featuredArtistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  featuredArtistVenue: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  featuredArtistDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  featuredArtistDate: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  featuredArtistBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  featuredArtistPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800' as const,
  },
  soldOutBar: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  soldOutBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  artistGrid: {
    gap: 10,
    paddingTop: 4,
  },
  compactArtistCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactArtistImage: {
    width: 80,
    height: 96,
    resizeMode: 'cover',
  },
  compactArtistInfo: {
    flex: 1,
    padding: 12,
    gap: 3,
    justifyContent: 'center',
  },
  compactArtistTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactArtistName: {
    fontSize: 15,
    fontWeight: '800' as const,
    flex: 1,
  },
  trendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactArtistEvent: {
    fontSize: 12,
  },
  compactArtistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compactArtistVenue: {
    fontSize: 11,
  },
  compactDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  compactArtistDate: {
    fontSize: 11,
  },
  compactArtistBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genreText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  compactArtistPrice: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  compactSellingFast: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactSellingFastText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  emptyStateCentered: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    textAlign: 'center' as const,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
