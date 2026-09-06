import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ListRenderItem,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { type FriendCheckInFeedItem } from '@/mocks/friends';
import { getCrewFeed } from '@/services/crewFeed';
import { retryPendingCheckIns } from '@/services/checkInDatabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CARD_PHOTO_HEIGHT = CARD_WIDTH * 1.05;

export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { onScroll } = useTabScroll();

  const [feedItems, setFeedItems] = useState<FriendCheckInFeedItem[]>([]);

  const loadFeed = useCallback(async () => {
    if (!user?.id) return;
    const items = await getCrewFeed(user.id);
    setFeedItems(items);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void retryPendingCheckIns().then(() => loadFeed());
    }, [loadFeed]),
  );

  const handleItemPress = useCallback(
    (item: FriendCheckInFeedItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/checkin-detail', params: { checkInId: item.id } });
    },
    [router],
  );

  const renderItem: ListRenderItem<FriendCheckInFeedItem> = useCallback(
    ({ item }) => {
      return (
        <Pressable
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.92 }]}
        >
          <View style={[styles.cardPanel, { backgroundColor: colors.surface }]}>
            <View style={styles.cardNameRow}>
              {item.friendAvatar ? (
                <Image source={{ uri: item.friendAvatar }} style={styles.cardAvatar} />
              ) : (
                <View style={[styles.cardAvatarPlaceholder, { backgroundColor: colors.aqua + '1A' }]}>
                  <Text style={[styles.cardAvatarInitial, { color: colors.aqua }]}>
                    {item.friendName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.friendName}</Text>
              <View style={styles.cardSpacer} />
            </View>

            <View style={styles.cardSubRow}>
              <Text style={[styles.cardVenue, { color: colors.textMuted }]}>{item.venueName}</Text>
              <Text style={[styles.cardDot, { color: colors.textMuted }]}>·</Text>
              <Text style={[styles.cardTime, { color: colors.textMuted }]}>{item.timeAgo}</Text>
            </View>
          </View>

          <View style={styles.cardPhotoContainer}>
            <Image source={{ uri: item.photoUri }} style={styles.cardPhoto} resizeMode="cover" />
            {item.caption ? (
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cardCaptionOverlay}
                pointerEvents="none"
              >
                <Text style={styles.cardCaptionText} numberOfLines={1}>{item.caption}</Text>
              </LinearGradient>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [colors, handleItemPress],
  );

  const keyExtractor = useCallback((item: FriendCheckInFeedItem) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Crew check-ins</Text>
          </View>
          <Pressable onPress={() => router.push('/activity')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Bell color={colors.textMuted} size={20} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No check-ins from your crew yet
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 10, gap: 2 },
  brand: { fontSize: 22, fontWeight: '800' as const, letterSpacing: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600' as const },
  listContent: { padding: CARD_PADDING, paddingTop: 4 },
  feedCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardPanel: { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAvatar: { width: 36, height: 36, borderRadius: 18 },
  cardAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardAvatarInitial: { fontSize: 16, fontWeight: '700' as const },
  cardName: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2, flexShrink: 1 },
  cardSpacer: { flex: 1 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardVenue: { fontSize: 12, fontWeight: '600' as const },
  cardDot: { fontSize: 12, fontWeight: '500' as const },
  cardTime: { fontSize: 12, fontWeight: '500' as const },
  cardPhotoContainer: { width: '100%', height: CARD_PHOTO_HEIGHT },
  cardPhoto: { width: '100%', height: '100%' },
  cardCaptionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  cardCaptionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  emptyState: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: '500' as const },
});
