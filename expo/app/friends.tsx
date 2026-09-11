import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, ChevronRight, ShieldCheck, Star, UserPlus, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { tierDefinitions, getTierInfo, type TierInfo } from '@/mocks/friends';
import {
  getFriendsAndRequests,
  findUserByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  setCloseFriend,
  type RealFriend,
  type RealFriendRequest,
} from '@/services/friends';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [friends, setFriends] = useState<RealFriend[]>([]);
  const [requests, setRequests] = useState<RealFriendRequest[]>([]);
  const [addUsername, setAddUsername] = useState<string>('');

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const { friends, requests } = await getFriendsAndRequests(user.id);
    setFriends(friends);
    setRequests(requests);
  }, [user?.id]);

  useEffect(() => { void reload(); }, [reload]);

  const handleAcceptRequest = useCallback(async (request: RealFriendRequest) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = await acceptFriendRequest(request.friendshipId);
    if (ok) void reload();
  }, [reload]);

  const handleDeclineRequest = useCallback(async (request: RealFriendRequest) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await declineFriendRequest(request.friendshipId);
    if (ok) void reload();
  }, [reload]);

  const handleAddFriend = useCallback(async () => {
    if (!user?.id || !addUsername.trim()) return;
    const target = await findUserByUsername(addUsername.trim());
    if (!target) {
      Alert.alert('Not found', `No user @${addUsername.trim()}`);
      return;
    }
    const result = await sendFriendRequest(user.id, target.id);
    if (result.success) {
      setAddUsername('');
      Alert.alert('Sent', `Friend request sent to ${target.displayName}`);
    } else {
      Alert.alert('Could not send request', result.error);
    }
  }, [user?.id, addUsername]);

  const handleToggleClose = useCallback(async (friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await setCloseFriend(friend.friendshipId, friend.isMeA, !friend.iGrantClose);
    if (ok) void reload();
  }, [reload]);

  const handleUnfriend = useCallback(async (friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Remove friend', `Remove ${friend.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const ok = await unfriend(friend.friendshipId);
          if (ok) void reload();
        },
      },
    ]);
  }, [reload]);

  const sections = useMemo(() => {
    const innerCircle = friends.filter((f) => f.tier === 'inner_circle');
    const friendsList = friends.filter((f) => f.tier === 'friends');

    const data: Array<{
      title: string;
      data: RealFriend[];
      tier?: TierInfo;
      requests?: RealFriendRequest[];
    }> = [];

    if (requests.length > 0) {
      data.push({ title: 'Requests', data: [], requests });
    }
    if (innerCircle.length > 0) {
      data.push({ title: 'Inner Circle', data: innerCircle, tier: tierDefinitions.find((t) => t.id === 'inner_circle') });
    }
    if (friendsList.length > 0) {
      data.push({ title: 'Friends', data: friendsList, tier: tierDefinitions.find((t) => t.id === 'friends') });
    }
    return data;
  }, [friends, requests]);

  const handleFriendPress = useCallback((friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleClose(friend);
  }, [handleToggleClose]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: RealFriend[]; tier?: TierInfo; requests?: RealFriendRequest[] } }) => {
      const tierColor = section.tier?.color ?? colors.aqua;
      return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            {section.tier && <View style={[styles.tierDot, { backgroundColor: tierColor }]} />}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            {section.tier && <Text style={[styles.sectionCount, { color: colors.textSoft }]}>{section.data.length}</Text>}
          </View>
          {section.requests && section.requests.length > 0 && (
            <Text style={[styles.requestCount, { color: colors.aqua }]}>{section.requests.length}</Text>
          )}
        </View>
      );
    },
    [colors],
  );

  const renderFriend = useCallback(
    ({ item }: { item: RealFriend }) => {
      const tierInfo = getTierInfo(item.tier);
      const initials = item.displayName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

      return (
        <Pressable
          onPress={() => handleFriendPress(item)}
          onLongPress={() => handleUnfriend(item)}
          style={({ pressed }) => [styles.friendRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.avatar, { backgroundColor: tierInfo.color + '20', borderColor: tierInfo.color + '30' }]}>
            <Text style={[styles.avatarText, { color: tierInfo.color }]}>{initials}</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
            <View style={styles.friendMeta}>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{item.username}</Text>
            </View>
          </View>
          <View style={styles.friendTrailing}>
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + '18' }]}>
              {item.tier === 'inner_circle' ? <Star color={tierInfo.color} size={10} /> : <ShieldCheck color={tierInfo.color} size={10} />}
              <Text style={[styles.tierBadgeText, { color: tierInfo.color }]}>{tierInfo.label}</Text>
            </View>
            <ChevronRight color={colors.textSoft} size={16} />
          </View>
        </Pressable>
      );
    },
    [colors, handleFriendPress, handleUnfriend],
  );

  const renderRequest = useCallback(
    (request: RealFriendRequest) => {
      const initials = request.displayName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
      return (
        <View key={request.friendshipId} style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.aqua + '20', borderColor: colors.aqua + '30' }]}>
            <Text style={[styles.avatarText, { color: colors.aqua }]}>{initials}</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{request.displayName}</Text>
            <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{request.username}</Text>
          </View>
          <View style={styles.requestActions}>
            <Pressable onPress={() => handleAcceptRequest(request)} style={({ pressed }) => [styles.requestBtn, { backgroundColor: colors.aqua, opacity: pressed ? 0.8 : 1 }]}>
              <Check color="#fff" size={14} />
            </Pressable>
            <Pressable onPress={() => handleDeclineRequest(request)} style={({ pressed }) => [styles.requestBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', opacity: pressed ? 0.7 : 1 }]}>
              <X color={colors.textMuted} size={14} />
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, isDark, handleAcceptRequest, handleDeclineRequest],
  );

  const renderItem = useCallback(({ item }: { item: RealFriend }) => renderFriend({ item }), [renderFriend]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Friends', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 } }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => ('friendshipId' in item ? item.friendshipId : '')}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          // Passed as a React element (not a function) so SectionList
          // reuses the same subtree across parent re-renders. An inline
          // `() => (...)` here is a new component type each keystroke,
          // which unmounted the TextInput and dropped keyboard focus.
          <View style={styles.addFriendRow}>
            <View style={[styles.addFriendInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={addUsername}
                onChangeText={setAddUsername}
                placeholder="Add by username"
                placeholderTextColor={colors.textSoft}
                autoCapitalize="none"
                style={[styles.addFriendText, { color: colors.text }]}
                onSubmitEditing={handleAddFriend}
              />
            </View>
            <Pressable onPress={handleAddFriend} style={[styles.addFriendBtn, { backgroundColor: colors.aqua }]}>
              <UserPlus color="#fff" size={18} />
            </Pressable>
          </View>
        }
        ListFooterComponent={() => {
          if (requests.length === 0) return null;
          return <View style={styles.requestsBlock}>{requests.map(renderRequest)}</View>;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingTop: 8 },
  addFriendRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addFriendInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center', height: 44 },
  addFriendText: { fontSize: 14, fontWeight: '500' as const },
  addFriendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 8 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1 },
  sectionCount: { fontSize: 12, fontWeight: '600' as const },
  requestCount: { fontSize: 13, fontWeight: '700' as const },
  requestsBlock: { gap: 8, marginTop: 16 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  requestBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 16, fontWeight: '700' as const },
  friendInfo: { flex: 1, gap: 3 },
  friendName: { fontSize: 15, fontWeight: '700' as const },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friendHandle: { fontSize: 12, fontWeight: '500' as const },
  friendTrailing: { alignItems: 'flex-end', gap: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierBadgeText: { fontSize: 10, fontWeight: '600' as const },
});
