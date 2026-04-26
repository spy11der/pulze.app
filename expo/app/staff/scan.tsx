import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, X, AlertTriangle, ShieldCheck, RefreshCcw, Camera } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/colors';

type ValidationStatus = 'valid' | 'already_scanned' | 'invalid';

interface ValidationResult {
  status: ValidationStatus;
  guestName?: string;
  tier?: string;
  is21Plus?: boolean;
}

function validateTicket(qr: string): ValidationResult {
  console.log('[Scan] validateTicket called with:', qr);
  if (typeof qr !== 'string' || qr.length === 0) {
    return { status: 'invalid' };
  }
  if (qr.startsWith('PULZE-')) {
    return {
      status: 'valid',
      guestName: 'Alex Johnson',
      tier: 'General Admission',
      is21Plus: true,
    };
  }
  if (qr.startsWith('USED-')) {
    return { status: 'already_scanned' };
  }
  return { status: 'invalid' };
}

const SCAN_DEBOUNCE_MS = 1500;

export default function StaffScanScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ eventName?: string; venueName?: string }>();
  const eventName = params.eventName ?? 'Event';
  const venueName = params.venueName ?? 'Venue';

  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [admittedCount, setAdmittedCount] = useState<number>(0);
  const lastScanAtRef = useRef<number>(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [result, scanLineAnim]);

  useEffect(() => {
    setAdmittedCount(0);
  }, []);

  const handleBarCodeScanned = useCallback((data: string) => {
    const now = Date.now();
    if (now - lastScanAtRef.current < SCAN_DEBOUNCE_MS) {
      return;
    }
    lastScanAtRef.current = now;

    const validation = validateTicket(data);
    setResult(validation);

    if (validation.status === 'valid') {
      setAdmittedCount((c) => c + 1);
    }

    if (Platform.OS !== 'web') {
      if (validation.status === 'valid') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(result.status === 'already_scanned' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }
  }, []);

  const handleScanAgain = useCallback(() => {
    setResult(null);
    lastScanAtRef.current = Date.now();
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  const renderOverlay = () => {
    if (!result) return null;
    if (result.status === 'valid') {
      return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(15, 110, 70, 0.96)' }]} testID="overlay-success">
          <CheckCircle2 size={96} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.overlayTitle}>Welcome in</Text>
          <View style={styles.guestCard}>
            <Text style={styles.guestName}>{result.guestName}</Text>
            <Text style={styles.guestTier}>{result.tier}</Text>
            {result.is21Plus ? (
              <View style={styles.ageBadge}>
                <ShieldCheck size={16} color="#0D2B1A" />
                <Text style={styles.ageBadgeText}>21+ Verified</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.againButton} onPress={handleScanAgain} testID="scan-again">
            <RefreshCcw size={18} color="#FFFFFF" />
            <Text style={styles.againText}>Scan next</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (result.status === 'already_scanned') {
      return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(180, 130, 20, 0.96)' }]} testID="overlay-used">
          <AlertTriangle size={96} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.overlayTitle}>Already scanned</Text>
          <Text style={styles.overlaySubtitle}>This ticket was already used</Text>
          <TouchableOpacity style={styles.againButton} onPress={handleScanAgain} testID="scan-again">
            <RefreshCcw size={18} color="#FFFFFF" />
            <Text style={styles.againText}>Scan next</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(180, 40, 40, 0.96)' }]} testID="overlay-invalid">
        <X size={96} color="#FFFFFF" strokeWidth={2.6} />
        <Text style={styles.overlayTitle}>Invalid ticket</Text>
        <Text style={styles.overlaySubtitle}>This QR code is not recognized</Text>
        <TouchableOpacity style={styles.againButton} onPress={handleScanAgain} testID="scan-again">
          <RefreshCcw size={18} color="#FFFFFF" />
          <Text style={styles.againText}>Scan next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]} testID="staff-scan-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Camera size={48} color={colors.aqua} />
          <Text style={[styles.webText, { color: colors.text }]}>Camera scanning is not available on web</Text>
        </View>
      ) : permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleBarCodeScanned(data)}
        />
      ) : (
        <View style={styles.permissionView}>
          {!permission ? (
            <ActivityIndicator color={colors.aqua} />
          ) : (
            <>
              <Camera size={48} color={colors.aqua} />
              <Text style={styles.permissionText}>Camera access is required to scan tickets</Text>
              <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: colors.aqua }]} onPress={() => requestPermission()}>
                <Text style={styles.permissionBtnText}>Grant access</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} testID="close-scan">
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEvent} numberOfLines={1}>{eventName}</Text>
            <Text style={styles.headerVenue} numberOfLines={1}>{venueName}</Text>
          </View>
          <View style={[styles.counterBadge, { borderColor: colors.aqua }]} testID="admitted-counter">
            <Text style={[styles.counterText, { color: colors.aqua }]} numberOfLines={1}>{admittedCount} admitted</Text>
          </View>
        </View>
      </SafeAreaView>

      {!result && (
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: colors.aquaBright }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colors.aquaBright }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colors.aquaBright }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colors.aquaBright }]} />
            <Animated.View
              style={[
                styles.scanLine,
                {
                  backgroundColor: colors.aquaBright,
                  shadowColor: colors.aquaBright,
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, FRAME_SIZE - 2],
                      }),
                    },
                  ],
                },
              ]}
              testID="scan-line"
            />
          </View>
          <Text style={styles.frameHint}>Align QR within the frame</Text>
        </View>
      )}

      {renderOverlay()}
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER = 28;
const CORNER_W = 4;

const styles = StyleSheet.create({
  root: { flex: 1 },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  webText: { fontSize: FontSize.body, fontWeight: FontWeight.medium, textAlign: 'center' },
  permissionView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  permissionText: { color: '#FFFFFF', textAlign: 'center', fontSize: FontSize.body, fontWeight: FontWeight.medium },
  permissionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill },
  permissionBtnText: { color: '#000', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  closeBtnPlaceholder: { width: 40, height: 40 },
  counterBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  counterText: { fontSize: FontSize.small, fontWeight: FontWeight.bold },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  headerEvent: { color: '#FFFFFF', fontSize: FontSize.subtitle, fontWeight: FontWeight.bold },
  headerVenue: { color: 'rgba(255,255,255,0.78)', fontSize: FontSize.small, marginTop: 2 },
  frameWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#5CE8DC' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 6 },
  scanLine: { position: 'absolute', left: 6, right: 6, top: 0, height: 2, borderRadius: 2, opacity: 0.9, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  frameHint: { color: 'rgba(255,255,255,0.78)', marginTop: Spacing.lg, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  overlayTitle: { color: '#FFFFFF', fontSize: FontSize.display, fontWeight: FontWeight.heavy, marginTop: Spacing.md },
  overlaySubtitle: { color: 'rgba(255,255,255,0.92)', fontSize: FontSize.body, fontWeight: FontWeight.medium, textAlign: 'center' },
  guestCard: { backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radius.lg, alignItems: 'center', gap: 6 },
  guestName: { color: '#FFFFFF', fontSize: FontSize.title, fontWeight: FontWeight.bold },
  guestTier: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.body },
  ageBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B6F3C6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, marginTop: 8 },
  ageBadgeText: { color: '#0D2B1A', fontWeight: FontWeight.bold, fontSize: FontSize.small },
  againButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: Radius.pill, marginTop: Spacing.md },
  againText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
