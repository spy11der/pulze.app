import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { listBlockedUsers, unblockUser, type BlockedUser } from '@/services/safety';

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listBlockedUsers();
    if (list === null) {
      setStatus('error');
      return;
    }
    setBlocked(list);
    setStatus('ready');
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleUnblock = useCallback((person: BlockedUser) => {
    Alert.alert(
      `Unblock ${person.displayName}?`,
      "You'll be able to see each other's public check-ins and send friend requests again. Your previous friendship isn't restored.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setBusyId(person.userId);
            const result = await unblockUser(person.userId);
            setBusyId(null);
            if (!result.ok) {
              Alert.alert('Could not unblock', result.error);
              return;
            }
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setBlocked((prev) => prev.filter((p) => p.userId !== person.userId));
          },
        },
      ],
    );
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Blocked accounts', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 } }} />
      {status === 'loading' ? (
        <View style={styles.centered}><ActivityIndicator color={colors.aqua} /></View>
      ) : status === 'error' ? (
        <Pressable onPress={() => { setStatus('loading'); void load(); }} style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Couldn&apos;t load your blocked accounts. Tap to try again.</Text>
        </Pressable>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(p) => p.userId}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListHeaderComponent={
            <Text style={[styles.note, { color: colors.textMuted }]}>
              People you block can&apos;t send you friend requests, and you don&apos;t see each other&apos;s check-ins. They aren&apos;t told.
            </Text>
          }
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>You haven&apos;t blocked anyone.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]} testID={`blocked-${item.username}`}>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
                <Text style={[styles.handle, { color: colors.textMuted }]}>@{item.username}</Text>
              </View>
              <Pressable
                onPress={() => handleUnblock(item)}
                disabled={busyId === item.userId}
                style={({ pressed }) => [styles.unblock, { borderColor: colors.border, opacity: pressed || busyId === item.userId ? 0.6 : 1 }]}
                testID={`unblock-${item.username}`}
              >
                {busyId === item.userId
                  ? <ActivityIndicator color={colors.textMuted} />
                  : <Text style={[styles.unblockText, { color: colors.text }]}>Unblock</Text>}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, paddingTop: 8 },
  note: { fontSize: 13, lineHeight: 18, marginBottom: 14, paddingHorizontal: 4 },
  centered: { paddingTop: 40, alignItems: 'center' },
  empty: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', margin: 16 },
  emptyText: { fontSize: 13, fontWeight: '500' as const, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700' as const },
  handle: { fontSize: 12, fontWeight: '500' as const },
  unblock: { minWidth: 84, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  unblockText: { fontSize: 13, fontWeight: '700' as const },
});
