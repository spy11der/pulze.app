import React, { useCallback, useRef, useState } from 'react';
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
  Clock,
  Heart,
  MapPin,
  Navigation,
  Users,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { pulzeVenues } from '@/mocks/venues';
import { DirectionsSheet } from '@/components/DirectionsSheet';
import { DecisionBar } from '@/components/DecisionBar';
import { LiveActivityBadge } from '@/components/LiveActivityBadge';
import { UrgencyTag } from '@/components/UrgencyTag';
import { getUrgencyLabel } from '@/utils/urgency';

function getVibeColor(score: number): string {
  if (score >= 80) return '#E85D50';
  if (score >= 60) return '#E8A040';
  if (score >= 40) return '#C8B850';
  if (score >= 20) return '#50B880';
  return '#5098C0';
}

function getVibeLabel(score: number): string {
  if (score >= 80) return 'Packed';
  if (score >= 60) return 'Buzzing';
  if (score >= 40) return 'Lively';
  if (score >= 20) return 'Chill';
  return 'Quiet';
}

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

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleHeart = useCallback(() => {
    if (!venue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(venue.id, 'venue', venue.name);
  }, [venue, toggleFavorite]);

  const scrollRef = useRef<ScrollView>(null);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, []);

  const handleGoNow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scrollRef.current?.scrollTo({ y: 400, animated: true });
  }, []);

  if (!venue) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Venue not found</Text>
          <Pressable onPress={handleBack} style={[styles.errorBtn, { backgroundColor: colors.aqua }]}>
            <Text style={[styles.errorBtnText, { color: isDark ? colors.background : '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const vibeColor = getVibeColor(venue.vibe_score);
  const vibeLabel = getVibeLabel(venue.vibe_score);
  const statusInfo = getStatusInfo(venue.open_status);
  const hearted = isFavorited(venue.id);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="venue-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {venue.photo ? (
        <View style={styles.heroContainer}>
          <Image source={{ uri: `${venue.photo}&crop=center&fit=crop` }} style={styles.heroImage} />
          <View style={styles.heroGradientTop} />
          <View style={[styles.heroOverlay, { backgroundColor: isDark ? 'rgba(6,15,19,0.5)' : 'rgba(0,0,0,0.2)' }]} />
        </View>
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
          <MapPin color={colors.aqua} size={40} />
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          testID="venue-detail-back"
        >
          <ArrowLeft color={isDark ? '#fff' : '#000'} size={20} />
        </Pressable>
        <Pressable
          onPress={handleHeart}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          testID="venue-detail-heart"
        >
          <Heart
            color={hearted ? colors.coral : (isDark ? '#fff' : '#000')}
            size={20}
            fill={hearted ? colors.coral : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={{ height: venue.photo ? 240 : 160 }} />

        <View style={styles.mainContent}>
          <View style={styles.nameRow}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: venue.avatar }} style={styles.avatar} />
              <View style={[styles.avatarBorder, { borderColor: vibeColor + '80' }]} />
            </View>
            <View style={styles.nameInfo}>
              <Text style={[styles.venueName, { color: colors.text }]}>{venue.name}</Text>
              <Text style={[styles.venueCategory, { color: colors.textMuted }]}>{venue.categoryLabel} · {venue.neighborhood}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: vibeColor + '12' }]}>
              <Zap color={vibeColor} size={16} />
              <Text style={[styles.statValue, { color: vibeColor }]}>{venue.vibe_score}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{vibeLabel}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Users color={colors.aqua} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.people}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>People</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Clock color={colors.aqua} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{venue.eta}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Away</Text>
            </View>
          </View>

          <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '0C' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>

          <View style={[styles.moodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.moodLabel, { color: colors.textMuted }]}>CURRENT MOOD</Text>
            <Text style={[styles.moodText, { color: colors.text }]}>{venue.mood}</Text>
          </View>

          {venue.blurb ? (
            <View style={[styles.blurbCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blurbLabel, { color: colors.textMuted }]}>WHAT'S HAPPENING</Text>
              <Text style={[styles.blurbText, { color: colors.text }]}>{venue.blurb}</Text>
              <Text style={[styles.blurbTime, { color: colors.textSoft }]}>{venue.postedAgo}</Text>
            </View>
          ) : null}

          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin color={colors.aqua} size={16} />
            <Text style={[styles.addressText, { color: colors.text }]}>{venue.address}</Text>
          </View>

          <UrgencyTag urgency={getUrgencyLabel(venue.vibe_score, venue.peopleCount)} size="md" pulse />

          <LiveActivityBadge vibeScore={venue.vibe_score} peopleCount={venue.peopleCount} isDark={isDark} />

          <DecisionBar
            vibeScore={venue.vibe_score}
            peopleCount={venue.peopleCount}
            eta={venue.eta}
            onGoNow={handleGoNow}
          />

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDirections}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
              testID="venue-detail-directions"
            >
              <Navigation color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.actionBtnText, { color: isDark ? colors.background : '#fff' }]}>Get there now</Text>
            </Pressable>
            <Pressable
              onPress={handleHeart}
              style={({ pressed }) => [
                styles.actionBtnOutline,
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
              <Text style={[styles.actionBtnOutlineText, { color: hearted ? colors.coral : colors.textMuted }]}>
                {hearted ? 'Saved' : 'Save this spot'}
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
  screen: { flex: 1 },
  heroContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, zIndex: 1, overflow: 'hidden' as const },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'transparent' },
  heroGradientTop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.08)' },
  heroPlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, zIndex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { position: 'relative', zIndex: 2 },
  mainContent: { paddingHorizontal: 16, gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 20 },
  avatarBorder: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 22, borderWidth: 2 },
  nameInfo: { flex: 1, gap: 4 },
  venueName: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  venueCategory: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '700' as const },
  statLabel: { fontSize: 11, fontWeight: '600' as const },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' as const },
  moodCard: { borderRadius: 16, padding: 16, gap: 6, borderWidth: 1 },
  moodLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
  moodText: { fontSize: 16, fontWeight: '700' as const },
  blurbCard: { borderRadius: 16, padding: 16, gap: 6, borderWidth: 1 },
  blurbLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
  blurbText: { fontSize: 15, lineHeight: 22 },
  blurbTime: { fontSize: 12 },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  addressText: { fontSize: 14, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  actionBtnText: { fontSize: 15, fontWeight: '700' as const },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 15, fontWeight: '600' as const },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  errorContainer: { flex: 1, alignItems: 'center', gap: 20 },
  errorText: { fontSize: 16 },
  errorBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  errorBtnText: { fontSize: 15, fontWeight: '700' as const },
});
