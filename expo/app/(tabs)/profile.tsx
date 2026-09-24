import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
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
  Bug,
  ChevronRight,
  Edit3,
  FileText,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
} from 'lucide-react-native';

import { getFriendsAndRequests } from '@/services/friends';
import { getMyCheckIns } from '@/services/crewFeed';
import { getCurrentUserAge } from '@/services/demographics';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import { useTabScroll } from '@/providers/TabScrollProvider';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  isDestructive?: boolean;
  isLast?: boolean;
  testID?: string;
}

function MenuItem({ icon, label, sublabel, onPress, trailing, isDestructive, isLast, testID }: MenuItemProps) {
  const { colors } = useTheme();
  const iconColor = isDestructive ? colors.danger : colors.aqua;
  const labelColor = isDestructive ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.menuRow,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
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

// A bottom sheet that:
//   * slides up from the bottom, backdrop fades in
//   * shows a small horizontal drag indicator centered at the top
//   * can be dragged downward to dismiss (threshold-based)
//   * can be dismissed by tapping the backdrop
//   * only rises as high as its content requires (capped at 80% of
//     screen height so it never occupies the entire screen)
//
// `children` is rendered inside a ScrollView. It receives a
// `close(action?)` helper that runs the slide-down animation before
// firing the caller's action — so tapping a menu item feels like
// the sheet dismisses then navigates, rather than snapping shut.
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: (close: (action?: () => void) => void) => React.ReactNode;
}

function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 12, tension: 60, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      dragY.setValue(0);
    }
  }, [visible, slideAnim, backdropOpacity, dragY]);

  const close = useCallback((action?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim,      { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity,{ toValue: 0,            duration: 200, useNativeDriver: true }),
      Animated.timing(dragY,          { toValue: 0,            duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      if (action) action();
    });
  }, [slideAnim, backdropOpacity, dragY, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_evt, g) => {
          if (g.dy > 0) dragY.setValue(g.dy);
        },
        onPanResponderRelease: (_evt, g) => {
          if (g.dy > 80 || g.vy > 0.5) {
            close();
          } else {
            Animated.spring(dragY, { toValue: 0, friction: 10, tension: 80, useNativeDriver: true }).start();
          }
        },
      }),
    [close, dragY],
  );

  const translateY = Animated.add(slideAnim, dragY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close()}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} testID="bottom-sheet-backdrop" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ translateY }],
            maxHeight: SCREEN_HEIGHT * 0.8,
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View
            style={[
              styles.handleBar,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)' },
            ]}
          />
        </View>
        <ScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children(close)}
        </ScrollView>
      </Animated.View>
    </Modal>
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

  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const handleToggleTheme = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Tap cycles through the three modes — the label in the row
    // shows the current mode so the user can see the state advance.
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

  // Same mailto contract Settings used to use before the Legal and
  // Support sections were moved into this menu. Support inbox is
  // hello@pulze.pro; race/ethnicity corrections still go to
  // contact@pulze.pro from the Demographics section in Settings.
  const openMail = useCallback((subject: string) => {
    const url = `mailto:hello@pulze.pro?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Email unavailable', 'Please email hello@pulze.pro');
    });
  }, []);

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
              setMenuVisible(true);
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

        <Text style={[styles.footer, { color: colors.textSoft }]}>Pulze · v1.0.0</Text>
      </ScrollView>

      <BottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        {(close) => (
          <>
            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>MAIN</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MenuItem
                icon={<Edit3 />}
                label="Edit Profile"
                onPress={() => close(() => router.push('/edit-profile'))}
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
                onPress={() => close(() => router.push('/settings'))}
                isLast
                testID="menu-settings"
              />
            </View>

            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>LEGAL</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MenuItem
                icon={<Shield />}
                label="Privacy Policy"
                onPress={() => close(() => router.push('/privacy-policy'))}
                testID="menu-privacy"
              />
              <MenuItem
                icon={<FileText />}
                label="Terms of Service"
                onPress={() => close(() => router.push('/terms-of-service'))}
                isLast
                testID="menu-terms"
              />
            </View>

            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>SUPPORT</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MenuItem
                icon={<MessageSquare />}
                label="Send Feedback"
                sublabel="hello@pulze.pro"
                onPress={() => close(() => openMail('Pulze Feedback'))}
                testID="menu-feedback"
              />
              <MenuItem
                icon={<Bug />}
                label="Report a Bug"
                sublabel="Help us improve Pulze"
                onPress={() => close(() => openMail('Bug Report'))}
                isLast
                testID="menu-bug"
              />
            </View>

            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 4 }]}>
              <MenuItem
                icon={<LogOut />}
                label="Sign Out"
                onPress={() => close(handleLogout)}
                isDestructive
                isLast
                trailing={<ChevronRight color={colors.danger} size={18} />}
                testID="menu-signout"
              />
            </View>
          </>
        )}
      </BottomSheet>
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
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTextWrap: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: '600' as const },
  menuSublabel: { fontSize: 12 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillBadgeText: { fontSize: 11, fontWeight: '700' as const },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 8 },

  // Bottom sheet
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 19, 24, 0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 10,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    marginTop: 6,
  },
});
