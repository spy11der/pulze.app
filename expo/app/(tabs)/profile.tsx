import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  Copy,
  Edit3,
  LogOut,
  MapPin,
  Moon,
  Settings,
  Sun,
  Users,
} from 'lucide-react-native';

import { tierDefinitions } from '@/mocks/friends';
import { getFriendsAndRequests } from '@/services/friends';
import { getMyCheckIns } from '@/services/crewFeed';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';
import { currentUser } from '@/constants/identity';

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  isDestructive?: boolean;
  testID?: string;
}

function MenuRow({ icon, label, sublabel, onPress, trailing, isDestructive, testID }: MenuRowProps) {
  const { colors } = useTheme();
  const iconColor = isDestructive ? colors.danger : colors.aqua;
  const labelColor = isDestructive ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.menuRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: colors.aqua + '14' }]}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, { color: iconColor, size: 18 })
          : icon}
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.menuSublabel, { color: colors.textMuted }]} numberOfLines={1}>{sublabel}</Text>
        ) : null}
      </View>
      {trailing ?? <ChevronRight color={colors.textMuted} size={18} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { onScroll } = useTabScroll();
  const { user, logout } = useAuth();
  const { favoriteVenues } = useFavorites();

  const [realCheckInCount, setRealCheckInCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      // TEMP DIAGNOSTIC (remove once check-in count is root-caused)
      console.log('[PROFILE_CHECKINS] FOCUS', {
        userId: user?.id ?? null,
      });
      if (!user?.id) {
        setRealCheckInCount(0);
        return;
      }

      getMyCheckIns(user.id)
        .then((items) => {
          // TEMP DIAGNOSTIC
          console.log('[PROFILE_CHECKINS] RESULT', {
            userId: user.id,
            count: items.length,
            ids: items.map((item) => item.id),
          });
          setRealCheckInCount(items.length);
        })
        .catch((error) => {
          // TEMP DIAGNOSTIC
          console.error('[PROFILE_CHECKINS] ERROR', error);
        });
    }, [user?.id]),
  );

  const [friendStats, setFriendStats] = useState({ innerCircleCount: 0, friendsCount: 0, requestsCount: 0 });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getFriendsAndRequests(user.id).then(({ friends, requests }) => {
      if (cancelled) return;
      setFriendStats({
        innerCircleCount: friends.filter((f) => f.tier === 'inner_circle').length,
        friendsCount: friends.length,
        requestsCount: requests.length,
      });
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const displayName = user?.displayName || currentUser.displayName;
  const username = user?.username || currentUser.username;
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }, [displayName]);

  const innerCircleTier = tierDefinitions.find((t) => t.id === 'inner_circle');
  const savedCount = favoriteVenues.length;
  const { innerCircleCount, friendsCount, requestsCount } = friendStats;

  const handleCopyId = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(currentUser.pulzeId);
    Alert.alert('Copied', `${currentUser.pulzeId} copied to clipboard`);
  }, []);

  const handleToggleTheme = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
    void setThemeMode(next);
  }, [mode, setThemeMode]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  }, [logout]);

  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';
  const ThemeIcon = isDark ? Moon : Sun;

  // TEMP DIAGNOSTIC — fires on every render, immediately before the stat renders
  console.log('[PROFILE_CHECKINS] RENDER', realCheckInCount);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Settings color={colors.text} size={18} />
          </Pressable>
        </View>

        <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.identityTop}>
            <View style={[styles.avatar, { backgroundColor: colors.aqua + '18', borderColor: colors.aqua + '30' }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.aqua }]}>{initials.toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
              <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>@{username}</Text>
              <View style={styles.metaRow}>
                <MapPin color={colors.textSoft} size={12} />
                <Text style={[styles.metaText, { color: colors.textSoft }]}>{currentUser.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.identityActions}>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [styles.identityBtn, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1 }]}
            >
              <Edit3 color={isDark ? colors.background : colors.white} size={14} />
              <Text style={[styles.identityBtnText, { color: isDark ? colors.background : colors.white }]}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/checkin-history');
            }}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            testID="stat-checkins"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{realCheckInCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Check-ins</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/saved-venues');
            }}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            testID="stat-saved"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{savedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Saved</Text>
          </Pressable>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{friendsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
          </View>
        </View>

        <Pressable
          onPress={handleCopyId}
          style={({ pressed }) => [styles.idChip, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.idChipLabel, { color: colors.textMuted }]}>Pulze ID</Text>
          <Text style={[styles.idChipValue, { color: colors.text }]}>{currentUser.pulzeId}</Text>
          <Copy color={colors.aqua} size={14} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Friends</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon={<Users />}
            label="Friends"
            sublabel={`${friendsCount} friends${requestsCount ? ` · ${requestsCount} request${requestsCount === 1 ? '' : 's'}` : ''}`}
            onPress={() => router.push('/friends')}
          />
          <Pressable
            onPress={() => router.push('/friends')}
            style={({ pressed }) => [styles.tierRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.tierDot, { backgroundColor: innerCircleTier?.color ?? colors.aqua }]} />
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Inner Circle</Text>
              <Text style={[styles.menuSublabel, { color: colors.textMuted }]} numberOfLines={1}>
                {innerCircleCount} {innerCircleCount === 1 ? 'person' : 'people'} with full access
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon={<ThemeIcon />}
            label="Theme"
            sublabel={`Currently ${themeLabel}`}
            onPress={handleToggleTheme}
            trailing={
              <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.pillBadgeText, { color: colors.text }]}>{themeLabel}</Text>
              </View>
            }
          />
          <MenuRow icon={<Settings />} label="Settings" sublabel="Privacy, alerts, location" onPress={() => router.push('/settings')} />
        </View>

        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
          <MenuRow icon={<LogOut />} label="Sign out" onPress={handleLogout} isDestructive trailing={<ChevronRight color={colors.danger} size={18} />} />
        </View>

        <Text style={[styles.footer, { color: colors.textSoft }]}>Pulze · v1.0.0 · Denver</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  headerBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  identityCard: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 14 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 22, fontWeight: '800' as const },
  avatarImage: { width: 64, height: 64, borderRadius: 22 },
  identityInfo: { flex: 1, gap: 2 },
  displayName: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3, flexShrink: 1 },
  username: { fontSize: 13, fontWeight: '600' as const },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, fontWeight: '500' as const },
  bio: { fontSize: 14, lineHeight: 20 },
  identityActions: { flexDirection: 'row', gap: 8 },
  identityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14 },
  identityBtnText: { fontSize: 14, fontWeight: '700' as const },
  idChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  idChipLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
  idChipValue: { fontSize: 13, fontWeight: '700' as const, flex: 1, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, paddingHorizontal: 4, marginTop: 4 },
  menuGroup: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTextWrap: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: '600' as const },
  menuSublabel: { fontSize: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tierDot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 12 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillBadgeText: { fontSize: 11, fontWeight: '700' as const },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
