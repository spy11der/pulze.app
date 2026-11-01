import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ban, Check, Flag, Lock, MapPin, MoreHorizontal, Star, UserMinus, UserPlus, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getSocialProfile, type SocialProfile } from '@/services/profiles';
import { getUserCheckIns } from '@/services/crewFeed';
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  setCloseFriend,
  setLocationSharing,
  unfriend,
} from '@/services/friends';
import { blockUser, unblockUser } from '@/services/safety';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { useFriendshipChanges } from '@/hooks/useFriendshipChanges';
import type { FriendCheckInFeedItem } from '@/mocks/friends';

const FAILED = 'Something went wrong. Check your connection and try again.';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const myId = user?.id;

  const [profile, setProfile] = useState<SocialProfile | 'unavailable' | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [checkIns, setCheckIns] = useState<FriendCheckInFeedItem[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [reporting, setReporting] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!id) return;
    const p = await getSocialProfile(id);
    if (p === null) {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      return;
    }
    setProfile(p);
    // Blocked either way: no check-ins at all (the server would return none anyway).
    if (p !== 'unavailable' && p.relationship !== 'blocked') {
      setCheckIns((await getUserCheckIns(id)) ?? []);
    } else {
      setCheckIns([]);
    }
    setStatus('ready');
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useFriendshipChanges(myId, load);

  // Every action: one at a time, then re-read from the server (the truth).
  const act = useCallback(async (fn: () => Promise<boolean>, title: string) => {
    if (busy) return;
    setBusy(true);
    void Haptics.selectionAsync();
    const ok = await fn();
    setBusy(false);
    if (!ok) Alert.alert(title, FAILED);
    void load();
  }, [busy, load]);

  const p = profile && profile !== 'unavailable' ? profile : null;

  const confirmBlock = useCallback(() => {
    if (!p || !myId) return;
    Alert.alert(
      `Block ${p.displayName}?`,
      "They won't be able to send you friend requests, and you won't see each other's check-ins. Any friendship between you ends. They aren't notified.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => void act(async () => (await blockUser(myId, p.userId)).ok, 'Could not block') },
      ],
    );
  }, [p, myId, act]);

  const confirmUnfriend = useCallback(() => {
    if (!p?.friendshipId) return;
    const fid = p.friendshipId;
    Alert.alert('Remove friend', `Remove ${p.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void act(() => unfriend(fid), 'Could not remove friend') },
    ]);
  }, [p, act]);

  const menuActions: SheetAction[] = !p || p.relationship === 'self' ? [] : [
    ...(p.relationship === 'friends'
      ? [{ id: 'remove', label: 'Remove friend', icon: UserMinus, destructive: true, onPress: confirmUnfriend }]
      : []),
    ...(p.relationship === 'blocked'
      ? [{ id: 'unblock', label: 'Unblock', icon: Ban, onPress: () => void act(async () => (await unblockUser(p.userId)).ok, 'Could not unblock') }]
      : [{ id: 'block', label: 'Block', icon: Ban, destructive: true, onPress: confirmBlock }]),
    { id: 'report', label: 'Report profile', icon: Flag, destructive: true, onPress: () => setReporting(true) },
  ];

  const header = (
    <Stack.Screen
      options={{
        title: p ? `@${p.username}` : 'Profile',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' as const, fontSize: 17 },
        headerRight: p && p.relationship !== 'self' ? () => (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} accessibilityLabel="Profile options" testID="profile-menu">
            <MoreHorizontal color={colors.text} size={22} />
          </Pressable>
        ) : undefined,
      }}
    />
  );

  if (status === 'loading') {
    return <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>{header}<ActivityIndicator color={colors.aqua} /></View>;
  }
  if (status === 'error' || profile === 'unavailable' || !p) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        {header}
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {status === 'error' ? "Couldn't load this profile" : "This profile isn't available"}
        </Text>
        <Pressable onPress={() => (status === 'error' ? void load() : router.back())} style={[styles.primaryBtn, { backgroundColor: colors.aqua }]}>
          <Text style={[styles.primaryText, { color: colors.background }]}>{status === 'error' ? 'Try again' : 'Go back'}</Text>
        </Pressable>
      </View>
    );
  }

  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const initials = p.displayName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const relationshipBlock = (() => {
    switch (p.relationship) {
      case 'self':
        return (
          <Pressable onPress={() => router.push('/edit-profile')} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>Edit profile</Text>
          </Pressable>
        );
      case 'blocked':
        return (
          <View style={[styles.notice, { backgroundColor: subtle }]}>
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>You blocked this account.</Text>
            <Pressable onPress={() => void act(async () => (await unblockUser(p.userId)).ok, 'Could not unblock')} disabled={busy} style={[styles.secondaryBtn, { borderColor: colors.border }]} testID="profile-unblock">
              <Text style={[styles.secondaryText, { color: colors.text }]}>Unblock</Text>
            </Pressable>
          </View>
        );
      case 'none':
        return (
          <Pressable
            onPress={() => myId && void act(async () => {
              const r = await sendFriendRequest(myId, p.userId);
              if (!r.success && r.error) Alert.alert('Could not send request', r.error);
              return true;
            }, 'Could not send request')}
            disabled={busy}
            style={[styles.primaryBtn, { backgroundColor: colors.aqua, opacity: busy ? 0.6 : 1 }]}
            testID="profile-add-friend"
          >
            <UserPlus color={colors.background} size={16} />
            <Text style={[styles.primaryText, { color: colors.background }]}>Add friend</Text>
          </Pressable>
        );
      case 'request_sent':
        return (
          <View style={styles.row}>
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>Request sent</Text>
            <Pressable onPress={() => p.friendshipId && void act(() => declineFriendRequest(p.friendshipId as string), 'Could not cancel')} disabled={busy} style={[styles.secondaryBtn, { borderColor: colors.border }]} testID="profile-cancel-request">
              <Text style={[styles.secondaryText, { color: colors.text }]}>Cancel request</Text>
            </Pressable>
          </View>
        );
      case 'request_received':
        return (
          <View style={styles.row}>
            <Pressable onPress={() => p.friendshipId && void act(() => acceptFriendRequest(p.friendshipId as string), 'Could not accept')} disabled={busy} style={[styles.primaryBtn, { backgroundColor: colors.aqua }]} testID="profile-accept">
              <Check color={colors.background} size={16} />
              <Text style={[styles.primaryText, { color: colors.background }]}>Accept</Text>
            </Pressable>
            <Pressable onPress={() => p.friendshipId && void act(() => declineFriendRequest(p.friendshipId as string), 'Could not decline')} disabled={busy} style={[styles.secondaryBtn, { borderColor: colors.border }]} testID="profile-decline">
              <X color={colors.textMuted} size={16} />
              <Text style={[styles.secondaryText, { color: colors.text }]}>Decline</Text>
            </Pressable>
          </View>
        );
      case 'friends':
        return (
          <View style={[styles.grants, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.friendsLabel, { color: colors.aqua }]}>
              Friends{p.theyGrantClose ? ' · you are in their Inner Circle' : ''}
            </Text>
            <View style={styles.grantRow}>
              <Star color={colors.textMuted} size={16} />
              <View style={styles.grantBody}>
                <Text style={[styles.grantTitle, { color: colors.text }]}>In your Inner Circle</Text>
                <Text style={[styles.grantSub, { color: colors.textMuted }]}>They can see your private check-ins</Text>
              </View>
              <Switch value={p.iGrantClose} disabled={busy} accessibilityLabel="In your Inner Circle"
                onValueChange={(v) => { if (p.friendshipId) void act(() => setCloseFriend(p.friendshipId as string, p.isMeA, v), 'Could not update Inner Circle'); }}
                trackColor={{ false: colors.border, true: colors.aqua }} testID="profile-inner-circle" />
            </View>
            <View style={styles.grantRow}>
              <MapPin color={colors.textMuted} size={16} />
              <View style={styles.grantBody}>
                <Text style={[styles.grantTitle, { color: colors.text }]}>Share where you are</Text>
                <Text style={[styles.grantSub, { color: colors.textMuted }]}>They see you at a venue when you&apos;re there</Text>
              </View>
              <Switch value={p.iShareLocation} disabled={busy} accessibilityLabel="Share where you are"
                onValueChange={(v) => { if (p.friendshipId) void act(() => setLocationSharing(p.friendshipId as string, p.isMeA, v), 'Could not update location sharing'); }}
                trackColor={{ false: colors.border, true: colors.aqua }} testID="profile-share-location" />
            </View>
          </View>
        );
    }
  })();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {header}
      <FlatList
        data={checkIns}
        keyExtractor={(c) => c.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={styles.head}>
            {p.avatarUrl ? (
              <Image source={{ uri: p.avatarUrl }} style={styles.avatar} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.aqua + '1A' }]}>
                <Text style={[styles.initials, { color: colors.aqua }]}>{initials}</Text>
              </View>
            )}
            <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">{p.displayName}</Text>
            <Text style={[styles.handle, { color: colors.textMuted }]}>@{p.username}</Text>
            {p.bio ? <Text style={[styles.bio, { color: colors.text }]}>{p.bio}</Text> : null}
            <View style={styles.actions}>{relationshipBlock}</View>
            {p.relationship !== 'blocked' ? (
              <Text style={[styles.section, { color: colors.textMuted }]}>CHECK-INS</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={p.relationship === 'blocked' ? undefined : (
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {p.relationship === 'self' ? 'Your check-ins will show here.' : 'No check-ins you can see yet.'}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/checkin-detail', params: { checkInId: item.id } })}
            style={({ pressed }) => [styles.tile, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF', opacity: pressed ? 0.8 : 1 }]}
            accessibilityLabel={`Check-in at ${item.venueName}, ${item.timeAgo}${item.visibility === 'private' ? ', Inner Circle only' : ''}`}
          >
            {item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.tileImage} /> : <MapPin color={colors.aqua} size={20} />}
            <View style={styles.tileOverlay}>
              {item.visibility === 'private' ? <Lock color="#fff" size={10} /> : null}
              <Text style={styles.tileText} numberOfLines={1}>{item.venueName}</Text>
            </View>
          </Pressable>
        )}
      />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={p.displayName} subtitle={`@${p.username}`} actions={menuActions} testID="profile-actions" />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="user" targetId={p.userId} targetLabel={`@${p.username}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  head: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 6 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 30, fontWeight: '800' as const },
  name: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, marginTop: 6 },
  handle: { fontSize: 14, fontWeight: '500' as const },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  actions: { width: '100%', alignItems: 'center', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, minHeight: 44, borderRadius: 14, justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '700' as const },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 44, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700' as const },
  notice: { alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, width: '100%' },
  noticeText: { fontSize: 14, fontWeight: '600' as const },
  grants: { width: '100%', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  friendsLabel: { fontSize: 13, fontWeight: '700' as const },
  grantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grantBody: { flex: 1, gap: 2 },
  grantTitle: { fontSize: 14, fontWeight: '700' as const },
  grantSub: { fontSize: 12 },
  section: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700' as const, letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  gridRow: { gap: 4, paddingHorizontal: 4, marginBottom: 4 },
  tile: { flex: 1 / 3, aspectRatio: 1, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tileImage: { width: '100%', height: '100%', position: 'absolute' },
  tileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5, backgroundColor: 'rgba(0,0,0,0.45)' },
  tileText: { color: '#fff', fontSize: 10, fontWeight: '700' as const, flex: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingTop: 8 },
});
