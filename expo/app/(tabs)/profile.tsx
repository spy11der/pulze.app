import React, { useMemo, useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Copy, CreditCard, Edit3, LogOut, Moon, QrCode, Settings, Shield, ShieldCheck, Sun, Ticket, Users, Wallet, MapPin, Clock } from 'lucide-react-native';
import { mockFriends, mockFriendRequests, tierDefinitions } from '@/mocks/friends';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSecureWallet } from '@/providers/SecureWalletProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';
import { useWalletPass } from '@/providers/WalletPassProvider';
import { AgeVerificationSheet } from '@/components/AgeVerificationSheet';
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
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
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
          <Text style={[styles.menuSublabel, { color: colors.textMuted }]} numberOfLines={1}>
            {sublabel}
          </Text>
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
  const { user, logout } = useAuth();
  const { vibeCount, spotCount } = useData();
  const { documents } = useSecureWallet();
  const { isVerified, documentType } = useAgeVerification();
  const { passes } = useWalletPass();

  const [ageSheetVisible, setAgeSheetVisible] = useState<boolean>(false);

  const displayName = user?.displayName || currentUser.displayName;
  const username = user?.username || currentUser.username;
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }, [displayName]);

  const innerCircleCount = useMemo(
    () => mockFriends.filter((f) => f.tier === 'inner_circle').length,
    []
  );
  const friendsCount = mockFriends.length;
  const requestsCount = mockFriendRequests.length;
  const innerCircleTier = tierDefinitions.find((t) => t.id === 'inner_circle');

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        testID="profile-scroll"
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="open-settings"
          >
            <Settings color={colors.text} size={18} />
          </Pressable>
        </View>

        <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.identityTop}>
            <View style={[styles.avatar, { backgroundColor: colors.aqua + '18', borderColor: colors.aqua + '30' }]}>
              <Text style={[styles.avatarText, { color: colors.aqua }]}>{initials.toUpperCase()}</Text>
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.aqua + '18' }]} testID="verified-badge">
                    <ShieldCheck color={colors.aqua} size={12} />
                    <Text style={[styles.verifiedText, { color: colors.aqua }]}>21+</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>
                @{username}
              </Text>
              <View style={styles.metaRow}>
                <MapPin color={colors.textSoft} size={12} />
                <Text style={[styles.metaText, { color: colors.textSoft }]}>
                  {currentUser.location}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.bio, { color: colors.textMuted }]}>
            {currentUser.bio}
          </Text>

          <View style={styles.identityActions}>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.identityBtn,
                { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1 },
              ]}
              testID="edit-profile-btn"
            >
              <Edit3 color={isDark ? colors.background : colors.white} size={14} />
              <Text style={[styles.identityBtnText, { color: isDark ? colors.background : colors.white }]}>
                Edit Profile
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/qr-code')}
              style={({ pressed }) => [
                styles.identityBtnAlt,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              testID="open-qr-code"
            >
              <QrCode color={colors.text} size={14} />
              <Text style={[styles.identityBtnTextAlt, { color: colors.text }]}>Share</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleCopyId}
            style={({ pressed }) => [
              styles.idChip,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="copy-pulze-id"
          >
            <Text style={[styles.idChipLabel, { color: colors.textMuted }]}>PULZE ID</Text>
            <Text style={[styles.idChipValue, { color: colors.text }]}>{currentUser.pulzeId}</Text>
            <Copy color={colors.aqua} size={14} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{vibeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vibes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{spotCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Saved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{friendsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
          </View>
        </View>

        <View style={[styles.verifyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.verifyIconWrap, { backgroundColor: colors.aqua + '18' }]}>
            {isVerified ? (
              <ShieldCheck color={colors.aqua} size={22} />
            ) : (
              <Shield color={colors.aqua} size={22} />
            )}
          </View>
          <View style={styles.verifyTextWrap}>
            <Text style={[styles.verifyTitle, { color: colors.text }]}>
              {isVerified ? 'You are 21+ verified' : 'Verify your age'}
            </Text>
            <Text style={[styles.verifySub, { color: colors.textMuted }]} numberOfLines={2}>
              {isVerified
                ? `Verified using ${documentType ?? 'your ID'}`
                : 'Unlock 21+ events and venues with a one-time check.'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAgeSheetVisible(true);
            }}
            style={({ pressed }) => [
              styles.verifyBtn,
              {
                backgroundColor: isVerified ? colors.surfaceAlt : colors.aqua,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="open-age-sheet"
          >
            <Text
              style={[
                styles.verifyBtnText,
                { color: isVerified ? colors.text : (isDark ? colors.background : colors.white) },
              ]}
            >
              {isVerified ? 'View' : 'Verify'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Tickets & Wallet</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon={<Ticket />}
            label="My Tickets"
            sublabel={passes.length === 0 ? 'No passes yet' : `${passes.length} ticket pass${passes.length === 1 ? '' : 'es'}`}
            onPress={() => router.push('/my-tickets')}
            testID="row-my-tickets"
          />
          <MenuRow
            icon={<CreditCard />}
            label="Secure Wallet"
            sublabel={documents.length === 0 ? 'No documents stored' : `${documents.length} document${documents.length === 1 ? '' : 's'}`}
            onPress={() => router.push('/secure-wallet')}
            testID="row-secure-wallet"
          />
          <MenuRow
            icon={<Wallet />}
            label="Wallet Pass"
            sublabel="Add tickets to Apple or Google Wallet"
            onPress={() => router.push('/wallet-pass')}
            testID="row-wallet-pass"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Friends</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon={<Users />}
            label="Friends"
            sublabel={`${friendsCount} friends${requestsCount ? ` · ${requestsCount} request${requestsCount === 1 ? '' : 's'}` : ''}`}
            onPress={() => router.push('/friends')}
            testID="row-friends"
          />
          <Pressable
            onPress={() => router.push('/friends')}
            style={({ pressed }) => [
              styles.tierRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
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
            testID="row-theme"
          />
          <MenuRow
            icon={<Settings />}
            label="Settings"
            sublabel="Privacy, alerts, location"
            onPress={() => router.push('/settings')}
            testID="row-settings"
          />
          <MenuRow
            icon={<Clock />}
            label="Activity"
            sublabel="Recent vibes and check-ins"
            onPress={() => router.push('/(tabs)')}
            testID="row-activity"
          />
        </View>

        <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
          <MenuRow
            icon={<LogOut />}
            label="Sign out"
            onPress={handleLogout}
            isDestructive
            trailing={<ChevronRight color={colors.danger} size={18} />}
            testID="row-logout"
          />
        </View>

        <Text style={[styles.footer, { color: colors.textSoft }]}>
          Pulze · v1.0.0
        </Text>
      </ScrollView>

      <AgeVerificationSheet
        visible={ageSheetVisible}
        onClose={() => setAgeSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  identityCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  identityInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  username: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  identityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  identityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  identityBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  identityBtnAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  identityBtnTextAlt: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  idChipLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  idChipValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    flex: 1,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  verifyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTextWrap: {
    flex: 1,
    gap: 2,
  },
  verifyTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  verifySub: {
    fontSize: 12,
    lineHeight: 16,
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  menuGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  menuSublabel: {
    fontSize: 12,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 12,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  footer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
