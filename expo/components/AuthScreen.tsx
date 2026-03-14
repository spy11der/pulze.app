import React, { useState, useRef, useCallback } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, AtSign, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AuthMode = 'login' | 'signup';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
      setError('Please enter your username');
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
        await signup(name.trim(), username.trim(), email.trim(), phone.trim(), password);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('[Auth] Submit error:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, name, username, email, phone, password, login, signup, buttonScale]);

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
            <View style={[styles.logoMark, { backgroundColor: accentColor }]}>
              <Text style={[styles.logoLetter, { color: colors.background }]}>P</Text>
              <View style={[styles.logoPulse, { backgroundColor: colors.background }]} />
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>PULSE</Text>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              {mode === 'login' ? 'Welcome back. Your city awaits.' : 'Find your vibe. Join the pulse.'}
            </Text>
          </Animated.View>

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
                icon={<AtSign color={colors.textMuted} size={18} />}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                inputBg={inputBg}
                inputBorder={inputBorder}
                inputFocusBorder={inputFocusBorder}
                textColor={colors.text}
                placeholderColor={colors.textSoft}
                testID="username-input"
              />

              {mode === 'signup' && (
                <>
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
                  <InputField
                    icon={<Phone color={colors.textMuted} size={18} />}
                    placeholder="Phone number (optional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    inputBg={inputBg}
                    inputBorder={inputBorder}
                    inputFocusBorder={inputFocusBorder}
                    textColor={colors.text}
                    placeholderColor={colors.textSoft}
                    testID="phone-input"
                  />
                </>
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
                <Pressable style={styles.forgotRow}>
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

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSoft }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton
                label="Apple"
                icon="🍎"
                bg={isDark ? colors.surface : '#000'}
                textColor={isDark ? colors.text : '#fff'}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Coming Soon', 'Sign in with Apple will be available soon.');
                }}
              />
              <SocialButton
                label="Google"
                icon="G"
                bg={isDark ? colors.surface : '#fff'}
                textColor={isDark ? colors.text : '#333'}
                borderColor={isDark ? colors.border : '#ddd'}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Coming Soon', 'Sign in with Google will be available soon.');
                }}
              />
            </View>
          </Animated.View>

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

interface InputFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  textColor: string;
  placeholderColor: string;
  testID?: string;
  rightIcon?: React.ReactNode;
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  inputBg,
  inputBorder,
  inputFocusBorder,
  textColor,
  placeholderColor,
  testID,
  rightIcon,
}: InputFieldProps) {
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <View
      style={[
        styles.inputWrap,
        { backgroundColor: inputBg, borderColor: focused ? inputFocusBorder : inputBorder },
      ]}
    >
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
      />
      {rightIcon && <View style={styles.inputRight}>{rightIcon}</View>}
    </View>
  );
}

interface SocialButtonProps {
  label: string;
  icon: string;
  bg: string;
  textColor: string;
  borderColor?: string;
  onPress?: () => void;
}

function SocialButton({ label, icon, bg, textColor, borderColor, onPress }: SocialButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        { backgroundColor: bg, borderColor: borderColor ?? 'transparent' },
        borderColor ? { borderWidth: 1 } : undefined,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
      testID={`social-${label.toLowerCase()}`}
    >
      <Text style={styles.socialIcon}>{icon}</Text>
      <Text style={[styles.socialLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoLetter: {
    fontSize: 38,
    fontWeight: '900' as const,
    letterSpacing: -2,
  },
  logoPulse: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 5,
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    height: '100%' as unknown as number,
  },
  inputRight: {
    marginLeft: 8,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  socialIcon: {
    fontSize: 18,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
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
