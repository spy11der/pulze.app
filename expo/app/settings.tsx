import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
  Bug,
  Calendar,
  ChevronDown,
  FileText,
  Fingerprint,
  Flame,
  Info,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  ScanFace,
  Share2,
  Shield,
  ShieldAlert,
  Star,
  Sun,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme, type ThemeMode } from '@/providers/ThemeProvider';
import { useBiometricAuth } from '@/providers/BiometricAuthProvider';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import type { UserPreferences } from '@/providers/DataProvider';
import { getLocationConsent, setLocationConsent } from '@/services/consent';
import { supabase } from '@/services/supabase';

const NOTIF_KEY = 'pulze_notification_prefs';

type NotificationPrefs = {
  friendsCheckIn: boolean;
  venuesBusy: boolean;
  eventReminders: boolean;
  friendRequests: boolean;
};

const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  friendsCheckIn: true,
  venuesBusy: true,
  eventReminders: true,
  friendRequests: true,
};

const privacyOptions: { id: UserPreferences['defaultPrivacy']; label: string; sub: string }[] = [
  { id: 'public', label: 'Public', sub: 'Anyone on Pulze can see your vibes' },
  { id: 'friends', label: 'Friends Only', sub: 'Only your friends see details' },
  { id: 'private', label: 'Private', sub: 'Saved for you only' },
];

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
  const { logout, user } = useAuth();
  const router = useRouter();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [locationConsent, setLocationConsentState] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getLocationConsent(user.id).then((granted) => { if (!cancelled) setLocationConsentState(granted); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleLocationConsent = useCallback(async () => {
    if (!user?.id) return;
    void Haptics.selectionAsync();
    const next = !locationConsent;
    setLocationConsentState(next); // optimistic
    const ok = await setLocationConsent(user.id, next);
    if (!ok) {
      setLocationConsentState(!next); // revert on failure
      Alert.alert('Could not update', 'Please try again.');
    }
  }, [user?.id, locationConsent]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIF_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...parsed });
        }
      } catch (e) {
        console.log('[Settings] notif prefs load error', e);
      }
    })();
  }, []);

  const updateNotif = useCallback(async (key: keyof NotificationPrefs) => {
    void Haptics.selectionAsync();
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next)).catch((e) => console.log('[Settings] notif save error', e));
      return next;
    });
  }, []);

  const handleToggleBiometric = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleBiometric();
  }, [toggleBiometric]);

  const selectPrivacy = useCallback((p: UserPreferences['defaultPrivacy']) => {
    void Haptics.selectionAsync();
    updatePreference('defaultPrivacy', p);
  }, [updatePreference]);

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

  const handleSharePulze = useCallback(async () => {
    void Haptics.selectionAsync();
    try {
      await Share.share({
        message: 'Check out Pulze — know before you go. https://pulze.pro',
      });
    } catch (e) {
      console.log('[Settings] share error', e);
    }
  }, []);

  const handleRate = useCallback(() => {
    void Haptics.selectionAsync();
    Alert.alert('Rate Pulze', 'Coming soon');
  }, []);

  const openMail = useCallback((subject: string) => {
    void Haptics.selectionAsync();
    const url = `mailto:hello@pulze.pro?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(url).catch((e) => {
      console.log('[Settings] mail error', e);
      Alert.alert('Email unavailable', 'Please email hello@pulze.pro');
    });
  }, []);

  const handleDeleteAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.prompt?.(
              'This cannot be undone',
              'Type DELETE to confirm permanent account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async (typed?: string) => {
                    if ((typed ?? '').trim() !== 'DELETE') {
                      Alert.alert('Not deleted', 'You must type DELETE exactly to confirm.');
                      return;
                    }
                    // Server delete first — the SECURITY DEFINER RPC removes
                    // the auth row (cascading every user-scoped table) and
                    // the user's Storage objects in one transaction. Only
                    // after confirmed success do we clear local state and
                    // sign the session out, so a failed delete leaves the
                    // account fully intact and the user still logged in.
                    const { error } = await supabase.rpc('delete_my_account');
                    if (error) {
                      console.log('[Settings] delete_my_account failed:', error.message);
                      Alert.alert('Delete failed', error.message);
                      return;
                    }
                    try {
                      await SecureStore.deleteItemAsync('pulze_user_prefs');
                      await SecureStore.deleteItemAsync('pulze_biometric_enabled');
                    } catch (e) {
                      console.log('[Settings] Local cleanup error (non-fatal):', e);
                    }
                    await logout();
                  },
                },
              ],
              'plain-text',
              ''
            );
            if (!Alert.prompt) {
              Alert.alert(
                'This cannot be undone',
                'Tap "Delete forever" to permanently delete your account.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete forever',
                    style: 'destructive',
                    onPress: async () => {
                      // Same order-of-ops as the iOS branch: server delete
                      // must succeed before we clear local state or log out.
                      const { error } = await supabase.rpc('delete_my_account');
                      if (error) {
                        console.log('[Settings] delete_my_account failed:', error.message);
                        Alert.alert('Delete failed', error.message);
                        return;
                      }
                      try {
                        await SecureStore.deleteItemAsync('pulze_user_prefs');
                        await SecureStore.deleteItemAsync('pulze_biometric_enabled');
                      } catch (e) {
                        console.log('[Settings] Local cleanup error (non-fatal):', e);
                      }
                      await logout();
                    },
                  },
                ]
              );
            }
          },
        },
      ]
    );
  }, [logout]);

  const BiometricIcon = biometricType === 'Face ID' ? ScanFace : Fingerprint;

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={styles.preferenceList}>
            <NotifToggleRow
              icon={MapPin}
              label="Friends check in nearby"
              value={notifPrefs.friendsCheckIn}
              onToggle={() => updateNotif('friendsCheckIn')}
              testID="notif-friends-checkin"
            />
            <NotifToggleRow
              icon={Flame}
              label="Venues getting busy"
              value={notifPrefs.venuesBusy}
              onToggle={() => updateNotif('venuesBusy')}
              testID="notif-venues-busy"
            />
            <NotifToggleRow
              icon={Calendar}
              label="Event reminders"
              value={notifPrefs.eventReminders}
              onToggle={() => updateNotif('eventReminders')}
              testID="notif-event-reminders"
            />
            <NotifToggleRow
              icon={UserPlus}
              label="Friend requests"
              value={notifPrefs.friendRequests}
              onToggle={() => updateNotif('friendRequests')}
              testID="notif-friend-requests"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Sharing</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>Default visibility for new vibes</Text>
          <View style={styles.preferenceList}>
            {privacyOptions.map((opt) => {
              const active = preferences.defaultPrivacy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => selectPrivacy(opt.id)}
                  style={[styles.radioRow, { backgroundColor: colors.card, borderColor: active ? colors.aqua : 'transparent' }]}
                  testID={`privacy-${opt.id}`}
                >
                  <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                    <Lock color={colors.aqua} size={18} />
                  </View>
                  <View style={styles.settingBody}>
                    <Text style={[styles.settingValue, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.settingLabel, { color: colors.textMuted }]}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: active ? colors.aqua : colors.border }]}>
                    {active ? <View style={[styles.radioDot, { backgroundColor: colors.aqua }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.preferenceList}>
            <View style={[styles.radioRow, { backgroundColor: colors.card, borderColor: 'transparent' }]} testID="pref-location-consent">
              <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                <MapPin color={colors.aqua} size={18} />
              </View>
              <View style={styles.settingBody}>
                <Text style={[styles.settingValue, { color: colors.text }]}>Location-based check-ins</Text>
                <Text style={[styles.settingLabel, { color: colors.textMuted }]}>
                  Lets Pulze detect when you're near a venue to suggest a check-in. Off by default.
                </Text>
              </View>
              <Switch
                value={locationConsent}
                onValueChange={toggleLocationConsent}
                trackColor={{ false: colors.border, true: colors.aqua }}
                testID="switch-location-consent"
              />
            </View>
          </View>
          <View style={styles.preferenceList}>
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
              router.push('/privacy-policy');
            }}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="privacy-policy-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Shield color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <ChevronDown color={colors.textSoft} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.push('/terms-of-service');
            }}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="terms-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <FileText color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Terms of Service</Text>
            </View>
            <ChevronDown color={colors.textSoft} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
          <Pressable
            onPress={() => openMail('Pulze Feedback')}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="send-feedback-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <MessageSquare color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Send Feedback</Text>
              <Text style={[styles.settingLabel, { color: colors.textMuted }]}>hello@pulze.pro</Text>
            </View>
            <Mail color={colors.textSoft} size={16} />
          </Pressable>
          <Pressable
            onPress={() => openMail('Bug Report')}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="report-bug-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Bug color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Report a Bug</Text>
              <Text style={[styles.settingLabel, { color: colors.textMuted }]}>Help us improve Pulze</Text>
            </View>
            <Mail color={colors.textSoft} size={16} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <View style={[styles.legalRow, { backgroundColor: colors.card }]}>
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Info color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Version</Text>
            </View>
            <Text style={[styles.settingLabel, { color: colors.textMuted }]}>1.0.0 (beta)</Text>
          </View>
          <Pressable
            onPress={handleRate}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="rate-pulze-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Star color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Rate Pulze</Text>
            </View>
            <ChevronDown color={colors.textSoft} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
          </Pressable>
          <Pressable
            onPress={handleSharePulze}
            style={({ pressed }) => [styles.legalRow, { backgroundColor: colors.card }, pressed && styles.btnPressed]}
            testID="share-pulze-btn"
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <Share2 color={colors.aqua} size={18} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingValue, { color: colors.text }]}>Share Pulze</Text>
              <Text style={[styles.settingLabel, { color: colors.textMuted }]}>Tell a friend</Text>
            </View>
            <ChevronDown color={colors.textSoft} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
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

function NotifToggleRow({
  icon: Icon,
  label,
  value,
  onToggle,
  testID,
}: {
  icon: typeof BellRing;
  label: string;
  value: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.settingRow, { backgroundColor: colors.card }]}
      testID={testID}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
        <Icon color={value ? colors.aqua : colors.textMuted} size={18} />
      </View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingValue, { color: colors.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.card, true: isDark ? 'rgba(53, 212, 207, 0.35)' : 'rgba(26, 168, 163, 0.3)' }}
        thumbColor={value ? colors.aqua : colors.textMuted}
        ios_backgroundColor={colors.card}
      />
    </Pressable>
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
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden' as const,
  },
  themeOptionText: {
    fontSize: 13,
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontWeight: '600' as const,
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
