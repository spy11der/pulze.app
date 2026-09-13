import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
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
  BarChart3,
  BellRing,
  Bug,
  Check,
  ChevronDown,
  FileText,
  Fingerprint,
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
  Sun,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { clearLocalCachesForUser, clearDeviceAccountBindings } from '@/services/localCleanup';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme, type ThemeMode } from '@/providers/ThemeProvider';
import { useBiometricAuth } from '@/providers/BiometricAuthProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getLocationConsent, setLocationConsent } from '@/services/consent';
import { supabase } from '@/services/supabase';
import {
  getNotificationPrefs,
  setNotificationPref,
  type NotificationPrefs,
} from '@/services/notificationPrefs';
import { startGeofenceMonitoring, stopGeofenceMonitoring } from '@/services/geofence';
import { ensureNotificationPermission } from '@/services/checkInNotifications';
import {
  GENDER_IDENTITY_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  getMyDemographics,
  setDemographicAnalyticsConsent,
  updateMyGenderIdentity,
  type GenderIdentity,
  type MyDemographics,
} from '@/services/demographics';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { biometricEnabled, biometricAvailable, biometricType, toggleBiometric } = useBiometricAuth();
  const { logout, user } = useAuth();
  const router = useRouter();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({ checkInPrompt: true });
  const [locationConsent, setLocationConsentState] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getLocationConsent(user.id).then((granted) => { if (!cancelled) setLocationConsentState(granted); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const [locationBusy, setLocationBusy] = useState<boolean>(false);

  const toggleLocationConsent = useCallback(async () => {
    if (!user?.id) return;
    if (locationBusy) return;
    void Haptics.selectionAsync();
    const next = !locationConsent;
    setLocationBusy(true);
    setLocationConsentState(next); // optimistic

    try {
      if (next) {
        // Turning ON: consent persist first so getLocationConsent()
        // (called inside startGeofenceMonitoring) reads the new value,
        // then request permissions and start the background task. If
        // any step below fails we roll consent back so the persisted
        // state never claims monitoring is active when it isn't.
        const persisted = await setLocationConsent(user.id, true);
        if (!persisted) {
          setLocationConsentState(false);
          Alert.alert('Could not update', 'Please try again.');
          return;
        }
        // Ask for notification permission at the same moment the user
        // opts in to arrival prompts — if they never grant it, the
        // location task still runs and visit_sessions still open, they
        // just won't see the OS ping.
        await ensureNotificationPermission();

        const result = await startGeofenceMonitoring(user.id);
        if (!result.started) {
          // Roll consent back so Settings never displays ON while
          // monitoring is actually off. Different reasons get
          // different copy so the user knows what to do.
          await setLocationConsent(user.id, false);
          setLocationConsentState(false);
          if (result.reason === 'foreground_denied' || result.reason === 'background_denied') {
            Alert.alert(
              'Location permission needed',
              result.reason === 'background_denied'
                ? 'Pulze needs "Always" location access to detect when you arrive at venues in the background. You can enable it in Settings.'
                : 'Pulze needs location access to detect when you arrive at venues. You can enable it in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
              ],
            );
          } else if (result.reason === 'unsupported') {
            Alert.alert('Not supported', 'Location-based check-ins aren’t available on this platform.');
          } else {
            Alert.alert('Could not enable', result.message ?? 'Please try again.');
          }
        }
      } else {
        // Turning OFF: stop the task first so background updates halt
        // immediately, then persist the flip. If the persist fails the
        // task stays stopped locally and the next app launch's
        // startup-reconcile will realign — either by re-stopping (if
        // the server still says ON due to the failure we couldn't
        // recover from) or by not starting (once the retry succeeds).
        await stopGeofenceMonitoring();
        const persisted = await setLocationConsent(user.id, false);
        if (!persisted) {
          Alert.alert('Could not save', 'Location monitoring was stopped but the preference didn’t save. Please try again.');
        }
      }
    } finally {
      setLocationBusy(false);
    }
  }, [user?.id, locationConsent, locationBusy]);

  useEffect(() => {
    let cancelled = false;
    void getNotificationPrefs().then((prefs) => {
      if (!cancelled) setNotifPrefs(prefs);
    });
    return () => { cancelled = true; };
  }, []);

  // Demographics state — loaded once per screen mount. Every write
  // path re-reads to keep the view in sync (race establishment
  // flips the "one-shot" note text, gender changes update the
  // displayed label, consent toggle updates the switch).
  const [demographics, setDemographics] = useState<MyDemographics | null>(null);
  const [demographicsBusy, setDemographicsBusy] = useState<boolean>(false);
  const [genderPickerVisible, setGenderPickerVisible] = useState<boolean>(false);

  const reloadDemographics = useCallback(async () => {
    const next = await getMyDemographics();
    setDemographics(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getMyDemographics().then((d) => {
      if (!cancelled) setDemographics(d);
    });
    return () => { cancelled = true; };
  }, []);

  const genderLabel = useMemo(() => {
    const v = demographics?.genderIdentity;
    if (!v) return 'Not set';
    return GENDER_IDENTITY_OPTIONS.find((o) => o.value === v)?.label ?? 'Not set';
  }, [demographics?.genderIdentity]);

  const raceLabel = useMemo(() => {
    const arr = demographics?.raceEthnicity;
    if (!arr || arr.length === 0) return 'Not set';
    return arr
      .map((v) => RACE_ETHNICITY_OPTIONS.find((o) => o.value === v)?.label ?? v)
      .join(', ');
  }, [demographics?.raceEthnicity]);

  const handleGenderPick = useCallback(async (next: GenderIdentity | null) => {
    if (demographicsBusy) return;
    setDemographicsBusy(true);
    void Haptics.selectionAsync();
    const ok = await updateMyGenderIdentity(next);
    if (ok) await reloadDemographics();
    else Alert.alert("Couldn't save", 'Please try again.');
    setDemographicsBusy(false);
    setGenderPickerVisible(false);
  }, [demographicsBusy, reloadDemographics]);

  const handleDemoConsentToggle = useCallback(async () => {
    if (!demographics || demographicsBusy) return;
    const next = !demographics.demographicAnalyticsConsent;
    setDemographicsBusy(true);
    void Haptics.selectionAsync();
    // Optimistic
    setDemographics((prev) => (prev ? { ...prev, demographicAnalyticsConsent: next } : prev));
    const ok = await setDemographicAnalyticsConsent(next);
    if (!ok) {
      setDemographics((prev) => (prev ? { ...prev, demographicAnalyticsConsent: !next } : prev));
      Alert.alert("Couldn't update", 'Please try again.');
    }
    setDemographicsBusy(false);
  }, [demographics, demographicsBusy]);

  const handleRaceCorrectionInfo = useCallback(() => {
    void Haptics.selectionAsync();
    Alert.alert(
      'Race / ethnicity',
      'To correct your race or ethnicity, contact Pulze support at contact@pulze.pro.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email support',
          onPress: () => {
            void Linking.openURL('mailto:contact@pulze.pro?subject=Race%2FEthnicity%20correction%20request');
          },
        },
      ],
    );
  }, []);

  const updateNotif = useCallback(async (key: keyof NotificationPrefs) => {
    void Haptics.selectionAsync();
    // Optimistic — the shared helper is the write-through source of truth.
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    try {
      const next = await setNotificationPref(key, !notifPrefs[key]);
      setNotifPrefs(next);
    } catch (e) {
      console.log('[Settings] notif save error', e);
    }
  }, [notifPrefs]);

  const handleToggleBiometric = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleBiometric();
  }, [toggleBiometric]);

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
                    // Capture the user id BEFORE the RPC so we can address
                    // per-user local keys after the auth row is gone.
                    const uid = user?.id ?? null;
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
                    // Per-user AsyncStorage (queued check-ins, dedup
                    // state, saves cache, legacy favorites) + device
                    // bindings (biometric, notif prefs, legacy SQLite).
                    // Wrapped so a partial local failure doesn't strand
                    // the user in a still-authenticated UI after the
                    // server account is gone.
                    try {
                      await clearLocalCachesForUser(uid);
                      await clearDeviceAccountBindings();
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
                      const uid = user?.id ?? null;
                      const { error } = await supabase.rpc('delete_my_account');
                      if (error) {
                        console.log('[Settings] delete_my_account failed:', error.message);
                        Alert.alert('Delete failed', error.message);
                        return;
                      }
                      try {
                        await clearLocalCachesForUser(uid);
                        await clearDeviceAccountBindings();
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
          <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>
            When you arrive at a venue, Pulze can ping you to snap a check-in photo.
          </Text>
          <View style={styles.preferenceList}>
            <NotifToggleRow
              icon={BellRing}
              label="Venue check-in prompts"
              value={notifPrefs.checkInPrompt}
              onToggle={() => updateNotif('checkInPrompt')}
              testID="notif-checkin-prompt"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
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
                disabled={locationBusy}
                trackColor={{ false: colors.border, true: colors.aqua }}
                testID="switch-location-consent"
              />
            </View>
          </View>
        </View>

        {demographics && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Demographics</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>
              Private. Never shown on your profile.
            </Text>
            <View style={styles.preferenceList}>
              <Pressable
                onPress={() => { void Haptics.selectionAsync(); setGenderPickerVisible(true); }}
                style={[styles.settingRow, { backgroundColor: colors.card }]}
                testID="settings-gender"
              >
                <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                  <UserIcon color={colors.aqua} size={18} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={[styles.settingValue, { color: colors.text }]}>Gender identity</Text>
                  <Text style={[styles.settingLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {genderLabel}
                  </Text>
                </View>
                <ChevronDown color={colors.textSoft} size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>

              <Pressable
                onPress={handleRaceCorrectionInfo}
                style={[styles.settingRow, { backgroundColor: colors.card }]}
                testID="settings-race"
              >
                <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                  <Users color={colors.aqua} size={18} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={[styles.settingValue, { color: colors.text }]}>Race / ethnicity</Text>
                  <Text style={[styles.settingLabel, { color: colors.textMuted }]} numberOfLines={2}>
                    {raceLabel}
                  </Text>
                  <Text style={[styles.settingLabel, { color: colors.textSoft, marginTop: 2, fontSize: 11 }]}>
                    Corrections via contact@pulze.pro
                  </Text>
                </View>
              </Pressable>

              <View style={[styles.radioRow, { backgroundColor: colors.card, borderColor: 'transparent' }]} testID="pref-demographic-consent">
                <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                  <BarChart3 color={colors.aqua} size={18} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={[styles.settingValue, { color: colors.text }]}>Use in nightlife trends</Text>
                  <Text style={[styles.settingLabel, { color: colors.textMuted }]}>
                    Allow Pulze to use your demographic info for aggregated neighborhood trends. Withdraw any time.
                  </Text>
                </View>
                <Switch
                  value={demographics.demographicAnalyticsConsent}
                  onValueChange={handleDemoConsentToggle}
                  disabled={demographicsBusy}
                  trackColor={{ false: colors.border, true: colors.aqua }}
                  testID="switch-demographic-consent"
                />
              </View>
            </View>
          </View>
        )}

        <Modal
          transparent
          animationType="fade"
          visible={genderPickerVisible}
          onRequestClose={() => setGenderPickerVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setGenderPickerVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Gender identity</Text>
              <Pressable
                onPress={() => setGenderPickerVisible(false)}
                style={styles.modalCloseBtn}
                testID="gender-picker-close"
              >
                <X color={colors.textMuted} size={18} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {GENDER_IDENTITY_OPTIONS.map((opt) => {
                const active = demographics?.genderIdentity === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleGenderPick(active ? null : opt.value)}
                    disabled={demographicsBusy}
                    style={({ pressed }) => [
                      styles.modalOptionRow,
                      {
                        backgroundColor: active ? colors.aqua + '18' : colors.card,
                        borderColor: active ? colors.aqua : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`gender-picker-${opt.value}`}
                  >
                    <Text
                      style={[
                        styles.modalOptionLabel,
                        { color: active ? colors.aqua : colors.text, fontWeight: active ? '700' : '600' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active ? <Check color={colors.aqua} size={16} /> : null}
                  </Pressable>
                );
              })}
              <Text style={[styles.modalFineprint, { color: colors.textSoft }]}>
                Not displayed on your profile. Tap again to clear.
              </Text>
            </ScrollView>
          </View>
        </Modal>

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
    left: 16,
    right: 16,
    top: '20%',
    bottom: '10%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalOptionLabel: {
    fontSize: 14,
  },
  modalFineprint: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
});
