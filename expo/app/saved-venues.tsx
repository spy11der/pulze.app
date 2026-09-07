import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Bookmark, MapPin } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { resolveVenueById } from '@/services/venues';
import { getBusynessLabel, getBusynessColor, type PulzeVenue } from '@/types/venue';

// One saved venue: the AsyncStorage favorite (favId/favName) plus its
// resolved, enriched PulzeVenue (real id, live busyness, photos).
interface SavedRow {
  favId: string;
  favName: string;
  venue: PulzeVenue;
}

export default function SavedVenuesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { favoriteVenues, toggleFavorite, isLoading: favoritesLoading } = useFavorites();

  const [rows, setRows] = useState<SavedRow[]>([]);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (favoriteVenues.length === 0) {
      setRows([]);
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    void (async () => {
      const resolved = await Promise.all(
        favoriteVenues.map(async (fav) => ({
          favId: fav.id,
          favName: fav.name,
          venue: await resolveVenueById(fav.id),
        })),
      );
      if (cancelled) return;
      // Same convention as getAllLiveVenues: skip venues with no mock
      // match instead of showing placeholder content.
      setRows(resolved.filter((r): r is SavedRow => r.venue !== null));
      setIsResolving(false);
    })();
    return () => { cancelled = true; };
  }, [favoriteVenues]);

  const isLoading = favoritesLoading || isResolving;

  const handleRowPress = useCallback(
    (row: SavedRow) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/venue-detail', params: { venueId: row.venue.id } });
    },
    [router],
  );

  const handleUnsave = useCallback(
    (row: SavedRow) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(row.favId, 'venue', row.favName);
    },
    [toggleFavorite],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedRow }) => {
      const photo = item.venue.photo ?? item.venue.photos[0];
      return (
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => handleRowPress(item)}
            style={({ pressed }) => [styles.rowBody, { opacity: pressed ? 0.7 : 1 }]}
            testID={`saved-venue-${item.venue.id}`}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <MapPin color={colors.aqua} size={18} />
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>{item.venue.name}</Text>
              <Text style={[styles.venueMeta, { color: colors.textMuted }]} numberOfLines={1}>
                {item.venue.typeLabel} · {item.venue.neighborhood}
              </Text>
              <View style={styles.busyRow}>
                <View style={[styles.busyDot, { backgroundColor: getBusynessColor(item.venue.busyness) }]} />
                <Text style={[styles.busyText, { color: colors.textSoft }]}>
                  {getBusynessLabel(item.venue.busyness)} · {item.venue.busynessPercent}%
                </Text>
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleUnsave(item)}
            style={({ pressed }) => [styles.unsaveBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID={`unsave-${item.venue.id}`}
            hitSlop={8}
          >
            <Bookmark color={colors.aqua} size={20} fill={colors.aqua} />
          </Pressable>
        </View>
      );
    },
    [colors, handleRowPress, handleUnsave],
  );

  const keyExtractor = useCallback((item: SavedRow) => item.favId, []);

  const empty = (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.aqua + '14' }]}>
        <Bookmark color={colors.aqua} size={32} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing saved yet</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        Tap the bookmark on a venue to keep it here for later.
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Saved Venues',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
        }}
      />
      {isLoading && rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={colors.aqua} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={empty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43, 191, 186, 0.08)' },
  rowText: { flex: 1, gap: 2 },
  venueName: { fontSize: 15, fontWeight: '700' as const },
  venueMeta: { fontSize: 12 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  busyDot: { width: 8, height: 8, borderRadius: 4 },
  busyText: { fontSize: 12, fontWeight: '500' as const },
  unsaveBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
});
