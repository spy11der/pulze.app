import React, { useMemo, useCallback } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  Edit3,
  LogOut,
  Moon,
  QrCode,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { mockFriends, mockFriendRequests, tierDefinitions } from '@/mocks/friends';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSecureWallet } from '@/providers/SecureWalletProvider';
import { currentUser } from '@/constants/identity';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, mode } = useTheme();
  const { vibeCount, spotCount } = useData();
  const { logout, user: authUser } = useAuth();
  const { documents } = useSecureWallet();

  const tierSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of mockFriends) {
      counts[f.tier] = (counts[f.tier] ?? 0) + 1;
    }
    return counts;
  }, []);

  const handleOpenFriends = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/friends');
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  }, [router]);

  const handleEditProfile = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/edit-profile');
  }, [router]);

  const handleOpenQR = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/qr-code');
  }, [router]);

  const handleOpenWallet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/secure-wallet');
  }, [router]);

  const displayName = authUser?.displayName || currentUser.displayName;
  const username = authUser?.username || currentUser.username;

  const handleCopyId = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(currentUser.pulzeId);
    console.log('[Profile] Copied Pulze ID:', currentUser.pulzeId);
  }, []);

  const handleThemeBadgePress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/settings');
  }, [router]);

  const handleStatPress = useCallback((stat: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stat === 'friends') {
      router.push('/friends');
    } else if (stat === 'vibes') {
      router.push('/(tabs)');
    } else if (stat === 'spots') {
      router.push('/(tabs)/map');
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of Pulse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            console.log('[Profile] User logged out');
            void logout();
          },
        },
      ]
    );
  }, [logout]);

  const ThemeIcon = mode === 'dark' ? Moon : Sun;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="profile-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.18)' : 'rgba(92, 168, 48, 0.12)' }]}>
              <Text style={[styles.avatarText, { color: colors.lime }]}>{displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                onPress={handleEditProfile}
                style={({ pressed }) => [styles.heroBtn, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.btnPressed]}
                testID="edit-profile-btn"
              >
                <Edit3 color={colors.aqua} size={16} />
                <Text style={[styles.heroBtnText, { color: colors.aqua }]}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={handleOpenSettings}
                style={({ pressed }) => [styles.heroIconBtn, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.btnPressed]}
                testID="settings-btn"
              >
                <Settings color={colors.textMuted} size={18} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBody}>
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.handle, { color: colors.textMuted }]}>@{username} · {currentUser.location}</Text>
            <Pressable
              onPress={handleCopyId}
              style={({ pressed }) => [styles.pulzeIdRow, { backgroundColor: colors.aqua + '14' }, pressed && styles.btnPressed]}
            >
              <QrCode color={colors.aqua} size={13} />
              <Text style={[styles.pulzeIdText, { color: colors.aqua }]}>{currentUser.pulzeId}</Text>
              <Copy color={colors.aqua} size={11} />
            </Pressable>
            <Text style={[styles.bio, { color: colors.textSoft }]}>{currentUser.bio}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.trustedLabel}>
                <ShieldCheck color={colors.lime} size={13} />
                <Text style={[styles.trustedLabelText, { color: colors.textSoft }]}>Trusted vibe source</Text>
              </View>
              <Pressable
                onPress={handleThemeBadgePress}
                style={({ pressed }) => [styles.themeBadge, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.1)' : 'rgba(26, 168, 163, 0.08)' }, pressed && styles.btnPressed]}
              >
                <ThemeIcon color={colors.aqua} size={13} />
                <Text style={[styles.themeBadgeText, { color: colors.aqua }]}>{mode === 'system' ? 'Auto' : isDark ? 'Dark' : 'Light'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <Pressable
            onPress={() => handleStatPress('vibes')}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-1"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{vibeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vibes</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatPress('spots')}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-2"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{spotCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spots</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatPress('friends')}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-3"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{mockFriends.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Local Storage', 'Your vibes and preferences are stored securely on this device using SQLite.');
            }}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-4"
          >
            <View style={[styles.storageIndicator, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Database color={colors.aqua} size={16} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Local</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleOpenFriends}
          style={({ pressed }) => [styles.friendsSection, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
          testID="friends-section"
        >
          <View style={styles.friendsSectionHeader}>
            <Users color={colors.aqua} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends & Privacy</Text>
            <View style={styles.friendsCountChip}>
              <Text style={[styles.friendsCountText, { color: colors.textMuted }]}>{mockFriends.length}</Text>
            </View>
            <ChevronRight color={colors.textSoft} size={18} />
          </View>
          {mockFriendRequests.length > 0 && (
            <View style={[styles.requestsBanner, { backgroundColor: isDark ? 'rgba(255, 109, 94, 0.1)' : 'rgba(224, 85, 69, 0.08)' }]}>
              <View style={[styles.requestsDot, { backgroundColor: colors.coral }]} />
              <Text style={[styles.requestsBannerText, { color: colors.coral }]}>{mockFriendRequests.length} pending request{mockFriendRequests.length > 1 ? 's' : ''}</Text>
            </View>
          )}
          <View style={styles.tierSummaryRow}>
            {tierDefinitions.map((td) => (
              <View key={td.id} style={[styles.tierSummaryChip, { backgroundColor: td.color + '1A' }]}>
                <View style={[styles.tierSummaryDot, { backgroundColor: td.color }]} />
                <Text style={[styles.tierSummaryLabel, { color: td.color }]}>{tierSummary[td.id] ?? 0}</Text>
              </View>
            ))}
          </View>
          <View style={styles.friendAvatarRow}>
            {mockFriends.slice(0, 5).map((f, i) => (
              <Image
                key={f.id}
                source={{ uri: f.avatar }}
                style={[styles.friendAvatarSmall, { marginLeft: i > 0 ? -10 : 0, zIndex: 5 - i, borderColor: colors.surface }]}
              />
            ))}
            {mockFriends.length > 5 && (
              <View style={[styles.friendAvatarMore, { backgroundColor: colors.card, borderColor: colors.surface }]}>
                <Text style={[styles.friendAvatarMoreText, { color: colors.textMuted }]}>+{mockFriends.length - 5}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={handleOpenWallet}
          style={({ pressed }) => [styles.walletSection, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
          testID="wallet-section"
        >
          <View style={[styles.walletIconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
            <Shield color={colors.aqua} size={22} />
          </View>
          <View style={styles.walletBody}>
            <Text style={[styles.walletTitle, { color: colors.text }]}>Secure Wallet</Text>
            <Text style={[styles.walletSubtitle, { color: colors.textMuted }]}>
              {documents.length > 0 ? `${documents.length} document${documents.length !== 1 ? 's' : ''} stored` : 'Add your ID or license'}
            </Text>
          </View>
          {documents.length > 0 && (
            <View style={[styles.walletBadge, { backgroundColor: colors.lime + '20' }]}>
              <CreditCard color={colors.lime} size={13} />
              <Text style={[styles.walletBadgeText, { color: colors.lime }]}>{documents.length}</Text>
            </View>
          )}
          <ChevronRight color={colors.textSoft} size={18} />
        </Pressable>

        <Pressable
          onPress={handleOpenQR}
          style={({ pressed }) => [styles.qrSection, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
          testID="qr-code-section"
        >
          <View style={[styles.qrIconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
            <QrCode color={colors.aqua} size={22} />
          </View>
          <View style={styles.qrBody}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>My QR Code</Text>
            <Text style={[styles.qrSubtitle, { color: colors.textMuted }]}>Share your Pulze profile instantly</Text>
          </View>
          <ChevronRight color={colors.textSoft} size={18} />
        </Pressable>

        <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuItem
            icon={Settings}
            label="Settings"
            sublabel="Theme, privacy, security"
            onPress={handleOpenSettings}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={Edit3}
            label="Edit Profile"
            sublabel="Name, bio, photo"
            onPress={handleEditProfile}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={LogOut}
            label="Log out"
            sublabel="Sign out of Pulze"
            onPress={handleLogout}
            isDestructive
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon: Icon,
  label,
  sublabel,
  onPress,
  isDestructive = false,
}: {
  icon: typeof Settings;
  label: string;
  sublabel: string;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  const { colors } = useTheme();
  const iconColor = isDestructive ? colors.coral : colors.aqua;
  const labelColor = isDestructive ? colors.coral : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.btnPressed]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: isDestructive ? colors.dangerBg : (colors.aqua + '18') }]}>
        <Icon color={iconColor} size={18} />
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.menuSublabel, { color: colors.textSoft }]}>{sublabel}</Text>
      </View>
      <ChevronRight color={colors.textSoft} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  hero: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroBody: {
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  handle: {
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  trustedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustedLabelText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  themeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  storageIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsSection: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    flex: 1,
  },
  friendsCountChip: {},
  friendsCountText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  requestsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  requestsBannerText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  tierSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tierSummaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierSummaryLabel: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  friendAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 13,
    borderWidth: 2,
  },
  friendAvatarMore: {
    width: 36,
    height: 36,
    borderRadius: 13,
    borderWidth: 2,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarMoreText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  menuSection: {
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  menuSublabel: {
    fontSize: 13,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  pulzeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pulzeIdText: {
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  walletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBody: {
    flex: 1,
    gap: 3,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  walletSubtitle: {
    fontSize: 13,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  walletBadgeText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  qrIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBody: {
    flex: 1,
    gap: 3,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  qrSubtitle: {
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
