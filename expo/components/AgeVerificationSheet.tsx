import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';

interface AgeVerificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AgeVerificationSheet({ visible, onClose }: AgeVerificationSheetProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isVerified,
    verifiedAt,
    documentType,
    canVerify,
    verifiableDocument,
    verify,
    isVerifying,
  } = useAgeVerification();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleDismiss = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, fadeAnim, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleVerify = useCallback(async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await verify();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(successScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
      console.log('[AgeVerification] Verification successful');
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log('[AgeVerification] Verification failed:', e);
    }
  }, [verify, successScale]);

  const handleGoToWallet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleDismiss();
    setTimeout(() => router.push('/secure-wallet'), 300);
  }, [router, handleDismiss]);

  const formatDate = useCallback((iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 90,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />
        </View>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleRow}>
            <Shield color={colors.aqua} size={20} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Age Verification</Text>
          </View>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }, pressed && styles.pressed]}
          >
            <X color={colors.textMuted} size={18} />
          </Pressable>
        </View>

        {isVerified ? (
          <View style={styles.sheetBody}>
            <View style={[styles.successCard, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.08)' : 'rgba(26, 158, 153, 0.05)' }]}>
              <Animated.View style={[styles.successIconWrap, { backgroundColor: colors.aqua + '20', transform: [{ scale: isVerified ? 1 : successScale }] }]}>
                <ShieldCheck color={colors.aqua} size={32} />
              </Animated.View>
              <Text style={[styles.successTitle, { color: colors.aqua }]}>Verified 21+</Text>
              <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
                Based on your {documentType ?? 'ID document'}
              </Text>
              {verifiedAt && (
                <Text style={[styles.successDate, { color: colors.textSoft }]}>
                  Verified {formatDate(verifiedAt)}
                </Text>
              )}
            </View>
            <View style={[styles.infoRow, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.06)' : 'rgba(26, 158, 153, 0.04)' }]}>
              <CheckCircle2 color={colors.aqua} size={14} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Your 21+ status is shown on your profile and ticket passes.
              </Text>
            </View>
          </View>
        ) : canVerify && verifiableDocument ? (
          <View style={styles.sheetBody}>
            <View style={[styles.docPreviewCard, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.06)' : 'rgba(26, 158, 153, 0.04)', borderColor: colors.border }]}>
              <View style={[styles.docPreviewIcon, { backgroundColor: colors.aqua + '18' }]}>
                <CreditCard color={colors.aqua} size={22} />
              </View>
              <View style={styles.docPreviewInfo}>
                <Text style={[styles.docPreviewLabel, { color: colors.text }]}>
                  {verifiableDocument.label}
                </Text>
                <Text style={[styles.docPreviewName, { color: colors.textMuted }]}>
                  {verifiableDocument.firstName} {verifiableDocument.lastName}
                </Text>
                <Text style={[styles.docPreviewSub, { color: colors.textSoft }]}>
                  ••••{verifiableDocument.documentNumber.slice(-4)}
                </Text>
              </View>
            </View>

            <Text style={[styles.verifyDescription, { color: colors.textMuted }]}>
              We'll use the date of birth from your stored document to verify you're 21 or older. This only needs to be done once.
            </Text>

            <Pressable
              onPress={() => void handleVerify()}
              disabled={isVerifying}
              style={({ pressed }) => [
                styles.verifyBtn,
                { backgroundColor: colors.aqua, opacity: isVerifying ? 0.6 : (pressed ? 0.9 : 1), transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              testID="verify-age-btn"
            >
              <ShieldCheck color={isDark ? '#060F13' : '#fff'} size={18} />
              <Text style={[styles.verifyBtnText, { color: isDark ? '#060F13' : '#fff' }]}>
                {isVerifying ? 'Verifying...' : 'Verify My Age'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sheetBody}>
            <View style={[styles.noDocCard, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.08)' : 'rgba(26, 158, 153, 0.05)' }]}>
              <AlertTriangle color={colors.aqua} size={28} />
              <Text style={[styles.noDocTitle, { color: colors.text }]}>No ID document found</Text>
              <Text style={[styles.noDocSubtitle, { color: colors.textMuted }]}>
                Add a driver's license, state ID, or passport to your Secure Wallet to verify your age.
              </Text>
            </View>

            <Pressable
              onPress={handleGoToWallet}
              style={({ pressed }) => [
                styles.walletBtn,
                { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              testID="go-to-wallet-btn"
            >
              <CreditCard color={isDark ? colors.background : '#fff'} size={18} />
              <Text style={[styles.walletBtnText, { color: isDark ? colors.background : '#fff' }]}>
                Open Secure Wallet
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    gap: 16,
  },
  successCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  successDate: {
    fontSize: 12,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  docPreviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  docPreviewLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  docPreviewName: {
    fontSize: 13,
  },
  docPreviewSub: {
    fontSize: 12,
    letterSpacing: 1,
  },
  verifyDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  noDocCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  noDocTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  noDocSubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  walletBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
