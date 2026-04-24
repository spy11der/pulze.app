import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  Camera as CameraIcon,
  ChevronLeft,
  CreditCard,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  User,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useSecureWallet } from '@/providers/SecureWalletProvider';
import { runIdVerification, type VerificationResult } from '@/services/idVerification';

type Step = 'intro' | 'scanId' | 'idPhoto' | 'selfie' | 'processing' | 'success' | 'failed';

export default function VerifyIdentityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { addDocument } = useSecureWallet();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('intro');
  const [barcodeData, setBarcodeData] = useState<string>('');
  const [idPhotoUri, setIdPhotoUri] = useState<string>('');
  const [selfieUri, setSelfieUri] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string>('');

  const successScale = useRef(new Animated.Value(0)).current;

  const scanningLineAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (step === 'scanId') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanningLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(scanningLineAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [step, scanningLineAnim]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleStart = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      Alert.alert(
        'Camera not available on web',
        'Identity verification requires a camera. Please continue on your phone.'
      );
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera access required', 'Please enable camera access in your device settings to verify your identity.');
        return;
      }
    }
    setStep('scanId');
  }, [permission, requestPermission]);

  const handleBarcodeScanned = useCallback(
    (scan: { type: string; data: string }) => {
      if (barcodeData || step !== 'scanId') return;
      console.log('[VerifyIdentity] Barcode scanned, type:', scan.type);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBarcodeData(scan.data);
      setStep('idPhoto');
    },
    [barcodeData, step]
  );

  const handleCaptureIdPhoto = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
      });
      if (!res.canceled && res.assets[0]) {
        console.log('[VerifyIdentity] ID photo captured');
        setIdPhotoUri(res.assets[0].uri);
        setStep('selfie');
      }
    } catch (e) {
      console.log('[VerifyIdentity] ID photo error:', e);
      Alert.alert('Camera error', 'Could not capture photo. Please try again.');
    }
  }, []);

  const processVerification = useCallback(
    async (idUri: string, selfieUriParam: string) => {
      setStep('processing');
      try {
        const verification = await runIdVerification(barcodeData, idUri, selfieUriParam);
        console.log('[VerifyIdentity] Verification complete:', verification.success);
        setResult(verification);

        if (!verification.success) {
          setError(verification.error ?? 'Verification failed. Please try again.');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setStep('failed');
          return;
        }

        if (verification.documentDraft) {
          try {
            await addDocument(verification.documentDraft);
            console.log('[VerifyIdentity] Document saved to Secure Wallet');
          } catch (e) {
            console.log('[VerifyIdentity] Failed to save document:', e);
          }
        }

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('success');
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }).start();
      } catch (e) {
        console.log('[VerifyIdentity] Unexpected error:', e);
        setError('Something went wrong. Please try again.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setStep('failed');
      }
    },
    [barcodeData, addDocument, successScale]
  );

  const handleCaptureSelfie = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!res.canceled && res.assets[0]) {
        console.log('[VerifyIdentity] Selfie captured');
        setSelfieUri(res.assets[0].uri);
        await processVerification(idPhotoUri, res.assets[0].uri);
      }
    } catch (e) {
      console.log('[VerifyIdentity] Selfie error:', e);
      Alert.alert('Camera error', 'Could not capture selfie. Please try again.');
    }
  }, [idPhotoUri, processVerification]);

  const handleRetry = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBarcodeData('');
    setIdPhotoUri('');
    setSelfieUri('');
    setResult(null);
    setError('');
    successScale.setValue(0);
    setStep('scanId');
  }, [successScale]);

  const handleDone = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, [router]);

  const scanningLineTranslate = scanningLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const headerTitle = useMemo(() => {
    switch (step) {
      case 'intro': return 'Verify your identity';
      case 'scanId': return 'Scan ID barcode';
      case 'idPhoto': return 'Photograph your ID';
      case 'selfie': return 'Take a selfie';
      case 'processing': return 'Verifying...';
      case 'success': return 'Verified';
      case 'failed': return 'Verification failed';
    }
  }, [step]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="verify-identity-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
          testID="verify-back-btn"
        >
          <ChevronLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <ShieldCheck color={colors.aqua} size={18} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
          </View>
        </View>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      {step === 'intro' && (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.aqua + '18' }]}>
              <ShieldCheck color={colors.aqua} size={40} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Prove you're 21+</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              We'll scan your ID, match your face to the photo, and confirm your age. This takes about 30 seconds.
            </Text>
          </View>

          <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StepRow num={1} icon={<ScanLine color={colors.aqua} size={18} />} title="Scan the barcode on the back of your ID" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StepRow num={2} icon={<CreditCard color={colors.aqua} size={18} />} title="Take a photo of the front of your ID" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StepRow num={3} icon={<User color={colors.aqua} size={18} />} title="Take a quick selfie" colors={colors} />
          </View>

          <View style={[styles.privacyCard, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.06)' : 'rgba(26, 158, 153, 0.04)', borderColor: colors.border }]}>
            <ShieldCheck color={colors.aqua} size={16} />
            <Text style={[styles.privacyText, { color: colors.textMuted }]}>
              Your ID data is encrypted on-device using Secure Enclave. Photos never leave your phone.
            </Text>
          </View>

          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.aqua },
              pressed && styles.pressed,
            ]}
            testID="start-verification-btn"
          >
            <CameraIcon color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Start verification
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'scanId' && Platform.OS !== 'web' && (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['pdf417'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: colors.aquaBright }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: colors.aquaBright }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: colors.aquaBright }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: colors.aquaBright }]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  { backgroundColor: colors.aquaBright, transform: [{ translateY: scanningLineTranslate }] },
                ]}
              />
            </View>
            <View style={[styles.cameraHint, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <ScanLine color={colors.aquaBright} size={16} />
              <Text style={styles.cameraHintText}>
                Align the PDF417 barcode on the back of your ID
              </Text>
            </View>
          </View>
        </View>
      )}

      {step === 'idPhoto' && (
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.aqua + '18' }]}>
              <CreditCard color={colors.aqua} size={40} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Barcode scanned</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Now take a clear photo of the front of your ID in good lighting.
            </Text>
          </View>
          <Pressable
            onPress={handleCaptureIdPhoto}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.aqua },
              pressed && styles.pressed,
            ]}
            testID="capture-id-photo-btn"
          >
            <CameraIcon color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Open camera
            </Text>
          </Pressable>
        </View>
      )}

      {step === 'selfie' && (
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.aqua + '18' }]}>
              <User color={colors.aqua} size={40} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Almost done</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Take a selfie so we can match your face to your ID photo. Look straight at the camera.
            </Text>
          </View>
          <Pressable
            onPress={handleCaptureSelfie}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.aqua },
              pressed && styles.pressed,
            ]}
            testID="capture-selfie-btn"
          >
            <CameraIcon color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Take selfie
            </Text>
          </Pressable>
        </View>
      )}

      {step === 'processing' && (
        <View style={styles.centerContent}>
          <View style={[styles.heroIcon, { backgroundColor: colors.aqua + '18' }]}>
            <ShieldCheck color={colors.aqua} size={40} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text, marginTop: 16 }]}>Verifying your identity</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted, marginTop: 8 }]}>
            Parsing ID data and matching your face...
          </Text>
        </View>
      )}

      {step === 'success' && result && (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: isDark ? 'rgba(43, 191, 186, 0.08)' : 'rgba(26, 158, 153, 0.05)',
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.aqua + '20' }]}>
              <ShieldCheck color={colors.aqua} size={44} />
            </View>
            <Text style={[styles.successBadge, { color: colors.aqua }]}>
              {result.is21Plus ? 'Verified 21+' : 'Verified'}
            </Text>
            {result.parsed && (
              <Text style={[styles.successName, { color: colors.text }]}>
                {result.parsed.firstName} {result.parsed.lastName}
              </Text>
            )}
            <Text style={[styles.successScore, { color: colors.textMuted }]}>
              Match confidence {Math.round((result.faceMatch?.score ?? 0) * 100)}%
            </Text>
          </Animated.View>

          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow label="Document" value={result.parsed?.issuingState ? `${result.parsed.issuingState} ID` : 'Government ID'} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DetailRow label="Age" value={`${result.ageYears} years`} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DetailRow label="21+ status" value={result.is21Plus ? 'Eligible' : 'Under 21'} colors={colors} accent={result.is21Plus ? colors.aqua : colors.danger} />
          </View>

          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.aqua },
              pressed && styles.pressed,
            ]}
            testID="verify-done-btn"
          >
            <ShieldCheck color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Done
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'failed' && (
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.heroCard, { backgroundColor: colors.dangerBg, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.dangerBg }]}>
              <AlertTriangle color={colors.danger} size={40} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Verification failed</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>{error}</Text>
          </View>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.aqua },
              pressed && styles.pressed,
            ]}
            testID="verify-retry-btn"
          >
            <RefreshCw color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.primaryBtnText, { color: isDark ? colors.background : '#fff' }]}>
              Try again
            </Text>
          </Pressable>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

interface StepRowProps {
  num: number;
  icon: React.ReactNode;
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StepRow({ num, icon, title, colors }: StepRowProps) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepNum, { backgroundColor: colors.aqua + '18' }]}>
        <Text style={[styles.stepNumText, { color: colors.aqua }]}>{num}</Text>
      </View>
      <View style={styles.stepIconWrap}>{icon}</View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: string;
}

function DetailRow({ label, value, colors, accent }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: accent ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  stepIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  scanFrame: {
    width: 280,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 2,
    opacity: 0.9,
  },
  cameraHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 24,
  },
  cameraHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  successCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  successBadge: {
    fontSize: 24,
    fontWeight: '900' as const,
  },
  successName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  successScore: {
    fontSize: 13,
    marginTop: 2,
  },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
