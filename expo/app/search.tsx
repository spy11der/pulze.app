import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, MapPin, Search, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import { formatDistance, haversineMeters } from '@/hooks/useNearbyVenues';
import { searchLiveVenues } from '@/services/venues';
import { analytics } from '@/services/analytics';
import type { PulzeVenue } from '@/types/venue';

// Recommended R0: the app's venue search. Before this screen existed the only
// search UI was the check-in location picker, which nothing navigated to, so a
// venue outside the Discover/Nearby radius or below their limits could not be
// reached at all. Search is the route that never depends on ranking.
//
// Nationwide by design (surface `search` is not radius-bounded). When a fix
// is available the server uses it to sort local matches first; the distance
// shown here is display only and never re-orders the server's list.

const RESULT_LIMIT = 25;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { userLocation } = useMapLocation();

  const [query, setQuery] = useState<string>('');
  // Results are stored with the query they answer, so a stale list is never
  // shown (or labelled) against the text currently in the box. "Searching" is
  // derived: there is a query and no answer for it yet.
  const [answer, setAnswer] = useState<{ query: string; venues: PulzeVenue[] }>({ query: '', venues: [] });
  const inputRef = useRef<TextInput>(null);
  // Same dedupe as the picker: pause, resume typing and re-tap collapse into
  // one recorded query.
  const lastRecordedQueryRef = useRef<string>('');

  const lat = userLocation?.latitude ?? null;
  const lng = userLocation?.longitude ?? null;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      lastRecordedQueryRef.current = '';
      return;
    }
    let cancelled = false;
    // 400 ms debounce, matching the picker.
    const timer = setTimeout(() => {
      const run = async () => {
        const found = await searchLiveVenues(trimmed, RESULT_LIMIT, lat, lng);
        if (cancelled) return;
        setAnswer({ query: trimmed, venues: found });
        const normalized = trimmed.toLowerCase();
        if (lastRecordedQueryRef.current !== normalized) {
          lastRecordedQueryRef.current = normalized;
          const payload = {
            eventType: 'search_query' as const,
            subjectType: 'search' as const,
            properties: {
              query: trimmed.slice(0, 200),
              query_length: trimmed.length,
              result_count: found.length,
            },
          };
          analytics.operational(payload);
          analytics.personalization(payload);
        }
      };
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, lat, lng]);

  const handleSelect = useCallback(
    (venue: PulzeVenue, position: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const payload = {
        eventType: 'search_result_clicked' as const,
        subjectType: 'venue' as const,
        subjectId: venue.id,
        properties: { query: answer.query.slice(0, 200), position },
      };
      analytics.operational(payload);
      analytics.personalization(payload);
      router.push({ pathname: '/venue-detail', params: { venueId: venue.id } });
    },
    [router, answer.query],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();
  const showResults = trimmed.length > 0 && answer.query === trimmed;
  const results = showResults ? answer.venues : [];

  const renderItem = useCallback(
    ({ item, index }: { item: PulzeVenue; index: number }) => {
      const distance =
        lat != null && lng != null && item.latitude && item.longitude
          ? formatDistance(haversineMeters(lat, lng, item.latitude, item.longitude))
          : null;
      const place = [item.neighborhood, item.city].filter((s) => s && s.length > 0).join(', ');
      return (
        <Pressable
          onPress={() => handleSelect(item, index)}
          style={({ pressed }) => [
            styles.venueRow,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
          testID={`search-result-${item.id}`}
        >
          <View style={[styles.venueIcon, { backgroundColor: `${colors.aqua}12` }]}>
            <MapPin color={colors.aqua} size={18} />
          </View>
          <View style={styles.venueInfo}>
            <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.venueMeta, { color: colors.textSoft }]} numberOfLines={1}>
              {item.typeLabel}
              {place ? ` · ${place}` : ''}
            </Text>
          </View>
          {distance && (
            <View style={[styles.distBadge, { backgroundColor: isDark ? `${colors.aqua}14` : `${colors.aqua}10` }]}>
              <Text style={[styles.distText, { color: colors.aqua }]}>{distance}</Text>
            </View>
          )}
        </Pressable>
      );
    },
    [colors, isDark, handleSelect, lat, lng],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="venue-search">
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search color={colors.textSoft} size={18} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Venue name, type or city"
            placeholderTextColor={colors.textSoft}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            testID="venue-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={clearQuery} hitSlop={8} accessibilityLabel="Clear search">
              <X color={colors.textSoft} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          showResults && results.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: colors.textSoft }]}>
              {results.length === 1 ? '1 result' : `${results.length} results`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          trimmed.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Search color={colors.textSoft} size={32} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Find any Pulze venue</Text>
              <Text style={[styles.emptyHint, { color: colors.textSoft }]}>
                Search by name, type or city — anywhere, not just nearby
              </Text>
            </View>
          ) : !showResults ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.aqua} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <MapPin color={colors.textSoft} size={32} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No venues match “{trimmed}”</Text>
              <Text style={[styles.emptyHint, { color: colors.textSoft }]}>Try a different name, type or city</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerArea: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTitle: { fontSize: 17, fontWeight: '700' as const },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' as const, paddingVertical: 0 },
  listContent: { paddingHorizontal: 18, gap: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.5, marginTop: 6, marginBottom: 8, marginLeft: 2 },
  venueRow: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 14, padding: 12, borderWidth: 1, gap: 12 },
  venueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const },
  venueInfo: { flex: 1, gap: 2 },
  venueName: { fontSize: 15, fontWeight: '700' as const },
  venueMeta: { fontSize: 13, fontWeight: '500' as const },
  distBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  distText: { fontSize: 12, fontWeight: '700' as const },
  emptyWrap: { alignItems: 'center' as const, paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '600' as const, textAlign: 'center' as const },
  emptyHint: { fontSize: 13, fontWeight: '500' as const, textAlign: 'center' as const, paddingHorizontal: 24 },
});
