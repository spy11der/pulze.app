import React, { useMemo, useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import {
  ChevronRight,
  Copy,
  CreditCard,
  Edit3,
  Flame,
  LogOut,
  Moon,
  QrCode,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Ticket,
  Users,
  Wallet,
  Zap,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react-native';

import { mockFriends, mockFriendRequests, tierDefinitions } from '@/mocks/friends';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSecureWallet } from '@/providers/SecureWalletProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';
import { useWalletPass } from '@/providers/WalletPassProvider';
import { AgeVerificationSheet } from '@/components/AgeVerificationSheet';
import { currentUser } from '@/constants/identity';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, mode } = useTheme();
  const { vibeCount, spotCount } = useData();
  const { logout, user: authUser } = useAuth();
  const { documents } = useSecureWallet();
  const { isVerified } = useAgeVerification();
  const { passes } = useWalletPass();
  const [showAgeSheet, setShowAgeSheet] = useState<boolean>(false);

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

  const handleOpenMyTickets = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/my-tickets');
  }, [router]);

  const handleOpenAgeVerification = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAgeSheet(true);
  }, []);

  const handleOpenWalletPasses = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/my-tickets');
  }, [router]);

  const displayName = authUser?.displayName || currentUser.displayName;
  const username = authUser?.username || currentUser.username;

  const handleCopyId = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(currentUser.pulzeId);
    console.log('[Profile] Copied Pulze ID:', currentUser.pulzeId);
  }, []);

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
      'Are you sure you want to log out of Pulze?',
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

  const recentActivity = useMemo(() => [
    { action: 'Got tickets', place: 'Nothing More · Fillmore', time: '2h ago', icon: Ticket },
    { action: 'Saved event', place: 'Meow Wolf Denver', time: '5h ago', icon: MapPin },
    { action: 'Checked in', place: 'Gothic Theatre', time: '1d ago', icon: Zap },
  ], []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="profile-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(43,191,186,0.14)' : 'rgba(26,158,153,0.10)' }]}>
              <Text style={[styles.avatarText, { color: colors.aqua }]}>{displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                onPress={handleEditProfile}
                style={({ pressed }) => [styles.heroBtn, { backgroundColor: colors.aqua }, pressed && styles.btnPressed]}
                testID="edit-profile-btn"
              >
                <Edit3 color={isDark ? '#060F13' : '#fff'} size={14} />
                <Text style={[styles.heroBtnText, { color: isDark ? '#060F13' : '#fff' }]}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={handleOpenSettings}
                style={({ pressed }) => [styles.heroIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }, pressed && styles.btnPressed]}
                testID="settings-btn"
              >
                <Settings color={colors.textMuted} size={16} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
              {isVerified && (
                <View style={[styles.verifiedInlineBadge, { backgroundColor: isDark ? 'rgba(43,191,186,0.12)' : 'rgba(26,158,153,0.08)' }]}>
                  <ShieldCheck color={colors.aqua} size={13} />
                  <Text style={[styles.verifiedInlineText, { color: colors.aqua }]}>21+</Text>
                </View>
              )}
            </View>
            <Text style={[styles.handle, { color: colors.textMuted }]}>@{username} · {currentUser.location}</Text>
            <Pressable
              onPress={handleCopyId}
              style={({ pressed }) => [styles.pulzeIdRow, { backgroundColor: colors.aqua + '10' }, pressed && styles.btnPressed]}
            >
              <QrCode color={colors.aqua} size={12} />
              <Text style={[styles.pulzeIdText, { color: colors.aqua }]}>{currentUser.pulzeId}</Text>
              <Copy color={colors.aqua} size={10} />
            </Pressable>
            <Text style={[styles.bio, { color: colors.textSoft }]}>{currentUser.bio}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.trustedLabel}>
                <ShieldCheck color={colors.aqua} size={12} />
                <Text style={[styles.trustedLabelText, { color: colors.textSoft }]}>Verified member</Text>
              </View>
              <Pressable
                onPress={() => { void Haptics.selectionAsync(); router.push('/settings'); }}
                style={({ pressed }) => [styles.themeBadge, { backgroundColor: isDark ? 'rgba(43,191,186,0.08)' : 'rgba(26,158,153,0.06)' }, pressed && styles.btnPressed]}
              >
                <ThemeIcon color={colors.aqua} size={12} />
                <Text style={[styles.themeBadgeText, { color: colors.aqua }]}>{mode === 'system' ? 'Auto' : isDark ? 'Dark' : 'Light'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <Pressable
            onPress={handleOpenMyTickets}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-1"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{passes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tickets</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatPress('spots')}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-2"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{spotCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Saved</Text>
          </Pressable>
          <Pressable
            onPress={() => handleStatPress('friends')}
            style={({ pressed }) => [styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="stat-card-3"
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{mockFriends.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
          </Pressable>
        </View>

        <View style={[styles.vibeIdentityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.vibeIdentityHeader}>
            <View style={[styles.vibeIdentityIcon, { backgroundColor: colors.aqua + '14' }]}>
              <Ticket color={colors.aqua} size={16} />
            </View>
            <View style={styles.vibeIdentityInfo}>
              <Text style={[styles.vibeIdentityLabel, { color: colors.textMuted }]}>TONIGHT</Text>
              <Text style={[styles.vibeIdentityValue, { color: colors.aqua }]}>
                {passes.length > 0 ? `${passes.length} event${passes.length !== 1 ? 's' : ''} coming up` : 'Nothing booked yet'}
              </Text>
            </View>
          </View>
          <Text style={[styles.vibeIdentityDesc, { color: colors.textSoft }]}>
            {passes.length > 0 ? 'Tap My Tickets to see your passes.' : 'Browse events and grab tickets for tonight.'}
          </Text>
          <Pressable
            onPress={handleOpenMyTickets}
            style={({ pressed }) => [
              styles.currentVibeStatus,
              { backgroundColor: isDark ? 'rgba(43,191,186,0.08)' : 'rgba(26,158,153,0.06)', opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Ticket color={colors.aqua} size={12} />
            <Text style={[styles.currentVibeText, { color: colors.aqua }]}>
              {passes.length > 0 ? 'View my tickets' : 'Find something tonight'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.activitySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.activityHeader}>
            <Clock color={colors.aqua} size={16} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          </View>
          {recentActivity.map((item, idx) => {
            const ActivityIcon = item.icon;
            return (
              <View key={idx} style={[styles.activityRow, idx < recentActivity.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={[styles.activityIconWrap, { backgroundColor: colors.aqua + '12' }]}>
                  <ActivityIcon color={colors.aqua} size={14} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityAction, { color: colors.text }]}>{item.action}</Text>
                  <Text style={[styles.activityPlace, { color: colors.textMuted }]}>{item.place}</Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textSoft }]}>{item.time}</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={handleOpenFriends}
          style={({ pressed }) => [styles.friendsSection, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
          testID="friends-section"
        >
          <View style={styles.friendsSectionHeader}>
            <Users color={colors.aqua} size={18} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends</Text>
            <View style={{ flex: 1 }} />
            {mockFriendRequests.length > 0 && (
              <View style={[styles.requestsBadge, { backgroundColor: colors.aqua + '14' }]}>
                <Text style={[styles.requestsBadgeText, { color: colors.aqua }]}>{mockFriendRequests.length} pending</Text>
              </View>
            )}
            <ChevronRight color={colors.textSoft} size={16} />
          </View>
          <View style={styles.tierSummaryRow}>
            {tierDefinitions.map((td) => (
              <View key={td.id} style={[styles.tierSummaryChip, { backgroundColor: td.color + '14' }]}>
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
                style={[styles.friendAvatarSmall, { marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i, borderColor: colors.surface }]}
              />
            ))}
            {mockFriends.length > 5 && (
              <View style={[styles.friendAvatarMore, { backgroundColor: colors.card, borderColor: colors.surface }]}>
                <Text style={[styles.friendAvatarMoreText, { color: colors.textMuted }]}>+{mockFriends.length - 5}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuItem
            icon={Ticket}
            label="My Tickets"
            sublabel="View your event passes"
            onPress={handleOpenMyTickets}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={Wallet}
            label="Wallet Passes"
            sublabel={passes.length > 0 ? `${passes.length} pass${passes.length !== 1 ? 'es' : ''} saved` : 'Add tickets to Apple or Google Wallet'}
            onPress={handleOpenWalletPasses}
            badge={passes.length > 0 ? (
              <View style={[styles.menuBadge, { backgroundColor: colors.aqua + '18' }]}>
                <Wallet color={colors.aqua} size={11} />
                <Text style={[styles.menuBadgeText, { color: colors.aqua }]}>{passes.length}</Text>
              </View>
            ) : undefined}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={ShieldCheck}
            label={isVerified ? '21+ Verified' : 'Verify Age'}
            sublabel={isVerified ? 'Your age has been confirmed' : 'Confirm you are 21+'}
            onPress={handleOpenAgeVerification}
            badge={isVerified ? (
              <View style={[styles.menuBadge, { backgroundColor: colors.aqua + '18' }]}>
                <ShieldCheck color={colors.aqua} size={11} />
              </View>
            ) : undefined}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={Shield}
            label="Secure Wallet"
            sublabel={documents.length > 0 ? `${documents.length} document${documents.length !== 1 ? 's' : ''} stored` : 'Add your ID or license'}
            onPress={handleOpenWallet}
            badge={documents.length > 0 ? (
              <View style={[styles.menuBadge, { backgroundColor: colors.aqua + '18' }]}>
                <CreditCard color={colors.aqua} size={11} />
                <Text style={[styles.menuBadgeText, { color: colors.aqua }]}>{documents.length}</Text>
              </View>
            ) : undefined}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={QrCode}
            label="My QR Code"
            sublabel="Share your profile"
            onPress={handleOpenQR}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={Settings}
            label="Settings"
            sublabel="Theme, privacy, security"
            onPress={handleOpenSettings}
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

      <AgeVerificationSheet
        visible={showAgeSheet}
        onClose={() => setShowAgeSheet(false)}
      />
    </View>
  );
}

function MenuItem({
  icon: Icon,
  label,
  sublabel,
  onPress,
  isDestructive = false,
  badge,
}: {
  icon: typeof Settings;
  label: string;
  sublabel: string;
  onPress: () => void;
  isDestructive?: boolean;
  badge?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const iconColor = isDestructive ? colors.danger : colors.aqua;
  const labelColor = isDestructive ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.btnPressed]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: isDestructive ? colors.dangerBg : (colors.aqua + '12') }]}>
        <Icon color={iconColor} size={16} />
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.menuSublabel, { color: colors.textSoft }]}>{sublabel}</Text>
      </View>
      {badge}
      <ChevronRight color={colors.textSoft} size={15} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  heroBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedInlineText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  handle: {
    fontSize: 13,
  },
  bio: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 8,
  },
  trustedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustedLabelText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  themeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  friendsSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  requestsBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requestsBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  tierSummaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tierSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tierSummaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierSummaryLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  friendAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 2,
  },
  friendAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 2,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarMoreText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  menuSection: {
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: {
    flex: 1,
    gap: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  menuSublabel: {
    fontSize: 12,
  },
  menuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 12,
  },
  pulzeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pulzeIdText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  vibeIdentityCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  vibeIdentityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vibeIdentityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeIdentityInfo: {
    flex: 1,
    gap: 2,
  },
  vibeIdentityLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  vibeIdentityValue: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  vibeIdentityDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  currentVibeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  currentVibeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  activitySection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  activityPlace: {
    fontSize: 12,
  },
  activityTime: {
    fontSize: 11,
  },
});
