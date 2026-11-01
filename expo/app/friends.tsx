import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ban, Check, ChevronRight, CircleUser, Flag, MapPin, MapPinOff, MoreHorizontal, ShieldCheck, Star, StarOff, UserMinus, UserPlus, X } from 'lucide-react-native';

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
  setLocationSharing,
  type RealFriend,
  type RealFriendRequest,
  type SentFriendRequest,
} from '@/services/friends';
import { blockUser } from '@/services/safety';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { useFriendshipChanges } from '@/hooks/useFriendshipChanges';

// Someone the action sheet is about: a friend or the sender of a request.
type SheetTarget =
  | { kind: 'friend'; friend: RealFriend }
  | { kind: 'request'; request: RealFriendRequest };

const FAILED = 'Something went wrong. Check your connection and try again.';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [friends, setFriends] = useState<RealFriend[]>([]);
  const [requests, setRequests] = useState<RealFriendRequest[]>([]);
  const [sent, setSent] = useState<SentFriendRequest[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [addUsername, setAddUsername] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; label: string } | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const snapshot = await getFriendsAndRequests(user.id);
    if (!snapshot.loaded) {
      // Keep whatever was on screen; say it couldn't refresh.
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      return;
    }
    setFriends(snapshot.friends);
    setRequests(snapshot.requests);
    setSent(snapshot.sent);
    setStatus('ready');
  }, [user?.id]);

  useEffect(() => { void reload(); }, [reload]);
  // Back from another screen or from the background: refresh, since a
  // realtime event may have been missed while away.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFriendshipChanges(user?.id, reload);

  const run = useCallback(async (action: () => Promise<boolean>, failureTitle: string) => {
    const ok = await action();
    if (!ok) Alert.alert(failureTitle, FAILED);
    void reload();
  }, [reload]);

  const handleAcceptRequest = useCallback(async (request: RealFriendRequest) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await run(() => acceptFriendRequest(request.friendshipId), 'Could not accept request');
  }, [run]);

  const handleDeclineRequest = useCallback(async (request: RealFriendRequest) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await run(() => declineFriendRequest(request.friendshipId), 'Could not decline request');
  }, [run]);

  const handleCancelSent = useCallback(async (request: SentFriendRequest) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await run(() => declineFriendRequest(request.friendshipId), 'Could not cancel request');
  }, [run]);

  const handleAddFriend = useCallback(async () => {
    if (!user?.id || !addUsername.trim() || adding) return;
    setAdding(true);
    try {
      const target = await findUserByUsername(addUsername.trim());
      if (!target) {
        Alert.alert('Not found', `No user @${addUsername.trim().replace(/^@/, '')}`);
        return;
      }
      if (target.id === user.id) {
        Alert.alert("That's you", "You can't send a friend request to yourself.");
        return;
      }
      const result = await sendFriendRequest(user.id, target.id);
      if (result.success) {
        setAddUsername('');
        void reload();
        Alert.alert('Sent', `Friend request sent to ${target.displayName}`);
      } else {
        Alert.alert('Could not send request', result.error);
      }
    } finally {
      setAdding(false);
    }
  }, [user?.id, addUsername, adding, reload]);

  const handleToggleClose = useCallback(async (friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await run(() => setCloseFriend(friend.friendshipId, friend.isMeA, !friend.iGrantClose), 'Could not update Inner Circle');
  }, [run]);

  const handleToggleLocation = useCallback(async (friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await run(() => setLocationSharing(friend.friendshipId, friend.isMeA, !friend.iShareLocation), 'Could not update location sharing');
  }, [run]);

  const handleUnfriend = useCallback((friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Remove friend', `Remove ${friend.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void run(() => unfriend(friend.friendshipId), 'Could not remove friend') },
    ]);
  }, [run]);

  const handleBlock = useCallback((otherId: string, name: string) => {
    if (!user?.id) return;
    Alert.alert(
      `Block ${name}?`,
      "They won't be able to send you friend requests, and you won't see each other's check-ins. Any friendship between you ends. They aren't notified.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockUser(user.id, otherId);
            if (!result.ok) Alert.alert('Could not block', result.error);
            else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void reload();
          },
        },
      ],
    );
  }, [user?.id, reload]);

  const sheetActions = useMemo((): SheetAction[] => {
    if (!sheet) return [];
    if (sheet.kind === 'request') {
      const r = sheet.request;
      return [
        { id: 'profile', label: 'View profile', icon: CircleUser, onPress: () => router.push({ pathname: '/user/[id]', params: { id: r.fromUserId } }) },
        { id: 'block', label: 'Block', subtitle: 'Decline and stop future requests', icon: Ban, destructive: true, onPress: () => handleBlock(r.fromUserId, r.displayName) },
        { id: 'report', label: 'Report profile', icon: Flag, destructive: true, onPress: () => setReportTarget({ id: r.fromUserId, label: `@${r.username}` }) },
      ];
    }
    const f = sheet.friend;
    return [
      { id: 'profile', label: 'View profile', icon: CircleUser, onPress: () => router.push({ pathname: '/user/[id]', params: { id: f.userId } }) },
      f.iGrantClose
        ? { id: 'inner-off', label: 'Remove from your Inner Circle', subtitle: 'They stop seeing your private check-ins', icon: StarOff, onPress: () => void handleToggleClose(f) }
        : { id: 'inner-on', label: 'Add to your Inner Circle', subtitle: 'They can see your private check-ins', icon: Star, onPress: () => void handleToggleClose(f) },
      f.iShareLocation
        ? { id: 'loc-off', label: 'Stop sharing where you are', subtitle: "They won't see you at venues", icon: MapPinOff, onPress: () => void handleToggleLocation(f) }
        : { id: 'loc-on', label: 'Share where you are', subtitle: 'They see you at a venue when you are there', icon: MapPin, onPress: () => void handleToggleLocation(f) },
      { id: 'remove', label: 'Remove friend', icon: UserMinus, destructive: true, onPress: () => handleUnfriend(f) },
      { id: 'block', label: 'Block', icon: Ban, destructive: true, onPress: () => handleBlock(f.userId, f.displayName) },
      { id: 'report', label: 'Report profile', icon: Flag, destructive: true, onPress: () => setReportTarget({ id: f.userId, label: `@${f.username}` }) },
    ];
  }, [sheet, router, handleBlock, handleToggleClose, handleToggleLocation, handleUnfriend]);

  const sections = useMemo(() => {
    const innerCircle = friends.filter((f) => f.tier === 'inner_circle');
    const friendsList = friends.filter((f) => f.tier === 'friends');

    const data: Array<{
      title: string;
      data: RealFriend[];
      tier?: TierInfo;
      requests?: RealFriendRequest[];
    }> = [];

    // Requests stay contextual — only shown when someone actually
    // sent one. Friends and Inner Circle are always visible so the
    // screen's shape doesn't change based on how many friends the
    // user has. Empty sections render an inline placeholder via
    // renderSectionFooter below.
    if (requests.length > 0) {
      data.push({ title: 'Requests', data: [], requests });
    }
    if (sent.length > 0) {
      data.push({ title: 'Sent', data: [] });
    }
    data.push({
      title: 'Friends',
      data: friendsList,
      tier: tierDefinitions.find((t) => t.id === 'friends'),
    });
    data.push({
      title: 'Inner Circle',
      data: innerCircle,
      tier: tierDefinitions.find((t) => t.id === 'inner_circle'),
    });
    return data;
  }, [friends, requests, sent]);

  const handleFriendPress = useCallback((friend: RealFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheet({ kind: 'friend', friend });
  }, []);

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
          onLongPress={() => handleFriendPress(item)}
          accessibilityHint="Opens Inner Circle, location sharing, remove, block and report options"
          testID={`friend-${item.username}`}
          style={({ pressed }) => [styles.friendRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.avatar, { backgroundColor: tierInfo.color + '20', borderColor: tierInfo.color + '30' }]}>
            <Text style={[styles.avatarText, { color: tierInfo.color }]}>{initials}</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
            <View style={styles.friendMeta}>
              <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{item.username}</Text>
              {item.iGrantClose ? <Text style={[styles.friendHandle, { color: colors.textSoft }]}>· in your Inner Circle</Text> : null}
              {item.iShareLocation ? <MapPin color={colors.textSoft} size={11} /> : null}
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
    [colors, handleFriendPress],
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
            <Pressable onPress={() => handleDeclineRequest(request)} accessibilityLabel={`Decline ${request.displayName}`} style={({ pressed }) => [styles.requestBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', opacity: pressed ? 0.7 : 1 }]}>
              <X color={colors.textMuted} size={14} />
            </Pressable>
            <Pressable onPress={() => setSheet({ kind: 'request', request })} accessibilityLabel={`More options for ${request.displayName}`} style={({ pressed }) => [styles.requestBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <MoreHorizontal color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, isDark, handleAcceptRequest, handleDeclineRequest],
  );

  const renderSent = useCallback(
    (request: SentFriendRequest) => (
      <View key={request.friendshipId} style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{request.displayName}</Text>
          <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{request.username} · waiting for them</Text>
        </View>
        <Pressable
          onPress={() => void handleCancelSent(request)}
          style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          testID={`cancel-request-${request.username}`}
        >
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
        </Pressable>
      </View>
    ),
    [colors, handleCancelSent],
  );

  const renderItem = useCallback(({ item }: { item: RealFriend }) => renderFriend({ item }), [renderFriend]);

  // Placeholder shown inline when Friends or Inner Circle has no
  // members. Requests section is intentionally not decorated here —
  // it doesn't render at all when empty.
  const renderSectionFooter = useCallback(
    ({ section }: { section: { title: string; data: RealFriend[] } }) => {
      if (section.title === 'Requests') return null;
      if (section.title === 'Sent') return <View style={styles.requestsBlock}>{sent.map(renderSent)}</View>;
      if (section.data.length > 0) return null;
      const message =
        section.title === 'Friends'
          ? 'No friends yet. Add someone by username above.'
          : 'Nobody has added you to their Inner Circle yet. Tap a friend to add them to yours.';
      return (
        <View
          style={[
            styles.emptyStateRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>{message}</Text>
        </View>
      );
    },
    [colors, sent, renderSent],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Friends', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 } }} />
      {status === 'loading' ? (
        <View style={styles.centered}><ActivityIndicator color={colors.aqua} /></View>
      ) : null}
      {status === 'error' ? (
        <Pressable onPress={() => { setStatus('loading'); void reload(); }} style={[styles.emptyStateRow, styles.errorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>Couldn&apos;t load your friends. Tap to try again.</Text>
        </Pressable>
      ) : null}
      <SectionList
        sections={status === 'ready' ? sections : []}
        keyExtractor={(item) => ('friendshipId' in item ? item.friendshipId : '')}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
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
          <View style={styles.addFriendBlock}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ADD FRIENDS</Text>
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
              <Pressable onPress={handleAddFriend} disabled={adding} accessibilityLabel="Send friend request" style={[styles.addFriendBtn, { backgroundColor: colors.aqua, opacity: adding ? 0.6 : 1 }]}>
                {adding ? <ActivityIndicator color="#fff" /> : <UserPlus color="#fff" size={18} />}
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={() => {
          if (requests.length === 0) return null;
          return <View style={styles.requestsBlock}>{requests.map(renderRequest)}</View>;
        }}
      />
      <ActionSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'friend' ? sheet.friend.displayName : sheet?.kind === 'request' ? sheet.request.displayName : ''}
        subtitle={sheet?.kind === 'friend' ? `@${sheet.friend.username}` : sheet?.kind === 'request' ? `@${sheet.request.username} sent you a request` : undefined}
        actions={sheetActions}
        testID="friend-actions"
      />
      <ReportSheet
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        kind="user"
        targetId={reportTarget?.id ?? ''}
        targetLabel={reportTarget?.label ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingTop: 8 },
  addFriendBlock: { gap: 8, marginBottom: 16 },
  addFriendRow: { flexDirection: 'row', gap: 8 },
  addFriendInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center', height: 44 },
  addFriendText: { fontSize: 14, fontWeight: '500' as const },
  addFriendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyStateRow: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  emptyStateText: { fontSize: 13, fontWeight: '500' as const, textAlign: 'center' },
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
  cancelBtn: { paddingHorizontal: 12, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '600' as const },
  centered: { paddingTop: 40, alignItems: 'center' },
  errorRow: { margin: 16 },
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
