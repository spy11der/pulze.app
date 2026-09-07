import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Camera, MapPin } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getMyCheckIns } from '@/services/crewFeed';
import type { FriendCheckInFeedItem } from '@/mocks/friends';

const NUM_COLUMNS = 3;
const GRID_GAP = 4;

export default function CheckinHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [checkIns, setCheckIns] = useState<FriendCheckInFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadCheckIns = useCallback(async () => {
    if (!user?.id) return;
    const items = await getMyCheckIns(user.id);
    setCheckIns(items);
    setIsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadCheckIns();
    }, [loadCheckIns]),
  );

  const handleItemPress = useCallback(
    (item: FriendCheckInFeedItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/checkin-detail', params: { checkInId: item.id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: FriendCheckInFeedItem }) => (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
      >
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.tileImage} />
        ) : (
          <View style={[styles.tilePlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
            <MapPin color={colors.aqua} size={20} />
          </View>
        )}
        <View style={styles.tileOverlay}>
          <Text style={styles.tileVenueName} numberOfLines={1}>{item.venueName}</Text>
        </View>
      </Pressable>
    ),
    [colors, isDark, handleItemPress],
  );

  const keyExtractor = useCallback((item: FriendCheckInFeedItem) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'My Check-ins',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
        }}
      />
      <FlatList
        data={checkIns}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 40 }]}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.aqua + '14' }]}>
                <Camera color={colors.aqua} size={32} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No check-ins yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Check in at a venue and it&apos;ll show up here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const TILE_SIZE = (100 - GRID_GAP) / NUM_COLUMNS;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gridContent: { padding: GRID_GAP, flexGrow: 1 },
  gridRow: { gap: GRID_GAP },
  tile: {
    width: `${TILE_SIZE}%`,
    aspectRatio: 1,
    marginBottom: GRID_GAP,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tileImage: { width: '100%', height: '100%' },
  tilePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tileVenueName: { color: '#fff', fontSize: 10, fontWeight: '600' as const },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
});
