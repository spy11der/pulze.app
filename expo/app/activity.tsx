import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ListRenderItem,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronDown,
  Flame,
  Heart,
  Inbox,
  MapPin,
  UserPlus,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { pulzeVenues } from '@/mocks/venues';

type TabKey = 'notifications' | 'nearby' | 'friendRequests';

type NotifType = 'checkin' | 'busy' | 'request' | 'like' | 'event';

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFS: NotifItem[] = [
  { id: 'n1', type: 'checkin', title: 'Maya checked into Mica Rooftop', time: '2 min ago', unread: true },
  { id: 'n2', type: 'busy', title: 'Fillmore Auditorium is getting busy', time: '8 min ago', unread: true },
  { id: 'n3', type: 'request', title: 'Devon wants to connect', time: '34 min ago', unread: true },
  { id: 'n4', type: 'checkin', title: 'Sasha checked into Cervantes Masterpiece', time: '52 min ago', unread: false },
  { id: 'n5', type: 'like', title: 'Jordan liked your vibe at Bluebird Theater', time: '1 hr ago', unread: false },
  { id: 'n6', type: 'event', title: 'Khruangbin at Red Rocks starts in 2 hours', time: '2 hrs ago', unread: false },
  { id: 'n7', type: 'busy', title: 'Comedy Works Downtown is getting busy', time: '2 hrs ago', unread: false },
  { id: 'n8', type: 'like', title: 'Avery liked your vibe at Gothic Theatre', time: '3 hrs ago', unread: false },
  { id: 'n9', type: 'request', title: 'Riley wants to connect', time: '4 hrs ago', unread: false },
  { id: 'n10', type: 'checkin', title: 'Theo checked into Meow Wolf Denver', time: '5 hrs ago', unread: false },
];

interface FriendRequestItem {
  id: string;
  name: string;
  mutualFriends: number;
  time: string;
}

const MOCK_FRIEND_REQUESTS: FriendRequestItem[] = [
  { id: 'fr1', name: 'Devon', mutualFriends: 12, time: '34 min ago' },
  { id: 'fr2', name: 'Riley', mutualFriends: 5, time: '4 hrs ago' },
  { id: 'fr3', name: 'Jordan', mutualFriends: 23, time: '1 day ago' },
  { id: 'fr4', name: 'Casey', mutualFriends: 8, time: '2 days ago' },
];

const TAB_LABELS: Record<TabKey, string> = {
  notifications: 'Notifications',
  nearby: 'Nearby',
  friendRequests: 'Friend requests',
};

function getVibeDotColor(score: number): string {
  if (score >= 61) return '#2BBFBA';
  if (score >= 31) return '#FFB800';
  return '#FF4444';
}

function getNotifIcon(type: NotifType, color: string, warning: string) {
  const size = 18;
  switch (type) {
    case 'checkin': return <MapPin color={color} size={size} />;
    case 'busy': return <Flame color={warning} size={size} />;
    case 'request': return <UserPlus color={color} size={size} />;
    case 'like': return <Heart color={color} size={size} />;
    case 'event': return <Calendar color={color} size={size} />;
  }
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('notifications');
  const [notifs, setNotifs] = useState<NotifItem[]>(MOCK_NOTIFS);
  const [friendReqs, setFriendReqs] = useState<FriendRequestItem[]>(MOCK_FRIEND_REQUESTS);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);

  const nearby = useMemo(() => {
    return pulzeVenues.slice(0, 6).map((v, i) => ({
      venue: v,
      checkIns: v.checkins,
      lastSeen: ['just now', '3 min ago', '7 min ago', '12 min ago', '22 min ago', '38 min ago'][i] ?? 'recent',
    }));
  }, []);

  const handleMarkAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
    Alert.alert('All marked read');
  }, []);

  const handleAccept = useCallback((id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleDecline = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleOpenDropdown = useCallback(() => {
    triggerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      setDropdownPos({ x: pageX, y: pageY + 4 });
      setShowDropdown(true);
    });
  }, []);

  const handleSelectTab = useCallback((t: TabKey) => {
    void Haptics.selectionAsync();
    setTab(t);
    setShowDropdown(false);
  }, []);

  const handleAcceptFriend = useCallback((id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFriendReqs((prev) => prev.filter((fr) => fr.id !== id));
  }, []);

  const handleDeclineFriend = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFriendReqs((prev) => prev.filter((fr) => fr.id !== id));
  }, []);

  const renderNotif: ListRenderItem<NotifItem> = useCallback(({ item }) => {
    const unreadBg = item.unread ? colors.aqua + '0F' : colors.surface;
    return (
      <View
        style={[
          styles.notifRow,
          {
            backgroundColor: unreadBg,
            borderColor: colors.border,
            borderLeftWidth: item.unread ? 2 : 0,
            borderLeftColor: colors.aqua,
          },
        ]}
        testID={`notif-${item.id}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.aqua + '14' }]}>
          {getNotifIcon(item.type, colors.aqua, colors.amber)}
        </View>
        <View style={styles.notifBody}>
          <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.notifTime, { color: colors.textSoft }]}>{item.time}</Text>
          {item.type === 'request' && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handleAccept(item.id)}
                style={({ pressed }) => [
                  styles.acceptBtn,
                  { backgroundColor: colors.aqua, opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`accept-${item.id}`}
              >
                <Text style={[styles.acceptText, { color: colors.background }]}>Accept</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDecline(item.id)}
                style={({ pressed }) => [
                  styles.declineBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`decline-${item.id}`}
              >
                <Text style={[styles.declineText, { color: colors.textMuted }]}>Decline</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }, [colors, handleAccept, handleDecline]);

  const renderNearby: ListRenderItem<typeof nearby[number]> = useCallback(({ item }) => {
    const dotColor = getVibeDotColor(item.venue.busynessPercent);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/venue-detail', params: { venueId: item.venue.id } })}
        style={({ pressed }) => [
          styles.nearbyRow,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
        testID={`nearby-${item.venue.id}`}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.nearbyBody}>
          <Text style={[styles.nearbyName, { color: colors.text }]} numberOfLines={1}>
            {item.venue.name}
          </Text>
          <Text style={[styles.nearbyMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {item.venue.neighborhood} · {item.checkIns} checked in recently
          </Text>
        </View>
        <Text style={[styles.nearbyTime, { color: colors.textSoft }]}>{item.lastSeen}</Text>
      </Pressable>
    );
  }, [colors, router]);

  const renderFriendReq: ListRenderItem<FriendRequestItem> = useCallback(({ item }) => {
    return (
      <View style={[styles.friendRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.friendAvatar, { backgroundColor: colors.aqua + '14' }]}>
          <UserPlus color={colors.aqua} size={18} />
        </View>
        <View style={styles.friendBody}>
          <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.friendMeta, { color: colors.textMuted }]}>
            {item.mutualFriends} mutual friends
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleAcceptFriend(item.id)}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: colors.aqua, opacity: pressed ? 0.85 : 1 },
              ]}
              testID={`accept-friend-${item.id}`}
            >
              <Text style={[styles.acceptText, { color: colors.background }]}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeclineFriend(item.id)}
              style={({ pressed }) => [
                styles.declineBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`decline-friend-${item.id}`}
            >
              <Text style={[styles.declineText, { color: colors.textMuted }]}>Decline</Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.friendTime, { color: colors.textSoft }]}>{item.time}</Text>
      </View>
    );
  }, [colors, handleAcceptFriend, handleDeclineFriend]);

  const empty = (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.aqua + '14' }]}>
        {tab === 'notifications' ? (
          <Inbox color={colors.aqua} size={32} />
        ) : tab === 'nearby' ? (
          <MapPin color={colors.aqua} size={32} />
        ) : (
          <UserPlus color={colors.aqua} size={32} />
        )}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {tab === 'notifications'
          ? 'No activity yet'
          : tab === 'nearby'
            ? 'Nothing nearby'
            : 'No friend requests'}
      </Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        {tab === 'notifications'
          ? 'Friend check-ins and event alerts will appear here'
          : tab === 'nearby'
            ? 'Move around to discover venues with live activity'
            : "When someone wants to connect, they'll appear here"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="activity-back"
        >
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>
        <Pressable
          ref={triggerRef}
          onPress={handleOpenDropdown}
          style={({ pressed }) => [styles.dropdownTrigger, { opacity: pressed ? 0.6 : 1 }]}
          testID="activity-dropdown"
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {TAB_LABELS[tab]}
          </Text>
          <ChevronDown color={colors.textMuted} size={14} style={styles.chevron} />
        </Pressable>
        <Pressable
          onPress={handleMarkAll}
          style={({ pressed }) => [styles.markBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="mark-all-read"
        >
          <Text style={[styles.markText, { color: colors.aqua }]}>Mark all read</Text>
        </Pressable>
      </View>

      {showDropdown && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowDropdown(false)}
            testID="dropdown-backdrop"
          >
            <View
              style={[
                styles.dropdownMenu,
                {
                  top: dropdownPos.y,
                  left: dropdownPos.x,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {(Object.keys(TAB_LABELS) as TabKey[]).map((t) => {
                const isActive = tab === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => handleSelectTab(t)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      { backgroundColor: pressed ? colors.aqua + '0F' : 'transparent' },
                    ]}
                    testID={`dropdown-${t}`}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        {
                          color: isActive ? colors.aqua : colors.text,
                          fontWeight: isActive ? ('700' as const) : ('500' as const),
                        },
                      ]}
                    >
                      {TAB_LABELS[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      )}

      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const top = nearby[0];
          router.push({
            pathname: '/check-in-capture',
            params: top
              ? { venueId: top.venue.id, venueName: top.venue.name, neighborhood: top.venue.neighborhood }
              : {},
          });
        }}
        style={({ pressed }) => [
          styles.manualCheckin,
          {
            backgroundColor: colors.aqua + '10',
            borderColor: colors.aqua + '20',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        testID="manual-check-in"
      >
        <Camera color={colors.aqua} size={15} />
        <Text style={[styles.manualCheckinText, { color: colors.aqua }]}>
          Check in manually
        </Text>
      </Pressable>

      {tab === 'notifications' ? (
        <FlatList
          data={notifs}
          keyExtractor={(it) => it.id}
          renderItem={renderNotif}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={empty}
          showsVerticalScrollIndicator={false}
        />
      ) : tab === 'nearby' ? (
        <FlatList
          data={nearby}
          keyExtractor={(it) => it.venue.id}
          renderItem={renderNearby}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={empty}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={friendReqs}
          keyExtractor={(it) => it.id}
          renderItem={renderFriendReq}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={empty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  chevron: { marginTop: 1 },
  markBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  markText: { fontSize: 13, fontWeight: '700' as const },
  backdrop: { flex: 1 },
  dropdownMenu: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dropdownItemText: { fontSize: 15 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,

  },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600' as const, lineHeight: 19 },
  notifTime: { fontSize: 12, fontWeight: '500' as const },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  acceptText: { fontSize: 12, fontWeight: '700' as const },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  declineText: { fontSize: 12, fontWeight: '700' as const },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nearbyBody: { flex: 1, gap: 2 },
  nearbyName: { fontSize: 15, fontWeight: '700' as const },
  nearbyMeta: { fontSize: 12 },
  nearbyTime: { fontSize: 11, fontWeight: '600' as const },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
  friendRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBody: { flex: 1, gap: 2 },
  friendName: { fontSize: 14, fontWeight: '700' as const },
  friendMeta: { fontSize: 12 },
  friendTime: { fontSize: 11, fontWeight: '600' as const },
  manualCheckin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  manualCheckinText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
