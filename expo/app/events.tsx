import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import {
  useEventFeed,
  useSearchEvents,
  useDebouncedValue,
  type FeedEventItem,
  type SearchEventItem,
} from '@/hooks/useEvents';
import { getLivelinessInfo } from '@/utils/liveliness';
import type { EventSource } from '@/types/supabase';

type SourceFilter = 'all' | EventSource;

interface ListItem {
  id: string;
  name: string;
  venueName: string | null;
  city: string | null;
  source: EventSource;
  date: Date;
  imageUrl: string | null;
  capacity?: number | null;
  activeListings?: number;
  liveliness?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const isSearching = debouncedQuery.trim().length > 0 || sourceFilter !== 'all';

  const feedQuery = useEventFeed(50);
  const searchResultsQuery = useSearchEvents({
    query: debouncedQuery,
    source: sourceFilter,
    sortBy: 'date',
  });

  const items: ListItem[] = useMemo(() => {
    if (isSearching) {
      return (searchResultsQuery.data ?? []) as SearchEventItem[];
    }
    return (feedQuery.data ?? []) as FeedEventItem[];
  }, [isSearching, searchResultsQuery.data, feedQuery.data]);

  const filteredItems = useMemo(() => {
    if (isSearching) return items;
    if (sourceFilter === 'all') return items;
    return items.filter((i) => i.source === sourceFilter);
  }, [items, isSearching, sourceFilter]);

  const isLoading = isSearching ? searchResultsQuery.isLoading : feedQuery.isLoading;
  const isRefetching = isSearching ? searchResultsQuery.isRefetching : feedQuery.isRefetching;
  const error = (isSearching ? searchResultsQuery.error : feedQuery.error) as Error | null;

  const onRefresh = useCallback(() => {
    if (isSearching) {
      void searchResultsQuery.refetch();
    } else {
      void feedQuery.refetch();
    }
  }, [isSearching, searchResultsQuery, feedQuery]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleOpenEvent = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/event-detail', params: { eventId: id } });
  }, [router]);

  const handleSelectFilter = useCallback((f: SourceFilter) => {
    void Haptics.selectionAsync();
    setSourceFilter(f);
  }, []);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    return (
      <EventCard
        item={item}
        onPress={() => handleOpenEvent(item.id)}
        isDark={isDark}
        colors={colors}
      />
    );
  }, [handleOpenEvent, isDark, colors]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="events-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
            testID="events-back"
          >
            <ArrowLeft color={colors.text} size={18} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Live Events</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Real-time, every 4 hours</Text>
          </View>
        </View>

        <View style={[
          styles.searchBar,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderColor: searchQuery ? colors.aqua + '66' : colors.border,
          },
        ]}>
          <Search color={searchQuery ? colors.aqua : colors.textMuted} size={16} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search events, venues, cities..."
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            testID="events-search-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <X color={colors.textMuted} size={14} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'ticketmaster', 'seatdata'] as SourceFilter[]).map((f) => {
            const active = sourceFilter === f;
            const label = f === 'all' ? 'All' : f === 'ticketmaster' ? 'Ticketmaster' : 'SeatData';
            return (
              <Pressable
                key={f}
                onPress={() => handleSelectFilter(f)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.aqua : 'transparent',
                    borderColor: active ? colors.aqua : colors.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                testID={`events-filter-${f}`}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: active ? (isDark ? colors.background : '#fff') : colors.textMuted },
                ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading && filteredItems.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.aqua} />
          <Text style={[styles.centerText, { color: colors.textMuted }]}>Loading events…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.centerTitle, { color: colors.text }]}>Couldn't load events</Text>
          <Text style={[styles.centerText, { color: colors.textMuted }]}>{error.message}</Text>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.aqua }, pressed && { opacity: 0.85 }]}
            testID="events-retry"
          >
            <Text style={[styles.retryBtnText, { color: isDark ? colors.background : '#fff' }]}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.aqua} colors={[colors.aqua]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <CalendarDays color={colors.textSoft} size={32} />
              <Text style={[styles.centerTitle, { color: colors.text }]}>
                {isSearching ? 'No events match' : 'No upcoming events'}
              </Text>
              <Text style={[styles.centerText, { color: colors.textMuted }]}>
                {isSearching ? 'Try a different search or filter.' : 'Check back soon — synced every 4 hours.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          testID="events-list"
        />
      )}
    </View>
  );
}

const EventCard = React.memo(function EventCard({
  item,
  onPress,
  isDark,
  colors,
}: {
  item: ListItem;
  onPress: () => void;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const live = item.liveliness !== undefined ? getLivelinessInfo(item.liveliness ?? null) : null;
  const dateStr = item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = item.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cardStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
      testID={`event-card-${item.id}`}
    >
      <View style={cardStyles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={cardStyles.image} />
        ) : (
          <View style={[cardStyles.image, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(26,158,153,0.08)', alignItems: 'center', justifyContent: 'center' }]}>
            <CalendarDays color={colors.aqua} size={20} />
          </View>
        )}
        <View style={[
          cardStyles.sourceBadge,
          {
            backgroundColor: item.source === 'ticketmaster' ? 'rgba(43,191,186,0.92)' : 'rgba(232,168,48,0.92)',
          },
        ]}>
          <Text style={cardStyles.sourceBadgeText}>
            {item.source === 'ticketmaster' ? 'TM' : 'SD'}
          </Text>
        </View>
      </View>

      <View style={cardStyles.body}>
        <Text style={[cardStyles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={cardStyles.metaRow}>
          <MapPin color={colors.textMuted} size={11} />
          <Text style={[cardStyles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
            {item.venueName ?? 'Unknown venue'}{item.city ? ` · ${item.city}` : ''}
          </Text>
        </View>
        <View style={cardStyles.metaRow}>
          <CalendarDays color={colors.textMuted} size={11} />
          <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>
            {dateStr} · {timeStr}
          </Text>
        </View>

        <View style={cardStyles.bottomRow}>
          {live && live.score !== null ? (
            <View style={[cardStyles.livePill, { backgroundColor: live.color + '20' }]}>
              <Text style={[cardStyles.livePillText, { color: live.color }]}>
                {live.emoji} {live.label}
              </Text>
            </View>
          ) : (
            <View style={[cardStyles.livePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[cardStyles.livePillText, { color: colors.textSoft }]}>· UNRATED</Text>
            </View>
          )}
          {item.minPrice !== undefined && item.minPrice !== null ? (
            <Text style={[cardStyles.priceText, { color: colors.text }]}>
              from ${Math.round(item.minPrice)}
            </Text>
          ) : null}
          <ChevronRight color={colors.textSoft} size={14} style={{ marginLeft: 'auto' }} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.2, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    padding: 0,
  },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.2 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  sep: { height: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  centerTitle: { fontSize: 16, fontWeight: '700' as const },
  centerText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  retryBtnText: { fontSize: 13, fontWeight: '700' as const },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  imageWrap: { position: 'relative' },
  image: { width: 88, height: 88, borderRadius: 12 },
  sourceBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.5 },
  body: { flex: 1, gap: 4, justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '700' as const, letterSpacing: -0.1, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, fontWeight: '500' as const, flex: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  livePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  livePillText: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.4 },
  priceText: { fontSize: 11, fontWeight: '700' as const },
});
