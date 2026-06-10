import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, ChevronRight, Clock, ShieldCheck, Users, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  type Friend,
  type FriendRequest,
  type FriendTier,
  type TierInfo,
  mockFriends,
  mockFriendRequests,
  tierDefinitions,
  getTierInfo,
} from '@/mocks/friends';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const sections = useMemo(() => {
    const innerCircle = mockFriends.filter((f) => f.tier === 'inner_circle');
    const friends = mockFriends.filter((f) => f.tier === 'friends' || f.tier === 'public');

    const data: Array<{
      title: string;
      data: Friend[];
      tier?: TierInfo;
      requests?: FriendRequest[];
    }> = [];

    if (mockFriendRequests.length > 0) {
      data.push({
        title: 'Requests',
        data: [],
        requests: mockFriendRequests,
      });
    }

    if (innerCircle.length > 0) {
      data.push({
        title: 'Inner Circle',
        data: innerCircle,
        tier: tierDefinitions.find((t) => t.id === 'inner_circle'),
      });
    }

    if (friends.length > 0) {
      data.push({
        title: 'Friends',
        data: friends,
        tier: tierDefinitions.find((t) => t.id === 'friends'),
      });
    }

    return data;
  }, []);

  const handleFriendPress = useCallback(
    (friend: Friend) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; tier?: TierInfo; requests?: FriendRequest[] } }) => {
      const tierColor = section.tier?.color ?? colors.aqua;
      return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            {section.tier && (
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            )}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title}
            </Text>
            {section.tier && (
              <Text style={[styles.sectionCount, { color: colors.textSoft }]}>
                {section.data.length}
              </Text>
            )}
          </View>
          {section.requests && section.requests.length > 0 && (
            <Text style={[styles.requestCount, { color: colors.aqua }]}>
              {section.requests.length}
            </Text>
          )}
        </View>
      );
    },
    [colors],
  );

  const renderFriend = useCallback(
    ({ item }: { item: Friend }) => {
      const tierInfo = getTierInfo(item.tier);
      const initials = item.name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return (
        <Pressable
          onPress={() => handleFriendPress(item)}
          style={({ pressed }) => [
            styles.friendRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: tierInfo.color + '20', borderColor: tierInfo.color + '30' }]}>
            <Text style={[styles.avatarText, { color: tierInfo.color }]}>{initials}</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.friendMeta}>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{item.handle}</Text>
              <Text style={[styles.friendDot, { color: colors.textSoft }]}>·</Text>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>
                {item.mutualFriends} mutual
              </Text>
            </View>
          </View>
          <View style={styles.friendTrailing}>
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + '18' }]}>
              <ShieldCheck color={tierInfo.color} size={10} />
              <Text style={[styles.tierBadgeText, { color: tierInfo.color }]}>{tierInfo.label}</Text>
            </View>
            <ChevronRight color={colors.textSoft} size={16} />
          </View>
        </Pressable>
      );
    },
    [colors, handleFriendPress],
  );

  const renderRequest = useCallback(
    (request: FriendRequest) => {
      const initials = request.name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return (
        <View
          key={request.id}
          style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.aqua + '20', borderColor: colors.aqua + '30' },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.aqua }]}>{initials}</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
              {request.name}
            </Text>
            <View style={styles.friendMeta}>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>
                @{request.handle}
              </Text>
              <Text style={[styles.friendDot, { color: colors.textSoft }]}>·</Text>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>
                {request.mutualFriends} mutual
              </Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            <Pressable
              style={({ pressed }) => [
                styles.requestBtn,
                { backgroundColor: colors.aqua, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Check color="#fff" size={14} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.requestBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X color={colors.textMuted} size={14} />
            </Pressable>
          </View>
        </View>
      );
    },
    [colors],
  );

  const renderItem = useCallback(
    ({ item, section }: { item: Friend; section: { requests?: FriendRequest[] } }) => {
      return renderFriend({ item });
    },
    [renderFriend],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => ('id' in item ? item.id : '')}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={() => {
          const firstSection = sections[0];
          if (firstSection?.requests && firstSection.requests.length > 0) {
            return (
              <View style={styles.requestsBlock}>
                {firstSection.requests.map(renderRequest)}
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  requestCount: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  requestsBlock: {
    gap: 8,
    marginBottom: 16,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  friendInfo: {
    flex: 1,
    gap: 3,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  friendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendHandle: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  friendDot: {
    fontSize: 12,
  },
  friendTrailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
});
