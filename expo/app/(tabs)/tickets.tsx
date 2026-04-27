import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
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
  Flame,
  MapPin,
  Ticket,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useEventFeed, useHotEvents, type FeedEventItem } from '@/hooks/useEvents';
import { getLivelinessInfo } from '@/utils/liveliness';

export default function TicketsTab() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  const hotQuery = useHotEvents(10, 80);
  const feedQuery = useEventFeed(60);

  const hotEvents = hotQuery.data ?? [];
  const allEvents = feedQuery.data ?? [];

  const isLoading = hotQuery.isLoading || feedQuery.isLoading;
  const isRefreshing = hotQuery.isRefetching || feedQuery.isRefetching;
  const error = (hotQuery.error ?? feedQuery.error) as Error | null;

  const handleEventTap = useCallback((event: FeedEventItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/event-detail', params: { eventId: event.id } });
  }, [router]);

  const onRefresh = useCallback(() => {
    void hotQuery.refetch();
    void feedQuery.refetch();
  }, [hotQuery, feedQuery]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, contentSlide]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="tickets-tab-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 260, paddingTop: insets.top + 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.aqua}
            colors={[colors.aqua]}
          />
        }
      >
        <Animated.View style={{ transform: [{ translateY: contentSlide }], opacity: heroOpacity }}>
          <View style={styles.mainContent}>

            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Tickets</Text>
                <Text style={[styles.pageSub, { color: colors.textMuted }]}>Live from Ticketmaster &amp; SeatData</Text>
              </View>
            </View>

            {isLoading && allEvents.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.aqua} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading events…</Text>
              </View>
            ) : error && allEvents.length === 0 ? (
              <View style={styles.emptyStateCentered}>
                <Calendar color={colors.aqua} size={48} />
                <Text style={[styles.emptyHeading, { color: colors.text }]}>Couldn&apos;t load events</Text>
                <Text style={[styles.emptySub, { color: colors.textSoft }]}>{error.message}</Text>
                <Pressable
                  onPress={onRefresh}
                  style={({ pressed }) => [styles.emptyCtaBtn, { backgroundColor: colors.aqua }, pressed && { opacity: 0.85 }]}
                  testID="tickets-retry"
                >
                  <Text style={styles.emptyCtaText}>Try Again</Text>
                </Pressable>
              </View>
            ) : allEvents.length === 0 ? (
              <View style={styles.emptyStateCentered}>
                <Calendar color={colors.aqua} size={48} />
                <Text style={[styles.emptyHeading, { color: colors.text }]}>Nothing on tonight</Text>
                <Text style={[styles.emptySub, { color: colors.textSoft }]}>
                  Check back later — events sync every 4 hours
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
            ) : (
              <>
                {hotEvents.length > 0 ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.artistSectionHeader}>
                      <View style={styles.artistSectionTitleRow}>
                        <Flame color={colors.coral} size={18} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hot Right Now</Text>
                      </View>
                      <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>10 picks pulled from upcoming shows</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScrollContent}>
                      {hotEvents.map(event => (
                        <FeaturedEventCard key={event.id} event={event} onPress={handleEventTap} />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <View style={styles.sectionBlock}>
                  <View style={styles.artistSectionHeader}>
                    <View style={styles.artistSectionTitleRow}>
                      <Ticket color={colors.aqua} size={18} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>All Events</Text>
                    </View>
                    <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>{allEvents.length} upcoming shows</Text>
                  </View>
                  <View style={styles.artistGrid}>
                    {allEvents.map(event => (
                      <CompactEventCard key={event.id} event={event} onPress={handleEventTap} />
                    ))}
                  </View>
                </View>
              </>
            )}

          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function formatEventDate(date: Date): string {
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (sameDay) {
    return `Tonight, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const FeaturedEventCard = React.memo(function FeaturedEventCard({
  event,
  onPress,
}: {
  event: FeedEventItem;
  onPress: (event: FeedEventItem) => void;
}) {
  const { colors, isDark } = useTheme();
  const heroUrl = event.heroImageUrl ?? event.imageUrl;
  const live = getLivelinessInfo(event.liveliness);
  const dateStr = formatEventDate(event.date);

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={({ pressed }) => [
        styles.featuredArtistCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      testID={`event-featured-${event.id}`}
    >
      {heroUrl ? (
        <Image source={{ uri: heroUrl }} style={styles.featuredArtistImage} />
      ) : (
        <View style={[styles.featuredArtistImage, styles.placeholderImage, { backgroundColor: isDark ? '#0F2A34' : '#DCE9EF' }]}>
          <Ticket color={colors.aqua} size={28} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.featuredArtistGradient}
      />
      {event.isHot ? (
        <View style={[styles.sellingFastBadge, { backgroundColor: colors.coral }]}>
          <Flame color="#fff" size={10} />
          <Text style={styles.sellingFastText}>Almost Gone</Text>
        </View>
      ) : event.isSellingFast ? (
        <View style={[styles.sellingFastBadge, { backgroundColor: colors.amber }]}>
          <Zap color="#fff" size={10} />
          <Text style={styles.sellingFastText}>Selling Fast</Text>
        </View>
      ) : event.isTrending ? (
        <View style={[styles.sellingFastBadge, { backgroundColor: colors.aqua }]}>
          <TrendingUp color="#fff" size={10} />
          <Text style={styles.sellingFastText}>Trending</Text>
        </View>
      ) : null}

      <View style={styles.featuredArtistInfo}>
        <Text style={styles.featuredArtistName} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.featuredArtistEvent} numberOfLines={1}>
          {event.source === 'ticketmaster' ? 'Ticketmaster' : 'SeatData'}
        </Text>
        <View style={styles.featuredArtistMeta}>
          <Text style={styles.featuredArtistVenue} numberOfLines={1}>{event.venueName ?? 'TBA'}</Text>
          <View style={styles.featuredArtistDot} />
          <Text style={styles.featuredArtistDate} numberOfLines={1}>{dateStr}</Text>
        </View>
        <View style={styles.featuredArtistBottom}>
          <Text style={styles.featuredArtistPrice}>
            {event.minPrice !== null ? `From $${Math.round(event.minPrice)}` : 'Tickets'}
          </Text>
          {live.score !== null ? (
            <View style={styles.soldOutBar}>
              <View style={[styles.soldOutBarFill, { width: `${Math.min(100, Math.max(4, live.score))}%`, backgroundColor: live.color }]} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const CompactEventCard = React.memo(function CompactEventCard({
  event,
  onPress,
}: {
  event: FeedEventItem;
  onPress: (event: FeedEventItem) => void;
}) {
  const { colors, isDark } = useTheme();
  const dateStr = formatEventDate(event.date);
  const live = getLivelinessInfo(event.liveliness);

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={({ pressed }) => [
        styles.compactArtistCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`event-compact-${event.id}`}
    >
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.compactArtistImage} />
      ) : (
        <View style={[styles.compactArtistImage, styles.placeholderImage, { backgroundColor: isDark ? '#0F2A34' : '#DCE9EF' }]}>
          <Ticket color={colors.aqua} size={20} />
        </View>
      )}
      <View style={styles.compactArtistInfo}>
        <View style={styles.compactArtistTop}>
          <Text style={[styles.compactArtistName, { color: colors.text }]} numberOfLines={1}>{event.name}</Text>
          {event.isHot ? (
            <View style={[styles.compactSellingFast, { backgroundColor: isDark ? 'rgba(255,109,94,0.1)' : 'rgba(224,85,69,0.06)' }]}>
              <Text style={[styles.compactSellingFastText, { color: colors.coral }]}>
                {Math.round(event.liveliness ?? 0)}% sold
              </Text>
            </View>
          ) : event.isSellingFast ? (
            <View style={[styles.compactSellingFast, { backgroundColor: isDark ? 'rgba(232,168,48,0.14)' : 'rgba(232,168,48,0.10)' }]}>
              <Text style={[styles.compactSellingFastText, { color: colors.amber }]}>
                Selling fast
              </Text>
            </View>
          ) : event.isTrending ? (
            <View style={[styles.trendingBadge, { backgroundColor: isDark ? 'rgba(43,191,186,0.12)' : 'rgba(26,158,153,0.08)' }]}>
              <TrendingUp color={colors.aqua} size={10} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.compactArtistEvent, { color: colors.textMuted }]} numberOfLines={1}>
          {event.source === 'ticketmaster' ? 'Ticketmaster' : 'SeatData'}
          {event.recentSales > 0 ? ` · ${event.recentSales} sold this week` : ''}
        </Text>
        <View style={styles.compactArtistMeta}>
          <MapPin color={colors.textSoft} size={11} />
          <Text style={[styles.compactArtistVenue, { color: colors.textSoft }]} numberOfLines={1}>
            {event.venueName ?? 'Venue TBA'}
          </Text>
          <View style={[styles.compactDot, { backgroundColor: colors.textSoft }]} />
          <Text style={[styles.compactArtistDate, { color: colors.textSoft }]} numberOfLines={1}>{dateStr}</Text>
        </View>
        <View style={styles.compactArtistBottom}>
          {live.label && live.label !== 'UNKNOWN' ? (
          <View style={[styles.genrePill, { backgroundColor: live.color + '20' }]}>
            <Text style={[styles.genreText, { color: live.color }]}>
              {live.emoji} {live.label}
            </Text>
          </View>
          ) : (
          <View style={[styles.genrePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.genreText, { color: colors.textMuted }]}>
              Tickets
            </Text>
          </View>
          )}
          <Text style={[styles.compactArtistPrice, { color: colors.text }]}>
            {event.minPrice !== null ? `$${Math.round(event.minPrice)}` : '—'}
          </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
    letterSpacing: 0.2,
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
  placeholderImage: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  featuredArtistEvent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
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
    flexShrink: 1,
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
    fontSize: 13,
    fontWeight: '800' as const,
  },
  soldOutBar: {
    width: 60,
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
    fontSize: 14,
    fontWeight: '800' as const,
    flex: 1,
    letterSpacing: -0.1,
  },
  trendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactArtistEvent: {
    fontSize: 11,
  },
  compactArtistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compactArtistVenue: {
    fontSize: 11,
    flexShrink: 1,
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
    fontWeight: '800' as const,
    letterSpacing: 0.3,
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
  loadingState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
