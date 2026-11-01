import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { REPORT_DETAILS_MAX, REPORT_REASONS, reportContent, type ReportReason } from '@/services/safety';

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  kind: 'user' | 'check_in';
  targetId: string;
  /** e.g. "@sam" or "Sam's check-in at The Bar" */
  targetLabel: string;
}

type Phase = 'form' | 'sending' | 'sent';

export function ReportSheet({ visible, onClose, kind, targetId, targetLabel }: ReportSheetProps) {
  const { colors, isDark } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string>('');

  // Closing resets the form, so it opens fresh next time.
  const close = useCallback(() => {
    setReason(null);
    setDetails('');
    setPhase('form');
    setError('');
    onClose();
  }, [onClose]);

  const submit = useCallback(async () => {
    if (!reason || phase === 'sending') return;
    setPhase('sending');
    setError('');
    const result = await reportContent(kind, targetId, reason, details);
    if (result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('sent');
    } else {
      setError(result.error);
      setPhase('form');
    }
  }, [reason, phase, kind, targetId, details]);

  const sheetBg = isDark ? 'rgba(10, 22, 30, 0.98)' : 'rgba(255, 255, 255, 0.99)';
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close} testID="report-sheet">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <Pressable onPress={close} style={[styles.closeBtn, { backgroundColor: subtle }]} accessibilityLabel="Close">
            <X color={colors.textMuted} size={16} />
          </Pressable>

          {phase === 'sent' ? (
            <View style={styles.done}>
              <View style={[styles.doneIcon, { backgroundColor: colors.aqua + '1A' }]}>
                <Check color={colors.aqua} size={24} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Thanks for telling us</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                The Pulze team will review it. The person you reported isn&apos;t told who sent it.
              </Text>
              <Pressable onPress={close} style={[styles.submit, { backgroundColor: colors.aqua }]} testID="report-done">
                <Text style={styles.submitText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={[styles.title, { color: colors.text }]}>Report {kind === 'user' ? 'profile' : 'check-in'}</Text>
              <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={2}>{targetLabel}</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>WHAT&apos;S WRONG?</Text>
              {REPORT_REASONS.map((r) => {
                const selected = reason === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setReason(r.id)}
                    style={[styles.reason, { borderColor: selected ? colors.aqua : colors.border, backgroundColor: selected ? colors.aqua + '12' : 'transparent' }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    testID={`report-reason-${r.id}`}
                  >
                    <Text style={[styles.reasonText, { color: colors.text }]}>{r.label}</Text>
                    {selected ? <Check color={colors.aqua} size={16} /> : null}
                  </Pressable>
                );
              })}

              <Text style={[styles.label, { color: colors.textMuted }]}>DETAILS (OPTIONAL)</Text>
              <TextInput
                value={details}
                onChangeText={(t) => setDetails(t.slice(0, REPORT_DETAILS_MAX))}
                placeholder="Anything that helps us understand"
                placeholderTextColor={colors.textSoft}
                multiline
                style={[styles.details, { color: colors.text, borderColor: colors.border, backgroundColor: subtle }]}
                testID="report-details"
              />
              <Text style={[styles.counter, { color: colors.textSoft }]}>{details.length}/{REPORT_DETAILS_MAX}</Text>

              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

              <Pressable
                onPress={() => void submit()}
                disabled={!reason || phase === 'sending'}
                style={[styles.submit, { backgroundColor: colors.aqua, opacity: !reason || phase === 'sending' ? 0.5 : 1 }]}
                testID="report-submit"
              >
                {phase === 'sending' ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send report</Text>}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingBottom: 32 },
  closeBtn: { position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { padding: 20, paddingTop: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '800' as const, paddingRight: 40 },
  body: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1, marginTop: 12 },
  reason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  reasonText: { fontSize: 14, fontWeight: '600' as const },
  details: { minHeight: 80, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top' as const },
  counter: { fontSize: 11, alignSelf: 'flex-end' },
  error: { fontSize: 13, fontWeight: '600' as const },
  submit: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  done: { padding: 24, paddingTop: 32, alignItems: 'center', gap: 10 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
