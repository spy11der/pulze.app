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

      <View style={styles.heroContainer}>
        <Image source={{ uri: event.heroImage }} style={styles.heroImage} />
        <View style={styles.heroGradient} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          testID="event-detail-back"
        >
          <ArrowLeft color={isDark ? '#fff' : '#000'} size={20} />
        </Pressable>
        <Pressable
          onPress={handleHeart}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          testID="event-detail-heart"
        >
          <Heart
            color={hearted ? colors.coral : (isDark ? '#fff' : '#000')}
            size={20}
            fill={hearted ? colors.coral : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
        <View style={{ height: 250 }} />

        <View style={styles.mainContent}>
          <View style={styles.tagsRow}>
            {event.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)' }]}>
                <Text style={[styles.tagText, { color: colors.aqua }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
          <Text style={[styles.eventTagline, { color: colors.textMuted }]}>{event.tagline}</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Calendar color={colors.aqua} size={18} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{event.date}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.time}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <MapPin color={colors.aqua} size={18} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{event.venueName}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.venueAddress}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Clock color={colors.aqua} size={18} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Doors open {event.doorsOpen}</Text>
                <Text style={[styles.infoSub, { color: colors.textMuted }]}>{event.distanceFromUser}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,109,94,0.08)' : 'rgba(224,85,69,0.06)' }]}>
              <Zap color={energyColor} size={18} />
              <Text style={[styles.statValue, { color: energyColor }]}>{event.vibeScore}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vibe</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(165,240,92,0.08)' : 'rgba(92,168,48,0.06)' }]}>
              <Users color={colors.lime} size={18} />
              <Text style={[styles.statValue, { color: colors.text }]}>{event.attendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Going</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,191,71,0.08)' : 'rgba(204,142,0,0.06)' }]}>
              <Heart color={colors.amber} size={18} />
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
              <Sparkles color={colors.aqua} size={16} />
              <Text style={[styles.insightTitle, { color: colors.aqua }]}>Pulze Insights</Text>
            </View>
            <View style={styles.insightRow}>
              <Clock color={colors.textMuted} size={14} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.text }]}>Best time to arrive</Text>
                <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.bestTimeToArrive}</Text>
              </View>
            </View>
            <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
            <View style={styles.insightRow}>
              <TrendingUp color={colors.textMuted} size={14} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.text }]}>Current vibe around venue</Text>
                <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.currentVibeAround}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDirections}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
              testID="event-detail-directions"
            >
              <Navigation color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.actionBtnText, { color: isDark ? colors.background : '#fff' }]}>Directions</Text>
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
              testID="event-detail-interested"
            >
              <Heart color={hearted ? colors.coral : colors.textMuted} size={16} fill={hearted ? colors.coral : 'transparent'} />
              <Text style={[styles.actionBtnOutlineText, { color: hearted ? colors.coral : colors.textMuted }]}>
                {hearted ? 'Interested' : 'Interested?'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)', borderTopColor: colors.border }]}>
        <View style={styles.stickyInfo}>
          <Text style={[styles.stickyPrice, { color: colors.text }]}>
            From ${Math.min(...event.ticketTiers.filter((t) => !t.soldOut).map((t) => t.price))}
          </Text>
          <Text style={[styles.stickyMeta, { color: colors.textMuted }]}>per ticket</Text>
        </View>
        <Pressable
          onPress={handleGetTickets}
          style={({ pressed }) => [styles.stickyBtn, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
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
  screen: { flex: 1 },
  heroContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, zIndex: 1 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.2)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { position: 'relative', zIndex: 2 },
  mainContent: { paddingHorizontal: 16, gap: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '700' as const },
  eventTitle: { fontSize: 26, fontWeight: '800' as const, lineHeight: 32, letterSpacing: -0.3 },
  eventTagline: { fontSize: 15, lineHeight: 21, marginTop: -4 },
  infoCard: { borderRadius: 20, padding: 18, gap: 14, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 15, fontWeight: '700' as const },
  infoSub: { fontSize: 13 },
  infoDivider: { height: 1, marginLeft: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '800' as const },
  statLabel: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  sectionBlock: { gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800' as const },
  sectionBody: { fontSize: 15, lineHeight: 23 },
  expectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 4 },
  expectText: { fontSize: 15, lineHeight: 22, flex: 1 },
  lineupScroll: { gap: 12, paddingRight: 4 },
  lineupCard: { alignItems: 'center', gap: 8, borderRadius: 20, padding: 16, width: 120, borderWidth: 1 },
  lineupAvatar: { width: 56, height: 56, borderRadius: 28 },
  lineupName: { fontSize: 14, fontWeight: '700' as const, textAlign: 'center' as const },
  lineupRole: { fontSize: 12, textAlign: 'center' as const },
  insightCard: { borderRadius: 20, padding: 18, gap: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightTitle: { fontSize: 14, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  insightLabel: { fontSize: 14, fontWeight: '700' as const },
  insightValue: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  insightDivider: { height: 1, marginLeft: 24 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
  actionBtnText: { fontSize: 15, fontWeight: '700' as const },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 15, fontWeight: '700' as const },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  stickyInfo: { gap: 2 },
  stickyPrice: { fontSize: 22, fontWeight: '900' as const },
  stickyMeta: { fontSize: 13 },
  stickyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 },
  stickyBtnText: { fontSize: 16, fontWeight: '800' as const },
});
