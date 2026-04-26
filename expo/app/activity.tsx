import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
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
  Bell,
  Calendar,
  Flame,
  Heart,
  Inbox,
  MapPin,
  UserPlus,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { pulzeVenues } from '@/mocks/venues';

type TabKey = 'notifications' | 'nearby';

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

  const nearby = useMemo(() => {
    return pulzeVenues.slice(0, 6).map((v, i) => ({
      venue: v,
      checkIns: 12 + ((v.peopleCount * 7) % 40),
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
    const dotColor = getVibeDotColor(item.venue.vibe_score);
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

  const empty = (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.aqua + '14' }]}>
        {tab === 'notifications' ? (
          <Inbox color={colors.aqua} size={32} />
        ) : (
          <MapPin color={colors.aqua} size={32} />
        )}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {tab === 'notifications' ? 'No activity yet' : 'Nothing nearby'}
      </Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        {tab === 'notifications'
          ? 'Friend check-ins and event alerts will appear here'
          : 'Move around to discover venues with live activity'}
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
        <View style={styles.headerTitleWrap}>
          <Bell color={colors.aqua} size={16} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
        </View>
        <Pressable
          onPress={handleMarkAll}
          style={({ pressed }) => [styles.markBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="mark-all-read"
        >
          <Text style={[styles.markText, { color: colors.aqua }]}>Mark all read</Text>
        </Pressable>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['notifications', 'nearby'] as TabKey[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => {
                void Haptics.selectionAsync();
                setTab(t);
              }}
              style={styles.tabBtn}
              testID={`tab-${t}`}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' },
                ]}
              >
                {t === 'notifications' ? 'Notifications' : 'Nearby'}
              </Text>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.aqua }]} />}
            </Pressable>
          );
        })}
      </View>

      {tab === 'notifications' ? (
        <FlatList
          data={notifs}
          keyExtractor={(it) => it.id}
          renderItem={renderNotif}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={empty}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={nearby}
          keyExtractor={(it) => it.venue.id}
          renderItem={renderNearby}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
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
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  markBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  markText: { fontSize: 13, fontWeight: '700' as const },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    paddingVertical: 14,
    marginRight: 24,
    alignItems: 'center',
  },
  tabText: { fontSize: 14 },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
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
});
