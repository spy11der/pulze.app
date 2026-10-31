// The emailed-code steps of the auth screen: confirming a new account's
// email, and resetting a forgotten password. Every email carries an 8-digit
// code that is typed here; none carries a link.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { InputField } from '@/components/AuthInputField';
import {
  AUTH_FLOW_MESSAGES,
  CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  isCompleteCode,
  isValidEmail,
  normalizeCode,
  toAuthFlowError,
} from '@/services/authErrors';

// Supabase Auth refuses a second email to the same address within 60 seconds.
const RESEND_COOLDOWN_SECONDS = 60;

function useFieldColors() {
  const { colors, isDark } = useTheme();
  return {
    colors,
    accentColor: colors.aqua,
    field: {
      inputBg: isDark ? 'rgba(53, 212, 207, 0.06)' : 'rgba(26, 168, 163, 0.05)',
      inputBorder: isDark ? 'rgba(53, 212, 207, 0.15)' : 'rgba(26, 168, 163, 0.12)',
      inputFocusBorder: isDark ? 'rgba(53, 212, 207, 0.4)' : 'rgba(26, 168, 163, 0.35)',
      textColor: colors.text,
      placeholderColor: colors.textSoft,
    },
  };
}

function useCooldown(): [number, () => void] {
  const [left, setLeft] = useState<number>(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(RESEND_COOLDOWN_SECONDS)];
}

function StepHeader({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function Messages({ error, notice }: { error: string; notice: string }) {
  const { colors } = useTheme();
  return (
    <>
      {notice ? (
        <View style={[styles.messageBox, { backgroundColor: colors.surfaceAlt }]} testID="auth-step-notice">
          <Text style={[styles.messageText, { color: colors.text }]}>{notice}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.messageBox, { backgroundColor: colors.dangerBg }]} testID="auth-step-error">
          <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}
    </>
  );
}

function PrimaryButton({ label, onPress, busy, testID }: {
  label: string; onPress: () => void; busy: boolean; testID: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: colors.aqua },
        pressed && styles.pressed,
        busy && styles.disabled,
      ]}
      testID={testID}
    >
      {busy
        ? <ActivityIndicator color={colors.background} size="small" />
        : <Text style={[styles.primaryText, { color: colors.background }]}>{label}</Text>}
    </Pressable>
  );
}

function LinkButton({ label, onPress, disabled, testID }: {
  label: string; onPress: () => void; disabled?: boolean; testID: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.link} hitSlop={8} testID={testID}>
      <Text style={[styles.linkText, { color: disabled ? colors.textSoft : colors.aqua }]}>{label}</Text>
    </Pressable>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors, field } = useFieldColors();
  return (
    <InputField
      icon={<KeyRound color={colors.textMuted} size={18} />}
      placeholder={`${CODE_LENGTH}-digit code`}
      value={value}
      onChangeText={(t) => onChange(normalizeCode(t))}
      keyboardType="number-pad"
      autoCapitalize="none"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={CODE_LENGTH + 4}
      testID="code-input"
      {...field}
    />
  );
}

/* --------------------------- signup confirmation --------------------------- */

export function ConfirmEmailStep({ email, initialNotice, onBack }: {
  email: string;
  /** Shown when arriving from a login attempt on an unconfirmed account. */
  initialNotice?: string;
  onBack: () => void;
}) {
  const { verifySignupCode, resendSignupCode } = useAuth();
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>(initialNotice ?? '');
  const [busy, setBusy] = useState<boolean>(false);
  const [cooldown, startCooldown] = useCooldown();

  const submit = useCallback(async () => {
    setError('');
    if (!isCompleteCode(code)) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    try {
      await verifySignupCode(email, code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Signed in: the auth screen unmounts.
    } catch (e) {
      setError(toAuthFlowError(e).message);
      setBusy(false);
    }
  }, [code, email, verifySignupCode]);

  const resend = useCallback(async () => {
    setError('');
    setNotice('');
    startCooldown();
    try {
      await resendSignupCode(email);
      setNotice(`If ${email} still needs confirming, we've sent a new code. Already confirmed accounts don't get one; use Forgot password instead.`);
    } catch (e) {
      setError(toAuthFlowError(e).message);
    }
  }, [email, resendSignupCode, startCooldown]);

  return (
    <View testID="confirm-email-step">
      <StepHeader
        title="Confirm your email"
        body={`Enter the ${CODE_LENGTH}-digit code we sent to ${email}. It can take a minute to arrive. If this email already has a Pulze account, no code is sent: go back and log in, or use Forgot password.`}
      />
      <CodeField value={code} onChange={setCode} />
      <Messages error={error} notice={notice} />
      <PrimaryButton label="Confirm email" onPress={submit} busy={busy} testID="confirm-email-submit" />
      <LinkButton
        label={cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
        onPress={resend}
        disabled={cooldown > 0}
        testID="confirm-email-resend"
      />
      <LinkButton label="Back to log in" onPress={onBack} testID="confirm-email-back" />
    </View>
  );
}

/* ----------------------------- password recovery --------------------------- */

export function ForgotPasswordStep({ initialEmail, onCodeSent, onBack }: {
  initialEmail: string;
  onCodeSent: (email: string) => void;
  onBack: () => void;
}) {
  const { requestPasswordReset } = useAuth();
  const { colors, field } = useFieldColors();
  const [email, setEmail] = useState<string>(initialEmail);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const submit = useCallback(async () => {
    setError('');
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError('Enter the email address for your account.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(trimmed);
      onCodeSent(trimmed);
    } catch (e) {
      setError(toAuthFlowError(e).message);
    } finally {
      setBusy(false);
    }
  }, [email, onCodeSent, requestPasswordReset]);

  return (
    <View testID="forgot-password-step">
      <StepHeader
        title="Reset your password"
        body={`Enter your account's email address and we'll send you a ${CODE_LENGTH}-digit code.`}
      />
      <InputField
        icon={<Mail color={colors.textMuted} size={18} />}
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        testID="forgot-email-input"
        {...field}
      />
      <Messages error={error} notice="" />
      <PrimaryButton label="Send code" onPress={submit} busy={busy} testID="forgot-submit" />
      <LinkButton label="Back to log in" onPress={onBack} testID="forgot-back" />
    </View>
  );
}

export function ResetCodeStep({ email, onChangeEmail }: {
  email: string;
  onChangeEmail: () => void;
}) {
  const { verifyRecoveryCode, requestPasswordReset } = useAuth();
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [cooldown, startCooldown] = useCooldown();

  // The request that brought the user here started the server's cooldown.
  useEffect(() => { startCooldown(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async () => {
    setError('');
    if (!isCompleteCode(code)) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    try {
      await verifyRecoveryCode(email, code);
      // The provider now holds a recovery session and shows the new-password step.
    } catch (e) {
      setError(toAuthFlowError(e).message);
      setBusy(false);
    }
  }, [code, email, verifyRecoveryCode]);

  const resend = useCallback(async () => {
    setError('');
    setNotice('');
    startCooldown();
    try {
      await requestPasswordReset(email);
      setNotice(`If ${email} has a Pulze account, we've sent a new code.`);
    } catch (e) {
      setError(toAuthFlowError(e).message);
    }
  }, [email, requestPasswordReset, startCooldown]);

  return (
    <View testID="reset-code-step">
      <StepHeader
        title="Check your email"
        body={`If ${email} has a Pulze account, we've sent it a ${CODE_LENGTH}-digit code. Enter it to choose a new password.`}
      />
      <CodeField value={code} onChange={setCode} />
      <Messages error={error} notice={notice} />
      <PrimaryButton label="Continue" onPress={submit} busy={busy} testID="reset-code-submit" />
      <LinkButton
        label={cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
        onPress={resend}
        disabled={cooldown > 0}
        testID="reset-code-resend"
      />
      <LinkButton label="Use a different email" onPress={onChangeEmail} testID="reset-code-change-email" />
    </View>
  );
}

export function NewPasswordStep() {
  const { completePasswordReset, cancelPasswordReset } = useAuth();
  const { colors, field } = useFieldColors();
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [show, setShow] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const submit = useCallback(async () => {
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(AUTH_FLOW_MESSAGES.weak_password);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Signed in with the new password: the auth screen unmounts.
    } catch (e) {
      setError(toAuthFlowError(e).message);
      setBusy(false);
    }
  }, [password, confirm, completePasswordReset]);

  const cancel = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      await cancelPasswordReset();
      // Signed out: the login form returns.
    } catch (e) {
      setError(toAuthFlowError(e).message);
      setBusy(false);
    }
  }, [cancelPasswordReset]);

  const eye = (
    <Pressable onPress={() => setShow(!show)} hitSlop={12}>
      {show ? <EyeOff color={colors.textMuted} size={18} /> : <Eye color={colors.textMuted} size={18} />}
    </Pressable>
  );

  return (
    <View testID="new-password-step">
      <StepHeader title="Choose a new password" body={`Use at least ${MIN_PASSWORD_LENGTH} characters.`} />
      <InputField
        icon={<Lock color={colors.textMuted} size={18} />}
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        rightIcon={eye}
        testID="new-password-input"
        {...field}
      />
      <InputField
        icon={<Lock color={colors.textMuted} size={18} />}
        placeholder="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        testID="new-password-confirm"
        {...field}
      />
      <Messages error={error} notice="" />
      <PrimaryButton label="Save password" onPress={submit} busy={busy} testID="new-password-submit" />
      <LinkButton label="Cancel" onPress={cancel} disabled={busy} testID="new-password-cancel" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  messageBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    marginTop: 8,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.7,
  },
  link: {
    alignSelf: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
