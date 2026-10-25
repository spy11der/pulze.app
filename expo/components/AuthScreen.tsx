import React, { useState, useRef, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, AtSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { InputField } from '@/components/AuthInputField';
import {
  ConfirmEmailStep,
  ForgotPasswordStep,
  NewPasswordStep,
  ResetCodeStep,
} from '@/components/AuthCodeSteps';
import { AuthFlowError } from '@/services/authErrors';

type AuthMode = 'login' | 'signup';
// The emailed-code steps replace the form until they finish or the user backs out.
type AuthStep = 'form' | 'confirm-email' | 'forgot-password' | 'reset-code';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { login, signup, isRecoveringPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<AuthStep>('form');
  const [stepEmail, setStepEmail] = useState<string>('');
  const [stepNotice, setStepNotice] = useState<string>('');

  // When a recovery session ends without the user signing in (Cancel, or the
  // session expiring), go back to the login form, not the code step.
  const wasRecovering = useRef(isRecoveringPassword);
  React.useEffect(() => {
    if (wasRecovering.current && !isRecoveringPassword) {
      setStep('form');
      setMode('login');
      setPassword('');
    }
    wasRecovering.current = isRecoveringPassword;
  }, [isRecoveringPassword]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const hasAnimated = useRef(false);

  React.useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [logoScale, logoOpacity, formOpacity]);

  const switchMode = useCallback((newMode: AuthMode) => {
    if (newMode === mode) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: newMode === 'signup' ? -20 : 20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setMode(newMode);
      slideAnim.setValue(newMode === 'signup' ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  }, [mode, fadeAnim, slideAnim]);

  const handleSubmit = useCallback(async () => {
    setError('');

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (mode === 'signup' && !username.trim()) {
      setError('Please choose a username');
      return;
    }
    if (mode === 'login' && !username.trim()) {
      setError('Please enter your email or username');
      return;
    }
    if (mode === 'signup' && !email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        const result = await signup(name.trim(), username.trim(), email.trim(), password);
        if (result.status === 'confirmation_required') {
          setPassword('');
          setStepEmail(result.email);
          setStepNotice('');
          setStep('confirm-email');
          return;
        }
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e instanceof AuthFlowError && e.kind === 'email_not_confirmed' && e.email) {
        setPassword('');
        setStepEmail(e.email);
        setStepNotice(e.message);
        setStep('confirm-email');
        return;
      }
      console.log('[Auth] Submit error:', e);
      const msg = e?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, name, username, email, password, login, signup, buttonScale]);

  const accentColor = colors.aqua;
  const inputBg = isDark ? 'rgba(53, 212, 207, 0.06)' : 'rgba(26, 168, 163, 0.05)';
  const inputBorder = isDark ? 'rgba(53, 212, 207, 0.15)' : 'rgba(26, 168, 163, 0.12)';
  const inputFocusBorder = isDark ? 'rgba(53, 212, 207, 0.4)' : 'rgba(26, 168, 163, 0.35)';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="auth-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Image
              source={require('@/assets/images/pulze-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              {mode === 'login' ? 'Welcome back. Your city awaits.' : 'Find your vibe. Join the pulse.'}
            </Text>
          </Animated.View>

          {/* A verified recovery code holds a session that is not yet allowed
              into the app; until a new password is saved, this is the only step. */}
          {isRecoveringPassword ? (
            <NewPasswordStep />
          ) : step === 'confirm-email' ? (
            <ConfirmEmailStep
              email={stepEmail}
              initialNotice={stepNotice}
              onBack={() => { setMode('login'); setStep('form'); }}
            />
          ) : step === 'forgot-password' ? (
            <ForgotPasswordStep
              initialEmail={stepEmail}
              onCodeSent={(sentTo) => { setStepEmail(sentTo); setStep('reset-code'); }}
              onBack={() => setStep('form')}
            />
          ) : step === 'reset-code' ? (
            <ResetCodeStep email={stepEmail} onChangeEmail={() => setStep('forgot-password')} />
          ) : (
          <Animated.View style={[styles.formSection, { opacity: formOpacity }]}>
            <View style={[styles.modeToggle, { backgroundColor: isDark ? colors.surface : colors.surfaceAlt }]}>
              <Pressable
                onPress={() => switchMode('login')}
                style={[
                  styles.modeTab,
                  mode === 'login' && [styles.modeTabActive, { backgroundColor: accentColor }],
                ]}
                testID="login-tab"
              >
                <Text style={[
                  styles.modeTabText,
                  { color: mode === 'login' ? colors.background : colors.textMuted },
                  mode === 'login' && styles.modeTabTextActive,
                ]}>
                  Log In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('signup')}
                style={[
                  styles.modeTab,
                  mode === 'signup' && [styles.modeTabActive, { backgroundColor: accentColor }],
                ]}
                testID="signup-tab"
              >
                <Text style={[
                  styles.modeTabText,
                  { color: mode === 'signup' ? colors.background : colors.textMuted },
                  mode === 'signup' && styles.modeTabTextActive,
                ]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {mode === 'signup' && (
                <InputField
                  icon={<User color={colors.textMuted} size={18} />}
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  inputFocusBorder={inputFocusBorder}
                  textColor={colors.text}
                  placeholderColor={colors.textSoft}
                  testID="name-input"
                />
              )}

              <InputField
                icon={mode === 'login' ? <Mail color={colors.textMuted} size={18} /> : <AtSign color={colors.textMuted} size={18} />}
                placeholder={mode === 'login' ? 'Email or username' : 'Username'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType={mode === 'login' ? 'email-address' : 'default'}
                inputBg={inputBg}
                inputBorder={inputBorder}
                inputFocusBorder={inputFocusBorder}
                textColor={colors.text}
                placeholderColor={colors.textSoft}
                testID="username-input"
              />

              {mode === 'signup' && (
                <InputField
                  icon={<Mail color={colors.textMuted} size={18} />}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  inputFocusBorder={inputFocusBorder}
                  textColor={colors.text}
                  placeholderColor={colors.textSoft}
                  testID="email-input"
                />
              )}

              <InputField
                icon={<Lock color={colors.textMuted} size={18} />}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                inputBg={inputBg}
                inputBorder={inputBorder}
                inputFocusBorder={inputFocusBorder}
                textColor={colors.text}
                placeholderColor={colors.textSoft}
                testID="password-input"
                rightIcon={
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                    {showPassword
                      ? <EyeOff color={colors.textMuted} size={18} />
                      : <Eye color={colors.textMuted} size={18} />
                    }
                  </Pressable>
                }
              />

              {mode === 'login' && (
                <Pressable
                  style={styles.forgotRow}
                  onPress={() => {
                    setError('');
                    setStepEmail(username.includes('@') ? username.trim() : '');
                    setStep('forgot-password');
                  }}
                  hitSlop={8}
                  testID="forgot-password-link"
                >
                  <Text style={[styles.forgotText, { color: accentColor }]}>Forgot password?</Text>
                </Pressable>
              )}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerBg }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: accentColor },
                    pressed && styles.submitButtonPressed,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  testID="submit-button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.submitText, { color: colors.background }]}>
                        {mode === 'login' ? 'Log In' : 'Create Account'}
                      </Text>
                      <ArrowRight color={colors.background} size={18} strokeWidth={2.5} />
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>

          </Animated.View>
          )}

          <View style={styles.footer}>
            <Zap color={accentColor} size={12} />
            <Text style={[styles.footerText, { color: colors.textSoft }]}>
              By continuing, you agree to our{' '}
              <Text
                style={[styles.footerLink, { color: accentColor }]}
                onPress={() => void WebBrowser.openBrowserAsync('https://pulze.app/terms')}
              >
                Terms
              </Text>
              {' & '}
              <Text
                style={[styles.footerLink, { color: accentColor }]}
                onPress={() => void WebBrowser.openBrowserAsync('https://pulze.app/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  formSection: {
    gap: 0,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modeTabTextActive: {
    fontWeight: '700' as const,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  errorBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '700' as const,
    textDecorationLine: 'underline' as const,
  },
});
