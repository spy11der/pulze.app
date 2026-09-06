import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanFace, Fingerprint } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useBiometricAuth } from '@/providers/BiometricAuthProvider';

export function LockScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isLocked, authenticate, biometricType } = useBiometricAuth();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isLocked) {
      fadeAnim.setValue(1);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      );
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      ring.start();
      return () => { pulse.stop(); ring.stop(); };
    }
  }, [isLocked, fadeAnim, pulseAnim, ringAnim]);

  useEffect(() => {
    if (isLocked && Platform.OS !== 'web') {
      const timer = setTimeout(() => { void authenticate(); }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLocked, authenticate]);

  const handleUnlock = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await authenticate();
  }, [authenticate]);

  if (!isLocked) return null;

  const BiometricIcon = biometricType === 'Face ID' ? ScanFace : Fingerprint;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background },
      ]}
      testID="lock-screen"
    >
      <View style={styles.topSection}>
        <Image source={require('@/assets/images/pulze-logo.png')} style={styles.logoImg} resizeMode="contain" />
        <Text style={[styles.lockLabel, { color: colors.textMuted }]}>App Locked</Text>
      </View>

      <View style={styles.centerSection}>
        <Animated.View style={[styles.ringOuter, { opacity: ringAnim, borderColor: colors.aqua }]}>
          <Animated.View style={[styles.ringInner, { transform: [{ scale: pulseAnim }], borderColor: isDark ? 'rgba(53, 212, 207, 0.3)' : 'rgba(26, 168, 163, 0.2)' }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.08)' : 'rgba(26, 168, 163, 0.06)' }]}>
              <BiometricIcon color={colors.aqua} size={48} strokeWidth={1.5} />
            </View>
          </Animated.View>
        </Animated.View>
        <Text style={[styles.biometricLabel, { color: colors.text }]}>
          {biometricType === 'Face ID' ? 'Face ID Required' : 'Touch to Unlock'}
        </Text>
        <Text style={[styles.biometricSub, { color: colors.textMuted }]}>
          Authenticate to access your vibes
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          onPress={handleUnlock}
          style={({ pressed }) => [
            styles.unlockButton,
            { backgroundColor: colors.aqua },
            pressed && styles.unlockButtonPressed,
          ]}
          testID="unlock-button"
        >
          <BiometricIcon color={isDark ? colors.background : '#fff'} size={20} />
          <Text style={[styles.unlockButtonText, { color: isDark ? colors.background : '#fff' }]}>Unlock with {biometricType}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  logoImg: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },
  lockLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  centerSection: {
    alignItems: 'center',
    gap: 20,
  },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLabel: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  biometricSub: {
    fontSize: 15,
  },
  bottomSection: {
    paddingBottom: 40,
    width: '100%',
    paddingHorizontal: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
  },
  unlockButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
});
