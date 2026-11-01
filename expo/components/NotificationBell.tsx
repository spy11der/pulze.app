import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

/** The bell on Discover, Nearby and Crew: opens Activity, shows unread notices. */
export function NotificationBell() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const unread = useUnreadNotificationCount(user?.id);
  return (
    <Pressable
      onPress={() => router.push('/activity')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
      testID="notification-bell"
    >
      <Bell color={unread > 0 ? colors.text : colors.textMuted} size={20} />
      {unread > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.aqua, borderColor: colors.background }]}>
          <Text style={[styles.badgeText, { color: colors.background }]}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '800' as const },
});
