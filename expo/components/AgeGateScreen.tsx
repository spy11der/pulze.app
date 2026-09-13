// AgeGateScreen — post-signup 21+ enforcement UI.
//
// Renders full-screen when the router (in app/_layout.tsx) detects
// that an authenticated user does not yet have a demographic row.
// The picker is a native platform DateTimePicker; its maxDate is
// clamped to (today - 21y) as a UX affordance, and the RPC
// re-validates 21+ server-side regardless.
//
// On rejection (under 21, future date, already set, etc.) we do NOT
// sign the user out and do NOT delete the account — Batch 2's spec
// says to leave the account intact and show a clear message.

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cake, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  maxSelectableDobForAge21,
  setMyDateOfBirth,
} from '@/services/demographics';

interface AgeGateScreenProps {
  onComplete: () => void;
}

export function AgeGateScreen({ onComplete }: AgeGateScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  // Anchor the picker at the 21-year cutoff so the wheel opens on a
  // date the user could actually be 21+ from. Same clamp is used
  // as `maximumDate` so the picker refuses to scroll into the
  // under-21 range on iOS spinner mode.
  const maxDate = useMemo(() => maxSelectableDobForAge21(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(maxDate);
  const [pickerVisible, setPickerVisible] = useState<boolean>(Platform.OS === 'ios');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const onPickerChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    // On Android the picker is a one-shot dialog; hide after any
    // event. On iOS it's an inline wheel and stays visible.
    if (Platform.OS === 'android') setPickerVisible(false);
    if (event.type === 'dismissed' || !date) return;
    setSelectedDate(date);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await setMyDateOfBirth(selectedDate);
    setSubmitting(false);

    if (result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    switch (result.reason) {
      case 'under_21':
        Alert.alert(
          "Sorry, you can't use Pulze",
          'Pulze is available only to users 21 or older.',
          [{ text: 'OK' }],
        );
        return;
      case 'future_date':
        Alert.alert('Invalid date', 'Please select a valid date of birth.');
        return;
      case 'already_set':
        // Belt-and-suspenders — the router should not send someone
        // here if their row already exists. If it happens, treat as
        // "done" so they aren't stuck.
        onComplete();
        return;
      case 'not_authenticated':
        Alert.alert('Session expired', 'Please sign in again.');
        void logout();
        return;
      default:
        Alert.alert('Something went wrong', result.message ?? 'Please try again.');
    }
  }, [submitting, selectedDate, onComplete, logout]);

  const iconTint = colors.aqua;
  const wrapBg = isDark ? 'rgba(53, 212, 207, 0.10)' : 'rgba(26, 168, 163, 0.08)';

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      testID="age-gate-screen"
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: wrapBg }]}>
          <ShieldCheck color={iconTint} size={26} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Pulze is 21+</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your date of birth to continue. We use this only to confirm you meet the age requirement — it&apos;s not shown on your profile.
        </Text>
      </View>

      <View
        style={[
          styles.pickerCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.rowHeader}>
          <View style={[styles.smallBadge, { backgroundColor: wrapBg }]}>
            <Cake color={iconTint} size={16} />
          </View>
          <Text style={[styles.rowHeaderText, { color: colors.text }]}>Date of birth</Text>
        </View>

        {Platform.OS === 'ios' ? (
          <DateTimePicker
            testID="dob-picker"
            value={selectedDate}
            mode="date"
            display="spinner"
            maximumDate={maxDate}
            minimumDate={new Date(1900, 0, 1)}
            onChange={onPickerChange}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={colors.text}
            style={styles.iosPicker}
          />
        ) : (
          <>
            <Pressable
              onPress={() => setPickerVisible(true)}
              style={[styles.androidTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
              testID="dob-picker-open"
            >
              <Text style={[styles.androidTriggerText, { color: colors.text }]}>
                {selectedDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[styles.androidTriggerHint, { color: colors.textMuted }]}>Tap to change</Text>
            </Pressable>
            {pickerVisible && (
              <DateTimePicker
                testID="dob-picker"
                value={selectedDate}
                mode="date"
                display="calendar"
                maximumDate={maxDate}
                minimumDate={new Date(1900, 0, 1)}
                onChange={onPickerChange}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.aqua, opacity: submitting ? 0.6 : pressed ? 0.9 : 1 },
          ]}
          testID="age-gate-submit"
        >
          {submitting ? (
            <ActivityIndicator color={isDark ? colors.background : '#fff'} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Continue
            </Text>
          )}
        </Pressable>
        <Text style={[styles.finePrint, { color: colors.textSoft }]}>
          If you&apos;re under 21, Pulze isn&apos;t available to you yet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 32,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  pickerCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHeaderText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
  androidTrigger: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  androidTriggerText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  androidTriggerHint: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  footer: {
    marginTop: 'auto',
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  finePrint: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
