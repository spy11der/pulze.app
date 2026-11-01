import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, CheckCheck, MapPin, ShieldAlert, ShieldCheck, UserCheck, UserPlus } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { AppealSheet } from '@/components/AppealSheet';
import {
  dismissNotification,
  isAccountNotice,
  isAppealable,
  markNotificationsRead,
  notificationText,
  type AppNotification,
  type NotificationKind,
} from '@/services/notifications';

const ICONS: Record<NotificationKind, React.ComponentType<{ color: string; size: number }>> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  inner_circle_check_in: MapPin,
  moderation_warning: ShieldAlert,
  moderation_content_removed: ShieldAlert,
  account_suspended: ShieldAlert,
  account_reinstated: ShieldCheck,
  appeal_upheld: ShieldAlert,
  appeal_overturned: ShieldCheck,
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationsList({ userId, bottomInset }: { userId: string | undefined; bottomInset: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, setItems, status, reload } = useNotifications(userId);
  const unread = items.filter((n) => !n.read).length;
  const [appealing, setAppealing] = useState<AppNotification | null>(null);

  const open = useCallback(async (n: AppNotification) => {
    void Haptics.selectionAsync();
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void markNotificationsRead([n.id]);
    }
    if ((n.kind === 'friend_request' || n.kind === 'friend_accepted') && n.actorId) {
      router.push({ pathname: '/user/[id]', params: { id: n.actorId } });
    } else if (n.kind === 'inner_circle_check_in' && n.checkInId) {
      router.push({ pathname: '/checkin-detail', params: { checkInId: n.checkInId } });
    } else if (isAccountNotice(n.kind)) {
      const text = `${notificationText(n)}\n\nWe don't share who reported something, and moderators' notes stay private.`;
      Alert.alert('From Pulze', text, isAppealable(n.kind)
        ? [{ text: 'OK', style: 'cancel' }, { text: 'Appeal this decision', onPress: () => setAppealing(n) }]
        : undefined);
    }
  }, [router, setItems]);

  const dismiss = useCallback((n: AppNotification) => {
    Alert.alert('Remove notification?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setItems((prev) => prev.filter((x) => x.id !== n.id));
          if (!(await dismissNotification(n.id))) void reload();
        },
      },
    ]);
  }, [setItems, reload]);

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    if (!(await markNotificationsRead())) void reload();
  }, [setItems, reload]);

  if (status === 'loading') {
    return <View style={styles.centered}><ActivityIndicator color={colors.aqua} /></View>;
  }
  if (status === 'error') {
    return (
      <Pressable onPress={() => void reload()} style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.noticeText, { color: colors.textMuted }]}>Couldn&apos;t load notifications. Tap to try again.</Text>
      </Pressable>
    );
  }

  return (
    <>
    <AppealSheet notificationId={appealing?.id ?? null} summary={appealing ? notificationText(appealing) : ''} onClose={() => setAppealing(null)} />
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 90 }]}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={unread > 0 ? (
        <Pressable onPress={() => void markAll()} style={styles.markAll} accessibilityRole="button" testID="notifications-mark-all">
          <CheckCheck color={colors.aqua} size={14} />
          <Text style={[styles.markAllText, { color: colors.aqua }]}>Mark all as read</Text>
        </Pressable>
      ) : undefined}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.aqua + '14' }]}><Bell color={colors.aqua} size={28} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>Friend requests and check-ins from your Inner Circle show up here.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const Icon = ICONS[item.kind] ?? Bell;
        const account = isAccountNotice(item.kind);
        const tint = account && item.kind !== 'account_reinstated' && item.kind !== 'appeal_overturned' ? colors.amber : colors.aqua;
        return (
          <Pressable
            onPress={() => void open(item)}
            onLongPress={() => dismiss(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Unread. '}${notificationText(item)}. ${timeAgo(item.createdAt)} ago`}
            accessibilityHint="Long press to remove"
            style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: item.read ? colors.border : tint + '66', opacity: pressed ? 0.75 : 1 }]}
            testID={`notification-${item.kind}`}
          >
            <View style={[styles.icon, { backgroundColor: tint + '18' }]}><Icon color={tint} size={18} /></View>
            <View style={styles.body}>
              <Text style={[styles.text, { color: colors.text, fontWeight: item.read ? '500' : '700' }]}>{notificationText(item)}</Text>
              <Text style={[styles.time, { color: colors.textSoft }]}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={[styles.dot, { backgroundColor: tint }]} /> : null}
          </Pressable>
        );
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 12 },
  centered: { paddingTop: 60, alignItems: 'center' },
  notice: { margin: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center' },
  noticeText: { fontSize: 13, fontWeight: '500' as const, textAlign: 'center' },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, minHeight: 44 },
  markAllText: { fontSize: 13, fontWeight: '700' as const },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, minHeight: 56 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  text: { fontSize: 14, lineHeight: 19 },
  time: { fontSize: 11, fontWeight: '600' as const },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});
