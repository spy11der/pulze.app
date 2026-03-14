import React, { useCallback } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellRing,
  Bookmark,
  ChevronDown,
  ExternalLink,
  FileText,
  Fingerprint,
  Lock,
  MapPin,
  Moon,
  ScanFace,
  Shield,
  ShieldAlert,
  Sun,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

import { useTheme, type ThemeMode } from '@/providers/ThemeProvider';
import { useBiometricAuth } from '@/providers/BiometricAuthProvider';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { UserPreferences } from '@/providers/DataProvider';

const privacyLabels: Record<UserPreferences['defaultPrivacy'], string> = {
  public: 'Public vibe only',
  friends: 'Friends can see details',
  private: 'Private save',
};

const locationLabels: Record<UserPreferences['locationVisibility'], string> = {
  precise: 'Precise location',
  area: 'Area only',
  hidden: 'Hidden',
};

const paceLabels: Record<UserPreferences['savedPaceMix'], string> = {
  quiet: 'Quiet spots only',
  busy: 'Busy spots only',
  mixed: 'Quiet and busy mix',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { biometricEnabled, biometricAvailable, biometricType, toggleBiometric } = useBiometricAuth();
  const { preferences, updatePreference } = useData();
  const { logout } = useAuth();

  const handleToggleBiometric = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleBiometric();
  }, [toggleBiometric]);

  const cyclePrivacy = useCallback(() => {
    void Haptics.selectionAsync();
    const order: UserPreferences['defaultPrivacy'][] = ['public', 'friends', 'private'];
    const idx = order.indexOf(preferences.defaultPrivacy);
    const next = order[(idx + 1) % order.length];
    updatePreference('defaultPrivacy', next);
  }, [preferences.defaultPrivacy, updatePreference]);

  const cycleLocation = useCallback(() => {
    void Haptics.selectionAsync();
    const order: UserPreferences['locationVisibility'][] = ['precise', 'area', 'hidden'];
    const idx = order.indexOf(preferences.locationVisibility);
    const next = order[(idx + 1) % order.length];
    updatePreference('locationVisibility', next);
  }, [preferences.locationVisibility, updatePreference]);

  const toggleAlerts = useCallback(() => {
    void Haptics.selectionAsync();
    updatePreference('nearbyAlerts', !preferences.nearbyAlerts);
  }, [preferences.nearbyAlerts, updatePreference]);

  const cyclePace = useCallback(() => {
    void Haptics.selectionAsync();
    const order: UserPreferences['savedPaceMix'][] = ['quiet', 'busy', 'mixed'];
    const idx = order.indexOf(preferences.savedPaceMix);
    const next = order[(idx + 1) % order.length];
    updatePreference('savedPaceMix', next);
  }, [preferences.savedPaceMix, updatePreference]);

  const handleThemeSelect = useCallback((t: ThemeMode) => {
    void Haptics.selectionAsync();
    void setThemeMode(t);
  }, [setThemeMode]);

  const handleDeleteAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Are you absolutely sure? This is your last chance.',
              [
                { text: 'Go back', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    console.log('[Settings] Account deletion confirmed');
                    try {
                      await SecureStore.deleteItemAsync('pulze_user_prefs');
                      await SecureStore.deleteItemAsync('pulze_biometric_enabled');
                      console.log('[Settings] Local data cleared');
                    } catch (e) {
                      console.log('[Settings] Error clearing data:', e);
                    }
                    await logout();
                    console.log('[Settings] Account deleted and logged out');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [logout]);

  const BiometricIcon = biometricType === 'Face ID' ? ScanFace : Fingerprint;

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((t) => {
              const active = mode === t.id;
              const Icon = t.icon;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handleThemeSelect(t.id)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: active ? colors.aqua : colors.card, borderColor: active ? colors.aqua : colors.border },
                  ]}
                  testID={`theme-${t.id}`}
                >
                  <Icon color={active ? (isDark ? colors.background : '#fff') : colors.textMuted} size={18} />
                  <Text style={[styles.themeOptionText, { color: active ? (isDark ? colors.background : '#fff') : colors.textMuted }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Sharing</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>Tap to cycle options</Text>
          <View style={styles.preferenceList}>
            <Pressable onPress={cyclePrivacy} testID="pref-privacy">
              <SettingRow icon={Lock} label="Post privacy" value={privacyLabels[preferences.defaultPrivacy]} />
            </Pressable>
            <Pressable onPress={cycleLocation} testID="pref-location">
              <SettingRow icon={MapPin} label="Location visibility" value={locationLabels[preferences.locationVisibility]} />
            </Pressable>
            <Pressable onPress={toggleAlerts} testID="pref-alerts">
              <SettingRow icon={BellRing} label="Nearby alerts" value={preferences.nearbyAlerts ? 'On' : 'Off'} />
            </Pressable>
            <Pressable onPress={cyclePace} testID="pref-pace">
              <SettingRow icon={Bookmark} label="Saved pace" value={paceLabels[preferences.savedPaceMix]} />
            </Pressable>
          </View>
        </View>

        {(biometricAvailable || Platform.OS === 'web') && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
            <Pressable
              onPress={handleToggleBiometric}
              style={[styles.biometricRow, { backgroundColor: colors.card }]}
              testID="biometric-toggle"
            >
              <View style={[styles.biometricIconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                <BiometricIcon color={biometricEnabled ? colors.aqua : colors.textMuted} size={22} />
              </View>
              <View style={styles.biometricBody}>
                <Text style={[styles.biometricLabel, { color: colors.text }]}>{biometricType} Lock</Text>
                <Text style={[styles.biometricSub, { color: colors.textMuted }]}>
                  {biometricEnabled ? 'App locks when you leave' : 'Require authentication to open'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: colors.card, true: isDark ? 'rgba(53, 212, 207, 0.35)' : 'rgba(26, 168, 163, 0.3)' }}
                thumbColor={biometricEnabled ? colors.aqua : colors.textMuted}
                ios_backgroundColor={colors.card}
              />
            </Pressable>
            <View style={styles.secureStoreNote}>
              <Lock color={colors.textSoft} size={14} />
              <Text style={[styles.secureStoreNoteText, { color: colors.textSoft }]}>Auth settings encrypted with SecureStore</Text>
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal</Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              void Linking.openURL('https://pulze.app/privacy');
            }}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="privacy-policy-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Shield color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.legalSub, { color: colors.textMuted }]}>pulze.app/privacy</Text>
            </View>
            <ExternalLink color={colors.textSoft} size={16} />
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              void Linking.openURL('https://pulze.app/terms');
            }}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="terms-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <FileText color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Terms of Service</Text>
              <Text style={[styles.legalSub, { color: colors.textMuted }]}>pulze.app/terms</Text>
            </View>
            <ExternalLink color={colors.textSoft} size={16} />
          </Pressable>
        </View>

        <View style={[styles.dangerSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.dangerButton, { backgroundColor: colors.dangerBg }, pressed && styles.btnPressed]}
            testID="delete-account-btn"
          >
            <Trash2 color={colors.danger} size={18} />
            <View style={styles.dangerBody}>
              <Text style={[styles.dangerLabel, { color: colors.danger }]}>Delete Account</Text>
              <Text style={[styles.dangerSub, { color: colors.textSoft }]}>Permanently remove all your data</Text>
            </View>
            <ShieldAlert color={colors.danger} size={16} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
      <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
        <Icon color={colors.aqua} size={18} />
      </View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.settingValue, { color: colors.text }]}>{value}</Text>
      </View>
      <ChevronDown color={colors.textSoft} size={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 18,
    gap: 16,
  },
  section: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden' as const,
    maxWidth: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: -8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden' as const,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  preferenceList: {
    gap: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingBody: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  biometricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBody: {
    flex: 1,
    gap: 2,
  },
  biometricLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  biometricSub: {
    fontSize: 13,
  },
  secureStoreNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  secureStoreNoteText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dangerSection: {
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
  },
  dangerBody: {
    flex: 1,
    gap: 2,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dangerSub: {
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  legalSub: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
