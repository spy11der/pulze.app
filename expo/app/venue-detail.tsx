import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  Compass,
  MapPin,
  Radio,
  UserRound,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { resolveVenueById, getRealCheckInCount } from '@/services/venues';
import { getBusynessLabel, type PulzeVenue } from '@/types/venue';
import { getVenueCheckInCount } from '@/services/checkInCounts';

const TABS = [
  { icon: Compass, route: '/(tabs)' },
  { icon: Radio, route: '/(tabs)/nearby' },
  { icon: Users, route: '/(tabs)/crew' },
  { icon: UserRound, route: '/(tabs)/profile' },
] as const;

export default function VenueDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId: string }>();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [venue, setVenue] = useState<PulzeVenue | null | undefined>(undefined); // undefined = loading
  const [realCheckInCount, setRealCheckInCount] = useState<number>(0);
  const [localCheckins, setLocalCheckins] = useState<number>(0);

  useEffect(() => {
    if (!params.venueId) return;
    let cancelled = false;
    resolveVenueById(params.venueId).then((v) => { if (!cancelled) setVenue(v); });
    return () => { cancelled = true; };
  }, [params.venueId]);

  useFocusEffect(
    useCallback(() => {
      if (!params.venueId) return;
      void getVenueCheckInCount(params.venueId).then(setLocalCheckins);
      if (venue?.id) {
        void getRealCheckInCount(venue.id).then(setRealCheckInCount);
      }
    }, [params.venueId, venue?.id])
  );

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleBookmark = useCallback(() => {
    if (!venue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(venue.id, 'venue', venue.name);
  }, [venue, toggleFavorite]);

  const handleTabPress = useCallback(
    (route: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.dismissAll();
      setTimeout(() => router.navigate(route), 50);
    },
    [router],
  );

  const pillBg = isDark ? 'rgba(8, 20, 26, 0.94)' : 'rgba(250, 252, 54, 0.94)';
  const pillBorder = isDark ? 'rgba(100, 180, 180, 0.12)' : 'rgba(0, 0, 0, 0.06)';
  const tabInactive = isDark ? '#3D5C66' : '#94ACB6';

  if (venue === undefined) {
    // Loading — real fetch in flight, no flash of "not found"
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
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

  const bookmarked = isFavorited(venue.id);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 6, backgroundColor: colors.background }]}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleBookmark} style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]} hitSlop={8}>
            <Bookmark color={bookmarked ? colors.aqua : colors.textMuted} size={20} fill={bookmarked ? colors.aqua : 'transparent'} />
          </Pressable>
        </View>

        {venue.photo ? (
          <Image source={{ uri: venue.photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
            <MapPin color={colors.aqua} size={48} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={2}>{venue.name}</Text>

          <View style={styles.tagRow}>
            <View style={[styles.tagChip, { backgroundColor: colors.aqua + '20' }]}>
              <Text style={[styles.tagText, { color: colors.aqua }]}>{venue.typeLabel}</Text>
            </View>
            <View style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <MapPin color={colors.textMuted} size={10} />
              <Text style={[styles.tagText, { color: colors.textMuted }]}>{venue.neighborhood}</Text>
            </View>
          </View>

          <Text style={[styles.busynessText, { color: colors.text }]}>
            {getBusynessLabel(venue.busyness)} · {venue.busynessPercent}% full
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Users color={colors.aqua} size={16} />
              <Text style={[styles.statValue, { color: colors.text }]}>{realCheckInCount + localCheckins}</Text>
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

          <View style={[styles.vibeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.vibeLabel, { color: colors.textMuted }]}>THE VIBE</Text>
            <Text style={[styles.vibeText, { color: colors.text }]}>{venue.vibe}</Text>
          </View>

          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin color={colors.aqua} size={16} />
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>{venue.address}</Text>
          </View>

          {venue.photos.length > 1 && (
            <View>
              <Text style={[styles.photosHeading, { color: colors.text }]}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {venue.photos.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={[styles.thumb, { borderColor: colors.border }]} />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.tabOuter, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
        <View style={[styles.tabPill, { backgroundColor: pillBg, borderColor: pillBorder, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.15)' }]}>
          {TABS.map((tab, i) => (
            <Pressable key={i} onPress={() => handleTabPress(tab.route)} style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.6 }]}>
              <tab.icon color={tabInactive} size={24} strokeWidth={1.6} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerBtnPressed: { opacity: 0.5 },
  photo: { width: '100%', height: 280, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', height: 280, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  venueName: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600' as const },
  busynessText: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  statValue: { fontSize: 17, fontWeight: '700' as const },
  statLabel: { fontSize: 11, fontWeight: '500' as const },
  vibeCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  vibeLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
  vibeText: { fontSize: 14, lineHeight: 20 },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1 },
  addressText: { fontSize: 14, flex: 1 },
  photosHeading: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.2, marginBottom: 8 },
  photosRow: { gap: 10, paddingRight: 4 },
  thumb: { width: 110, height: 78, borderRadius: 12, borderWidth: 1, resizeMode: 'cover' },
  tabOuter: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  tabPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 36, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, gap: 2, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 10 },
  tabItem: { width: 52, height: 46, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', gap: 20 },
  errorText: { fontSize: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { fontSize: 14, fontWeight: '700' as const },
});
