import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { submitAppeal } from '@/services/notifications';

const MAX = 1000;
const MIN = 10;

/** Appeal one moderation decision (submit_appeal; once per decision, within 30 days). */
export function AppealSheet({ notificationId, summary, onClose }: { notificationId: string | null; summary: string; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState('');

  const close = useCallback(() => {
    setText(''); setPhase('form'); setError('');
    onClose();
  }, [onClose]);

  const send = useCallback(async () => {
    if (!notificationId || phase === 'sending' || text.trim().length < MIN) return;
    setPhase('sending');
    setError('');
    const r = await submitAppeal(notificationId, text);
    if (r.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('sent');
    } else {
      setError(r.error);
      setPhase('form');
    }
  }, [notificationId, phase, text]);

  const sheetBg = isDark ? 'rgba(10, 22, 30, 0.98)' : 'rgba(255, 255, 255, 0.99)';
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const tooShort = text.trim().length < MIN;

  return (
    <Modal visible={notificationId !== null} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <Pressable onPress={close} style={[styles.closeBtn, { backgroundColor: subtle }]} accessibilityLabel="Close"><X color={colors.textMuted} size={16} /></Pressable>
          {phase === 'sent' ? (
            <View style={styles.done}>
              <View style={[styles.doneIcon, { backgroundColor: colors.aqua + '1A' }]}><Check color={colors.aqua} size={24} /></View>
              <Text style={[styles.title, { color: colors.text }]}>Appeal sent</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>A Pulze moderator will review it. You&apos;ll get a notification with the outcome.</Text>
              <Pressable onPress={close} style={[styles.submit, { backgroundColor: colors.aqua }]}><Text style={styles.submitText}>Done</Text></Pressable>
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.text }]}>Appeal this decision</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>{summary}</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>Tell us why you think it was wrong. You can appeal each decision once, within 30 days.</Text>
              <TextInput
                value={text}
                onChangeText={(t) => setText(t.slice(0, MAX))}
                placeholder="What should the moderator know?"
                placeholderTextColor={colors.textSoft}
                multiline
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: subtle }]}
                accessibilityLabel="Your appeal"
                testID="appeal-text"
              />
              <Text style={[styles.counter, { color: colors.textSoft }]}>{text.length}/{MAX}</Text>
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <Pressable onPress={() => void send()} disabled={tooShort || phase === 'sending'}
                style={[styles.submit, { backgroundColor: colors.aqua, opacity: tooShort || phase === 'sending' ? 0.5 : 1 }]} testID="appeal-submit">
                {phase === 'sending' ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send appeal</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  closeBtn: { position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { padding: 20, paddingTop: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '800' as const, paddingRight: 40 },
  body: { fontSize: 13, lineHeight: 18 },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top' as const, marginTop: 6 },
  counter: { fontSize: 11, alignSelf: 'flex-end' },
  error: { fontSize: 13, fontWeight: '600' as const },
  submit: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  done: { padding: 24, paddingTop: 32, alignItems: 'center', gap: 10 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
