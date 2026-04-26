import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Clock,
  Eye,
  Flame,
  Heart,
  MapPin,
  Navigation,
  Timer,
  Users,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { pulzeVenues } from '@/mocks/venues';
import { DirectionsSheet } from '@/components/DirectionsSheet';
import { LiveActivityBadge } from '@/components/LiveActivityBadge';
import { UrgencyTag } from '@/components/UrgencyTag';
import { getUrgencyLabel } from '@/utils/urgency';

function getStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'open': return { label: 'Open Now', color: '#4CAF78' };
    case 'closing_soon': return { label: 'Closing Soon', color: '#D4924A' };
    case 'closed': return { label: 'Closed', color: '#C05050' };
    default: return { label: 'Unknown', color: '#8899AA' };
  }
}

export default function VenueDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId: string }>();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [directionsVisible, setDirectionsVisible] = useState<boolean>(false);

  const venue = pulzeVenues.find((v) => v.id === params.venueId);

  const galleryPhotos = useMemo<string[]>(() => [
    'https://picsum.photos/300/200?random=1',
    'https://picsum.photos/300/200?random=2',
    'https://picsum.photos/300/200?random=3',
    'https://picsum.photos/300/200?random=4',
  ], []);
  const [activeHero, setActiveHero] = useState<string | null>(null);

  const busyHours = useMemo(() => [
    { label: '6p', value: 20 },
    { label: '7p', value: 35 },
    { label: '8p', value: 55 },
    { label: '9p', value: 80 },
    { label: '10p', value: 95 },
    { label: '11p', value: 85 },
    { label: '12a', value: 60 },
  ], []);
  const currentHourIndex = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 18 && h <= 23) return h - 18;
    if (h === 0) return 6;
    return 4;
  }, []);

  const recentVibes = useMemo(() => [
    { handle: '@maya.k', timeAgo: '2 min ago', caption: "It's packed in here \uD83D\uDD25" },
    { handle: '@deon', timeAgo: '14 min ago', caption: 'Good vibes, not too busy' },
    { handle: '@sam.r', timeAgo: '1 hr ago', caption: 'DJ just started, lines forming' },
  ], []);

  const handleCheckIn = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Check-in recorded!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Check-in recorded!');
    }
    console.log('[VenueDetail] check-in tapped for', params.venueId);
  }, [params.venueId]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleHeart = useCallback(() => {
    if (!venue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(venue.id, 'venue', venue.name);
  }, [venue, toggleFavorite]);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, []);

  if (!venue) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Venue not found</Text>
          <Pressable onPress={handleBack} style={[styles.primaryBtn, { backgroundColor: colors.aqua }]}>
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(venue.open_status);
  const hearted = isFavorited(venue.id);
  const urgency = getUrgencyLabel(venue.vibe_score, venue.peopleCount);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="venue-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.heroContainer}>
          {venue.photo ? (
            <Image source={{ uri: activeHero ?? venue.photo }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
              <MapPin color={colors.aqua} size={48} />
            </View>
          )}
          <View style={styles.heroGradient} />
          <View style={[styles.heroNameOverlay, { paddingBottom: 20 }]}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroVenueName} numberOfLines={2}>{venue.name}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                <Text style={[styles.statusPillText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.heroCategory}>{venue.categoryLabel} · {venue.neighborhood}</Text>
          </View>
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleBack}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            testID="venue-detail-back"
          >
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Pressable
            onPress={handleHeart}
            style={[styles.topBarBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            testID="venue-detail-heart"
          >
            <Heart
              color={hearted ? '#FF6B6B' : '#fff'}
              size={20}
              fill={hearted ? '#FF6B6B' : 'transparent'}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Zap color={venue.vibe_score >= 70 ? colors.amber : colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.vibe_score}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Energy</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Users color={colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.people}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Inside</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Clock color={colors.aqua} size={15} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.eta}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Away</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CURRENT MOOD</Text>
            <Text style={[styles.moodText, { color: colors.text }]}>{venue.mood}</Text>
          </View>

          {venue.blurb ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WHAT'S HAPPENING</Text>
              <Text style={[styles.blurbText, { color: colors.text }]}>{venue.blurb}</Text>
              <Text style={[styles.timeAgo, { color: colors.textSoft }]}>{venue.postedAgo}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleDirections}
            style={[styles.addressRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            testID="venue-detail-address"
          >
            <MapPin color={colors.aqua} size={16} />
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>{venue.address}</Text>
            <Navigation color={colors.textMuted} size={14} />
          </Pressable>

          <View style={styles.insightsRow}>
            <UrgencyTag urgency={urgency} size="md" pulse />
            <LiveActivityBadge vibeScore={venue.vibe_score} peopleCount={venue.peopleCount} isDark={isDark} />
          </View>

          <View style={styles.livePillsRow}>
            <View style={[styles.livePill, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(43,191,186,0.12)' }]}>
              <Flame color={colors.aqua} size={13} />
              <Text style={[styles.livePillText, { color: colors.aqua }]}>84 checked in</Text>
            </View>
            <View style={[styles.livePill, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(43,191,186,0.12)' }]}>
              <Eye color={colors.aqua} size={13} />
              <Text style={[styles.livePillText, { color: colors.aqua }]}>312 views tonight</Text>
            </View>
            <View style={[styles.livePill, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(43,191,186,0.12)' }]}>
              <Timer color={colors.aqua} size={13} />
              <Text style={[styles.livePillText, { color: colors.aqua }]}>~20 min wait</Text>
            </View>
          </View>

          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
            >
              {galleryPhotos.map((uri) => {
                const isActive = (activeHero ?? venue.photo) === uri;
                return (
                  <Pressable
                    key={uri}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActiveHero(uri);
                    }}
                    style={[
                      styles.thumb,
                      { borderColor: isActive ? '#2BBFBA' : 'transparent' },
                    ]}
                    testID={`venue-detail-thumb-${uri}`}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TYPICALLY BUSY</Text>
            <View style={styles.chartArea}>
              {busyHours.map((bar, idx) => {
                const isCurrent = idx === currentHourIndex;
                const isShort = bar.value < 50;
                return (
                  <View key={bar.label} style={styles.chartCol}>
                    {isCurrent ? (
                      <Text style={[styles.nowLabel, { color: colors.text }]}>Now</Text>
                    ) : (
                      <View style={styles.nowLabelSpacer} />
                    )}
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: `${bar.value}%`,
                            backgroundColor: isShort ? 'rgba(43,191,186,0.3)' : '#2BBFBA',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{bar.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Vibes</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {recentVibes.map((v) => (
                <View
                  key={v.handle}
                  style={[
                    styles.vibeCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.vibeAccent} />
                  <View style={styles.vibeAvatar} />
                  <View style={styles.vibeBody}>
                    <View style={styles.vibeHeaderRow}>
                      <Text style={[styles.vibeHandle, { color: colors.text }]}>{v.handle}</Text>
                      <Text style={[styles.vibeTime, { color: colors.textMuted }]}>{v.timeAgo}</Text>
                    </View>
                    <Text style={[styles.vibeCaption, { color: colors.text }]}>{v.caption}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleCheckIn}
            style={({ pressed }) => [styles.checkInBtn, pressed && styles.pressed]}
            testID="venue-detail-checkin"
          >
            <MapPin color="#041318" size={18} />
            <Text style={styles.checkInText}>I'm Here</Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDirections}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
              testID="venue-detail-directions"
            >
              <Navigation color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>Get there now</Text>
            </Pressable>
            <Pressable
              onPress={handleHeart}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: hearted ? colors.coral : colors.border,
                  backgroundColor: hearted ? (isDark ? 'rgba(255,109,94,0.1)' : 'rgba(224,85,69,0.06)') : 'transparent',
                },
                pressed && styles.pressed,
              ]}
              testID="venue-detail-save"
            >
              <Heart
                color={hearted ? colors.coral : colors.textMuted}
                size={16}
                fill={hearted ? colors.coral : 'transparent'}
              />
              <Text style={[styles.secondaryBtnText, { color: hearted ? colors.coral : colors.textMuted }]}>
                {hearted ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <DirectionsSheet
        visible={directionsVisible}
        onClose={() => setDirectionsVisible(false)}
        latitude={venue.latitude}
        longitude={venue.longitude}
        address={venue.address}
        name={venue.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  heroContainer: {
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
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  heroNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  heroVenueName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.3,
  },
  heroCategory: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
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
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  moodText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  blurbText: {
    fontSize: 14,
    lineHeight: 21,
  },
  timeAgo: {
    fontSize: 12,
  },
  addressRow: {
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
  insightsRow: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
  },
  errorText: {
    fontSize: 16,
  },
  livePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  livePillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  galleryRow: {
    gap: 10,
    paddingRight: 4,
  },
  thumb: {
    width: 110,
    height: 78,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    marginTop: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  chartBarTrack: {
    flex: 1,
    width: 18,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  nowLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  nowLabelSpacer: {
    height: 14,
  },
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    paddingLeft: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vibeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#2BBFBA',
  },
  vibeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  vibeBody: {
    flex: 1,
    gap: 2,
  },
  vibeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vibeHandle: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  vibeTime: {
    fontSize: 11,
  },
  vibeCaption: {
    fontSize: 14,
    lineHeight: 19,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2BBFBA',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#2BBFBA',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#041318',
  },
});
