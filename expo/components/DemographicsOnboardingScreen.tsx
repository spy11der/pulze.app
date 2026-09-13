// DemographicsOnboardingScreen — optional step shown after the 21+
// DOB gate clears and before the main app mounts.
//
// Everything on this screen is optional. Skip and Continue both
// route the user into the app; the only difference is whether the
// selected values (and demographic-analytics consent) are recorded.
// Skipping must not reduce functionality or block entry.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import {
  GENDER_IDENTITY_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  markOptionalDemographicsSkipped,
  setMyOptionalDemographics,
  type GenderIdentity,
  type RaceEthnicity,
} from '@/services/demographics';

interface DemographicsOnboardingScreenProps {
  onComplete: () => void;
}

export function DemographicsOnboardingScreen({ onComplete }: DemographicsOnboardingScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [gender, setGender] = useState<GenderIdentity | null>(null);
  const [race, setRace] = useState<Set<RaceEthnicity>>(new Set());
  const [consent, setConsent] = useState<boolean>(false); // default OFF per spec
  const [submitting, setSubmitting] = useState<boolean>(false);

  const toggleRace = useCallback((value: RaceEthnicity) => {
    void Haptics.selectionAsync();
    setRace((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await setMyOptionalDemographics({
      gender,
      race: race.size > 0 ? Array.from(race) : null,
      consent,
    });
    setSubmitting(false);
    if (!ok) {
      Alert.alert("Couldn't save", 'Please try again in a moment.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [submitting, gender, race, consent, onComplete]);

  const handleSkip = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    void Haptics.selectionAsync();
    const ok = await markOptionalDemographicsSkipped();
    setSubmitting(false);
    if (!ok) {
      Alert.alert("Couldn't continue", 'Please try again.');
      return;
    }
    onComplete();
  }, [submitting, onComplete]);

  const badgeBg = isDark ? 'rgba(53, 212, 207, 0.10)' : 'rgba(26, 168, 163, 0.08)';

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        },
      ]}
      testID="demographics-onboarding"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Sparkles color={colors.aqua} size={24} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Optional — helps Pulze understand nightlife and neighborhood trends. This information isn&apos;t displayed on your profile.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Gender identity</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Optional. You can change this later in Settings.
          </Text>
          <View style={styles.optionColumn}>
            {GENDER_IDENTITY_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setGender(active ? null : opt.value);
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: active ? colors.aqua + '18' : colors.card,
                      borderColor: active ? colors.aqua : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  testID={`gender-${opt.value}`}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: active ? colors.aqua : colors.text, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Check color={colors.aqua} size={16} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Race / ethnicity</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Optional and multi-select. You can only set this once — corrections go through contact@pulze.pro.
          </Text>
          <View style={styles.optionColumn}>
            {RACE_ETHNICITY_OPTIONS.map((opt) => {
              const active = race.has(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleRace(opt.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: active ? colors.aqua + '18' : colors.card,
                      borderColor: active ? colors.aqua : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  testID={`race-${opt.value}`}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: active ? colors.aqua : colors.text, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Check color={colors.aqua} size={16} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.consentRow}>
            <View style={styles.consentText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Use in nightlife trends</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                May Pulze use this to understand aggregated nightlife and neighborhood trends? You can change this any time in Settings.
              </Text>
            </View>
            <Switch
              value={consent}
              onValueChange={(next) => {
                void Haptics.selectionAsync();
                setConsent(next);
              }}
              trackColor={{ false: colors.border, true: colors.aqua }}
              testID="demographic-consent-switch"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.aqua, opacity: submitting ? 0.6 : pressed ? 0.9 : 1 },
          ]}
          testID="demographics-continue"
        >
          {submitting ? (
            <ActivityIndicator color={isDark ? colors.background : '#fff'} />
          ) : (
            <>
              <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
                Continue
              </Text>
              <ChevronRight color={isDark ? colors.background : '#fff'} size={18} />
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleSkip}
          disabled={submitting}
          style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID="demographics-skip"
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
    paddingBottom: 4,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  optionColumn: {
    gap: 8,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 14,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  consentText: {
    flex: 1,
    gap: 4,
  },
  footer: {
    gap: 10,
    paddingTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  skipBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
