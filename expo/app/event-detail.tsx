import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Flame,
  Heart,
  MapPin,
  Navigation,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { DirectionsSheet } from '@/components/DirectionsSheet';
import { useEventDetail } from '@/hooks/useEvents';
import { getLivelinessInfo } from '@/utils/liveliness';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId?: string; eventId?: string }>();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [directionsVisible, setDirectionsVisible] = useState<boolean>(false);

  const liveEventId = params.eventId ?? null;
  const { data: liveEvent, isLoading: liveLoading, error: liveError } = useEventDetail(liveEventId);

  return (
    <LiveEventDetail
      loading={liveLoading}
      error={liveError as Error | null}
      event={liveEvent}
      directionsVisible={directionsVisible}
      setDirectionsVisible={setDirectionsVisible}
      isFavorited={isFavorited}
      toggleFavorite={toggleFavorite}
      onBack={() => router.back()}
      onBuyTickets={(eventId: string) => router.push({ pathname: '/ticketing', params: { eventId } })}
      insets={insets}
      colors={colors}
      isDark={isDark}
    />
  );
}

// =============== Live Event from Supabase ===============

type LiveEvent = NonNullable<ReturnType<typeof useEventDetail>['data']>;

function LiveEventDetail({
  loading,
  error,
  event,
  directionsVisible,
  setDirectionsVisible,
  isFavorited,
  toggleFavorite,
  onBack,
  insets,
  colors,
  isDark,
}: {
  loading: boolean;
  error: Error | null;
  event: LiveEvent | null | undefined;
  directionsVisible: boolean;
  setDirectionsVisible: (v: boolean) => void;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (id: string, kind: 'venue' | 'event', name: string) => void;
  onBack: () => void;
  onBuyTickets: (eventId: string) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const [checkedIn, setCheckedIn] = useState(false);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]} testID="event-detail-loading">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.aqua} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading event…</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]} testID="event-detail-error">
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Event not available</Text>
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>
          {error?.message ?? 'This event could not be loaded.'}
        </Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.errorBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
          testID="event-detail-error-back"
        >
          <Text style={[styles.errorBtnText, { color: isDark ? colors.background : '#fff' }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const heart = isFavorited(event.id);
  const heroImg = event.heroImageUrl ?? event.images[0]?.url ?? null;
  const live = getLivelinessInfo(event.liveliness);
  const dateObj = new Date(event.start_date_time);
  const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const description = event.details?.description ?? event.details?.info ?? null;
  const venueAddress = event.details?.venue_address ?? [event.venue_city, event.venue_state].filter(Boolean).join(', ');
  const livelinessPct = event.liveliness !== null ? Math.round(event.liveliness) : null;
  const ticketsLeft = event.capacity !== null ? Math.max(event.capacity - event.activeListings, 0) : null;

  const handleHeart = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(event.id, 'event', event.name);
  };

  const handleDirections = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  };

  const handleBuyTickets = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (event.url) {
      Linking.openURL(event.url).catch((e) => console.log('[event-detail] openURL error', e));
    } else {
      onBuyTickets(event.id);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="event-detail-live">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (event.url ? 110 : 24) }]}
      >
        <View style={styles.heroContainer}>
          {heroImg ? (
            <Image source={{ uri: heroImg }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: colors.surfaceAlt }]} />
          )}
          <View style={styles.heroDarken} />
          <View style={styles.heroNameOverlay}>
            <Text style={styles.heroTitle} numberOfLines={2}>{event.name}</Text>
            {event.venue_name ? (
              <Text style={styles.heroTagline} numberOfLines={1}>
                {event.venue_name}{event.venue_city ? ` · ${event.venue_city}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleBack}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            testID="event-detail-back"
          >
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Pressable
            onPress={handleHeart}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            testID="event-detail-heart"
          >
            <Heart color={heart ? '#FF6B6B' : '#fff'} size={20} fill={heart ? '#FF6B6B' : 'transparent'} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.tagsRow}>
            <View style={[styles.tagPill, { backgroundColor: event.source === 'ticketmaster' ? 'rgba(43,191,186,0.16)' : 'rgba(232,168,48,0.16)' }]}>
              <Text style={[styles.tagText, { color: event.source === 'ticketmaster' ? '#2BBFBA' : '#E8A830' }]}>
                {event.source === 'ticketmaster' ? 'Ticketmaster' : 'SeatData'}
              </Text>
            </View>
            {event.isHot ? (
              <View style={[styles.tagPill, { backgroundColor: 'rgba(232,68,58,0.14)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Flame color="#E8443A" size={11} />
                <Text style={[styles.tagText, { color: '#E8443A' }]}>Almost Gone</Text>
              </View>
            ) : event.isSellingFast ? (
              <View style={[styles.tagPill, { backgroundColor: 'rgba(232,168,48,0.16)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Zap color="#E8A830" size={11} />
                <Text style={[styles.tagText, { color: '#E8A830' }]}>Selling Fast</Text>
              </View>
            ) : event.isTrending ? (
              <View style={[styles.tagPill, { backgroundColor: 'rgba(43,191,186,0.16)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <TrendingUp color="#2BBFBA" size={11} />
                <Text style={[styles.tagText, { color: '#2BBFBA' }]}>Trending</Text>
              </View>
            ) : null}
            {event.capacity !== null ? (
              <View style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.tagText, { color: colors.textMuted }]}>
                  Capacity {event.capacity.toLocaleString()}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Calendar color={colors.aqua} size={16} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{dateStr}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{timeStr}</Text>
              </View>
            </View>
            {event.venue_name ? (
              <>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                  <MapPin color={colors.aqua} size={16} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{event.venue_name}</Text>
                    <Text style={[styles.infoSub, { color: colors.textMuted }]} numberOfLines={2}>
                      {venueAddress || '—'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Liveliness — only show if we have real data */}
          {livelinessPct !== null ? (
            <View style={[styles.livelinessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.livelinessHeader}>
                <Text style={[styles.livelinessTitle, { color: colors.text }]}>Demand</Text>
                <View style={[styles.livelinessBadge, { backgroundColor: live.color + '22' }]}>
                  <Text style={[styles.livelinessBadgeText, { color: live.color }]}>
                    {live.emoji}  {live.label}
                  </Text>
                </View>
              </View>
              <View style={[styles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(100, Math.max(2, livelinessPct))}%`, backgroundColor: live.color },
                  ]}
                />
              </View>
              <View style={styles.livelinessMeta}>
                <Text style={[styles.livelinessStat, { color: colors.text }]}>{livelinessPct}% sold</Text>
                {ticketsLeft !== null ? (
                  <Text style={[styles.livelinessStatSub, { color: colors.textMuted }]}>
                    ~{ticketsLeft.toLocaleString()} tickets remaining
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
          {(event.activeListings > 0 || event.minPrice !== null || event.recentSales > 0) ? (
          <View style={styles.statsRow}>
            {event.activeListings > 0 ? (
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Zap color={colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {event.activeListings.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Listings</Text>
            </View>
            ) : null}
            {event.minPrice !== null ? (
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Ticket color={colors.aqua} size={15} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {event.minPrice === event.maxPrice
                    ? `$${Math.round(event.minPrice)}`
                    : `$${Math.round(event.minPrice)}–$${Math.round(event.maxPrice ?? event.minPrice)}`}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Price</Text>
              </View>
            ) : (
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Ticket color={colors.aqua} size={15} />
                <Text style={[styles.statValue, { color: colors.text }]}>—</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Price</Text>
              </View>
            )}
            {event.recentSales > 0 ? (
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <TrendingUp color={colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {event.recentSales.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sold (7d)</Text>
            </View>
            ) : null}
          </View>
          ) : null}

          {description ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{description}</Text>
            </View>
          ) : null}

          {event.details?.accessibility_info ? (
            <View style={[styles.insightCard, { backgroundColor: isDark ? '#0F2A34' : '#E4F0F4' }]}>
              <View style={styles.insightHeader}>
                <Sparkles color={colors.aqua} size={14} />
                <Text style={[styles.insightHeaderText, { color: colors.aqua }]}>Accessibility</Text>
              </View>
              <Text style={[styles.insightValue, { color: colors.textMuted }]}>
                {event.details.accessibility_info}
              </Text>
            </View>
          ) : null}

          {event.venueLat && event.venueLng && Platform.OS !== 'web' ? (
            <View style={[styles.mapCard, { borderColor: colors.border }]}>
              <MapView
                style={styles.mapInner}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: event.venueLat,
                  longitude: event.venueLng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                pointerEvents="none"
                liteMode={Platform.OS === 'android'}
              >
                <Marker coordinate={{ latitude: event.venueLat, longitude: event.venueLng }} />
              </MapView>
            </View>
          ) : null}

          {/* I'm Here check-in button */}
          <Pressable
            onPress={() => {
              if (checkedIn) return;
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCheckedIn(true);
              if (Platform.OS === 'android') {
                ToastAndroid.show('Check-in recorded!', ToastAndroid.SHORT);
              } else {
                Alert.alert('Check-in recorded!');
              }
            }}
            style={({ pressed }) => [
              styles.checkInBtn,
              checkedIn && styles.checkInBtnDone,
              pressed && styles.pressed,
            ]}
            testID="event-detail-checkin"
          >
            <MapPin color="#041318" size={18} />
            <Text style={styles.checkInText}>
              {checkedIn ? "You're Here ✓" : "I'm Here"}
            </Text>
          </Pressable>

          {/* Directions + Save row */}
          <View style={styles.actionsRow}>
            {event.venueLat && event.venueLng ? (
              <Pressable
                onPress={handleDirections}
                style={({ pressed }) => [
                  styles.directionsBtn,
                  { backgroundColor: colors.aqua },
                  pressed && styles.pressed,
                ]}
                testID="event-detail-directions-btn"
              >
                <Navigation color="#fff" size={16} />
                <Text style={styles.directionsBtnText}>Get there now</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleFavorite(event.id, 'event', event.name);
              }}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  borderColor: heart ? colors.aqua : colors.border,
                  backgroundColor: heart
                    ? isDark ? 'rgba(43,191,186,0.1)' : 'rgba(43,191,186,0.08)'
                    : 'transparent',
                },
                pressed && styles.pressed,
              ]}
              testID="event-detail-save-btn"
            >
              <Heart
                color={heart ? colors.aqua : colors.textMuted}
                size={16}
                fill={heart ? colors.aqua : 'transparent'}
              />
              <Text style={[styles.saveBtnText, { color: heart ? colors.aqua : colors.textMuted }]}>
                {heart ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>

      <View style={[styles.stickyBottom, {
        paddingBottom: insets.bottom + 8,
        backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)',
        borderTopColor: colors.border,
      }]}>
        <Pressable
          onPress={handleBuyTickets}
          style={({ pressed }) => [styles.stickyBtnFull, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          testID="event-detail-buy-tickets"
        >
          {event.url ? (
            <ExternalLink color={isDark ? colors.background : '#fff'} size={16} />
          ) : (
            <Ticket color={isDark ? colors.background : '#fff'} size={16} />
          )}
          <Text style={[styles.stickyBtnText, { color: isDark ? colors.background : '#fff' }]}>
            {event.url ? 'Buy Tickets' : 'Get Tickets'}
          </Text>
        </Pressable>
      </View>

      {event.venueLat && event.venueLng ? (
        <DirectionsSheet
          visible={directionsVisible}
          onClose={() => setDirectionsVisible(false)}
          latitude={event.venueLat}
          longitude={event.venueLng}
          address={venueAddress || (event.venue_name ?? '')}
          name={event.venue_name ?? event.name}
        />
      ) : null}

      {/* Floating directions FAB */}
      {event.venueLat && event.venueLng ? (
        <Pressable
          onPress={handleDirections}
          style={({ pressed }) => [
            styles.directionsFab,
            { bottom: insets.bottom + 80, backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
          testID="event-detail-directions-fab"
        >
          <Navigation color={colors.aqua} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Removed legacy mock event detail — all events now resolve via Supabase eventId.
/*

function MockEventDetail({
  venueId,
  directionsVisible,
  setDirectionsVisible,
  onBack,
  onTickets,
  isFavorited,
  toggleFavorite,
  insets,
  colors,
  isDark,
}: {
  venueId: string;
  directionsVisible: boolean;
  setDirectionsVisible: (v: boolean) => void;
  onBack: () => void;
  onTickets: (venueId: string) => void;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (id: string, kind: 'venue' | 'event', name: string) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const event = useMemo(() => getEventForVenue(venueId), [venueId]);
  const hearted = isFavorited(event.id);
  const energyColor = colors.aqua;

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  const handleHeart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(event.id, 'event', event.title);
  }, [event, toggleFavorite]);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, [setDirectionsVisible]);

  const handleGetTickets = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onTickets(venueId);
  }, [onTickets, venueId]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="event-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.heroContainer}>
          <Image source={{ uri: event.heroImage }} style={styles.heroImage} />
          <View style={styles.heroDarken} />
          <View style={styles.heroNameOverlay}>
            <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.heroTagline}>{event.tagline}</Text>
          </View>
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleBack} style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]} testID="event-detail-back">
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Pressable onPress={handleHeart} style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]} testID="event-detail-heart">
            <Heart color={hearted ? '#FF6B6B' : '#fff'} size={20} fill={hearted ? '#FF6B6B' : 'transparent'} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.tagsRow}>
            {event.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(26,158,153,0.08)' }]}>
                <Text style={[styles.tagText, { color: colors.aqua }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Calendar color={colors.aqua} size={16} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{event.date}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.time}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <MapPin color={colors.aqua} size={16} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{event.venueName}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.venueAddress}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Clock color={colors.aqua} size={16} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Doors open {event.doorsOpen}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.distanceFromUser}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Zap color={energyColor} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{event.vibeScore}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Energy</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Users color={colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{event.attendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Going</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Heart color={colors.amber} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{event.interestedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Interested</Text>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{event.description}</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What to expect</Text>
            {event.whatToExpect.map((item, idx) => (
              <View key={idx} style={styles.expectRow}>
                <CheckCircle2 color={colors.aqua} size={14} />
                <Text style={[styles.expectText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.insightsRow}>
            <UrgencyTag urgency={getUrgencyLabel(event.vibeScore, event.attendingCount)} size="md" pulse />
            <LiveActivityBadge vibeScore={event.vibeScore} peopleCount={event.attendingCount} isDark={isDark} />
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDirections}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
              testID="event-detail-directions"
            >
              <Navigation color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>Get there now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyBottom, {
        paddingBottom: insets.bottom + 8,
        backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)',
        borderTopColor: colors.border,
      }]}>
        <Pressable
          onPress={handleGetTickets}
          style={({ pressed }) => [styles.stickyBtnFull, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          testID="event-detail-tickets"
        >
          <Ticket color={isDark ? colors.background : '#fff'} size={18} />
          <Text style={[styles.stickyBtnText, { color: isDark ? colors.background : '#fff' }]}>Get Tickets</Text>
        </Pressable>
      </View>

      <DirectionsSheet
        visible={directionsVisible}
        onClose={() => setDirectionsVisible(false)}
        latitude={event.venueLatitude}
        longitude={event.venueLongitude}
        address={event.venueAddress}
        name={event.venueName}
      />
    </View>
  );
}
*/

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: { fontSize: 13, fontWeight: '500' as const },
  errorTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 8 },
  errorBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  errorBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
  errorBtnText: { fontSize: 14, fontWeight: '700' as const },
  content: { flexGrow: 1 },
  heroContainer: { width: '100%', height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroDarken: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  heroNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 12,
    lineHeight: 28,
  },
  heroTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 20 },
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
  topBarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '600' as const },
  infoCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 14, fontWeight: '700' as const },
  infoSub: { fontSize: 13 },
  infoDivider: { height: 1, marginLeft: 28 },
  livelinessCard: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  livelinessHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livelinessTitle: { fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.1 },
  livelinessBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  livelinessBadgeText: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.4 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  livelinessMeta: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  livelinessStat: { fontSize: 14, fontWeight: '700' as const },
  livelinessStatSub: { fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, fontWeight: '700' as const },
  statLabel: { fontSize: 11, fontWeight: '500' as const },
  sectionBlock: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const },
  sectionBody: { fontSize: 14, lineHeight: 22 },
  expectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 2 },
  expectText: { fontSize: 14, lineHeight: 21, flex: 1 },
  insightCard: { borderRadius: 16, padding: 16, gap: 8 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  insightValue: { fontSize: 13, lineHeight: 19 },
  mapCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, height: 180 },
  mapInner: { width: '100%', height: '100%' },
  insightsRow: { gap: 8 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' as const },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  stickyBtnFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  stickyBtnText: { fontSize: 16, fontWeight: '700' as const },
  directionsFab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  checkInBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#1E9E9A',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#1E9E9A',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  checkInBtnDone: {
    backgroundColor: '#0a6e6a',
    shadowOpacity: 0,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  directionsBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
