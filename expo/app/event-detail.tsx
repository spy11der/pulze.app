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
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Navigation,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { getEventForVenue } from '@/mocks/events';
import { DirectionsSheet } from '@/components/DirectionsSheet';
import { LiveActivityBadge } from '@/components/LiveActivityBadge';
import { UrgencyTag } from '@/components/UrgencyTag';
import { getUrgencyLabel } from '@/utils/urgency';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId: string }>();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [directionsVisible, setDirectionsVisible] = useState<boolean>(false);

  const venueId = params.venueId ?? 'v-001';
  const event = useMemo(() => getEventForVenue(venueId), [venueId]);
  const hearted = isFavorited(event.id);

  const energyColor = event.energyType === 'pulze' ? colors.coral : event.energyType === 'moderate' ? colors.amber : colors.quiet;

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleHeart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(event.id, 'event', event.title);
  }, [event, toggleFavorite]);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, []);

  const handleGetTickets = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({ pathname: '/ticketing', params: { venueId } });
  }, [router, venueId]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="event-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.heroContainer}>
          <Image source={{ uri: event.heroImage }} style={styles.heroImage} />
          <View style={styles.heroGradient} />
          <View style={styles.heroNameOverlay}>
            <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.heroTagline}>{event.tagline}</Text>
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
            <Heart
              color={hearted ? '#FF6B6B' : '#fff'}
              size={20}
              fill={hearted ? '#FF6B6B' : 'transparent'}
            />
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

          {event.lineup.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Lineup</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineupScroll}>
                {event.lineup.map((guest) => (
                  <View key={guest.id} style={[styles.lineupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Image source={{ uri: guest.avatar }} style={styles.lineupAvatar} />
                    <Text style={[styles.lineupName, { color: colors.text }]}>{guest.name}</Text>
                    <Text style={[styles.lineupRole, { color: colors.textMuted }]}>{guest.role}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.insightCard, { backgroundColor: isDark ? '#0F2A34' : '#E4F0F4' }]}>
            <View style={styles.insightHeader}>
              <Sparkles color={colors.aqua} size={14} />
              <Text style={[styles.insightHeaderText, { color: colors.aqua }]}>Pulze Insights</Text>
            </View>
            <View style={styles.insightRow}>
              <Clock color={colors.textMuted} size={13} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.text }]}>Best time to arrive</Text>
                <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.bestTimeToArrive}</Text>
              </View>
            </View>
            <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
            <View style={styles.insightRow}>
              <TrendingUp color={colors.textMuted} size={13} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.text }]}>Area vibe right now</Text>
                <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.currentVibeAround}</Text>
              </View>
            </View>
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
              testID="event-detail-interested"
            >
              <Heart color={hearted ? colors.coral : colors.textMuted} size={16} fill={hearted ? colors.coral : 'transparent'} />
              <Text style={[styles.secondaryBtnText, { color: hearted ? colors.coral : colors.textMuted }]}>
                {hearted ? 'Interested' : 'Interested?'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)', borderTopColor: colors.border }]}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  heroContainer: {
    width: '100%',
    height: 300,
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
    height: 160,
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
  heroTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 20,
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
    gap: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  infoSub: {
    fontSize: 13,
  },
  infoDivider: {
    height: 1,
    marginLeft: 28,
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
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  expectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 2,
  },
  expectText: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  lineupScroll: {
    gap: 10,
    paddingRight: 4,
  },
  lineupCard: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    padding: 14,
    width: 110,
    borderWidth: 1,
  },
  lineupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  lineupName: {
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  lineupRole: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  insightValue: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  insightDivider: {
    height: 1,
    marginLeft: 23,
  },
  insightsRow: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
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
  stickyBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
