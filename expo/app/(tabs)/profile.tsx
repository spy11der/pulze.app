import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  Edit3,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react-native';

import { getFriendsAndRequests } from '@/services/friends';
import { getMyCheckIns } from '@/services/crewFeed';
import { getCurrentUserAge } from '@/services/demographics';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  isDestructive?: boolean;
  testID?: string;
}

function MenuItem({ icon, label, sublabel, onPress, trailing, isDestructive, testID }: MenuItemProps) {
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
      if (!user?.id) {
        setRealCheckInCount(0);
        return;
      }
      getMyCheckIns(user.id)
        .then((items) => setRealCheckInCount(items.length))
        .catch(() => {});
    }, [user?.id]),
  );

  // Age comes from the SECURITY DEFINER RPC get_current_user_age()
  // — the client never sees raw DOB. Recomputed on focus so a
  // user staying signed in on their birthday sees the number roll
  // over on their next return to Profile.
  const [age, setAge] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setAge(null);
        return;
      }
      let cancelled = false;
      void getCurrentUserAge().then((a) => {
        if (!cancelled) setAge(a);
      });
      return () => { cancelled = true; };
    }, [user?.id]),
  );

  // Only the friends count is displayed on Profile now — the tier
  // breakdown and pending-request badge live on the Friends screen.
  const [friendsCount, setFriendsCount] = useState<number>(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getFriendsAndRequests(user.id).then(({ friends }) => {
      if (cancelled) return;
      setFriendsCount(friends.length);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // No fabricated fallbacks — if the auth-derived record is briefly
  // unavailable, the row renders empty until it lands. Empty strings
  // are honest; pretending the user is someone else is not.
  const displayName = user?.displayName ?? '';
  const username = user?.username ?? '';
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }, [displayName]);

  const savedCount = favoriteVenues.length;

  const [hamburgerVisible, setHamburgerVisible] = useState<boolean>(false);
  const closeHamburger = useCallback(() => setHamburgerVisible(false), []);

  const handleToggleTheme = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Tap cycles through the three modes — matches the previous
    // Profile behavior; the label in the row shows the current mode
    // so the user can see the state advance.
    const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
    void setThemeMode(next);
  }, [mode, setThemeMode]);

  const handleEditProfile = useCallback(() => {
    void Haptics.selectionAsync();
    closeHamburger();
    router.push('/edit-profile');
  }, [router, closeHamburger]);

  const handleOpenSettings = useCallback(() => {
    void Haptics.selectionAsync();
    closeHamburger();
    router.push('/settings');
  }, [router, closeHamburger]);

  const handleLogout = useCallback(() => {
    closeHamburger();
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
  }, [logout, closeHamburger]);

  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';
  const ThemeIcon = isDark ? Moon : Sun;

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
            onPress={() => {
              void Haptics.selectionAsync();
              setHamburgerVisible(true);
            }}
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            testID="profile-menu-btn"
          >
            <Menu color={colors.text} size={18} />
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
              <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>
                @{username}
                {age !== null ? ` · ${age}` : ''}
              </Text>
            </View>
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
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/friends');
            }}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            testID="stat-friends"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{friendsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.textSoft }]}>Pulze · v1.0.0 · Denver</Text>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={hamburgerVisible}
        onRequestClose={closeHamburger}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeHamburger} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Menu</Text>
            <Pressable
              onPress={closeHamburger}
              style={({ pressed }) => [styles.modalCloseBtn, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
              testID="profile-menu-close"
            >
              <X color={colors.textMuted} size={16} />
            </Pressable>
          </View>

          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem
              icon={<Edit3 />}
              label="Edit Profile"
              onPress={handleEditProfile}
              testID="menu-edit-profile"
            />
            <MenuItem
              icon={<ThemeIcon />}
              label="Theme"
              sublabel={`Currently ${themeLabel}`}
              onPress={handleToggleTheme}
              trailing={
                <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.pillBadgeText, { color: colors.text }]}>{themeLabel}</Text>
                </View>
              }
              testID="menu-theme"
            />
            <MenuItem
              icon={<Settings />}
              label="Settings"
              sublabel="Privacy, alerts, location"
              onPress={handleOpenSettings}
              testID="menu-settings"
            />
            <MenuItem
              icon={<LogOut />}
              label="Sign Out"
              onPress={handleLogout}
              isDestructive
              trailing={<ChevronRight color={colors.danger} size={18} />}
              testID="menu-signout"
            />
          </View>
        </View>
      </Modal>
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
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  menuGroup: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTextWrap: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: '600' as const },
  menuSublabel: { fontSize: 12 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillBadgeText: { fontSize: 11, fontWeight: '700' as const },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 19, 24, 0.55)',
  },
  modalSheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '82%',
    borderLeftWidth: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
