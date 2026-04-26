import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Check, X, AlertTriangle, ShieldCheck, RefreshCcw, Camera, Settings2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/colors';

type ValidationStatus = 'valid' | 'already_scanned' | 'invalid';

interface ValidationResult {
  status: ValidationStatus;
  guestName?: string;
  tier?: string;
  is21Plus?: boolean;
  usedAt?: string;
}

const TEAL = '#2BBFBA';
const AMBER = '#FFB800';
const RED = '#FF4444';

function validateTicket(qr: string): ValidationResult {
  console.log('[Scan] validateTicket called with:', qr);
  if (typeof qr !== 'string' || qr.length === 0) {
    return { status: 'invalid' };
  }
  if (qr.startsWith('PULZE-')) {
    return {
      status: 'valid',
      guestName: 'Valid Ticket',
      tier: 'General Admission',
      is21Plus: true,
    };
  }
  if (qr.startsWith('USED-')) {
    return { status: 'already_scanned', usedAt: '9:42 PM' };
  }
  return { status: 'invalid' };
}

const SCAN_DEBOUNCE_MS = 1500;
const FRAME_SIZE = 260;
const CORNER = 30;
const CORNER_W = 3;

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const hh = ((h + 11) % 12 + 1).toString();
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${mm}:${ss} ${ampm}`;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AnimatedCheck() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const opacity = anim;
  return (
    <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', justifyContent: 'center', width: 110, height: 110, borderRadius: 55, backgroundColor: TEAL, shadowColor: TEAL, shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }}>
      <Check size={64} color="#FFFFFF" strokeWidth={3.5} />
    </Animated.View>
  );
}

export default function StaffScanScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ eventName?: string; venueName?: string }>();
  const eventName = params.eventName ?? 'Event';
  const venueName = params.venueName ?? 'Venue';

  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [admittedCount, setAdmittedCount] = useState<number>(0);
  const [deniedCount, setDeniedCount] = useState<number>(0);
  const [now, setNow] = useState<Date>(new Date());
  const sessionStartRef = useRef<number>(Date.now());
  const lastScanAtRef = useRef<number>(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const clearResult = useCallback(() => {
    setResult(null);
    lastScanAtRef.current = Date.now();
  }, []);

  const handleBarCodeScanned = useCallback((data: string) => {
    const t = Date.now();
    if (t - lastScanAtRef.current < SCAN_DEBOUNCE_MS) {
      return;
    }
    lastScanAtRef.current = t;

    const validation = validateTicket(data);
    setResult(validation);

    if (validation.status === 'valid') {
      setAdmittedCount((c) => c + 1);
    } else if (validation.status === 'invalid') {
      setDeniedCount((c) => c + 1);
    }

    if (Platform.OS !== 'web') {
      if (validation.status === 'valid') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (validation.status === 'already_scanned') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    const ms = validation.status === 'valid' ? 2000 : 2500;
    dismissTimerRef.current = setTimeout(() => {
      setResult(null);
      lastScanAtRef.current = Date.now();
    }, ms);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleOptions = useCallback(() => {
    Alert.alert(
      'Options',
      undefined,
      [
        { text: 'Change Event', onPress: () => Alert.alert('Coming soon') },
        { text: 'Export Count', onPress: () => Alert.alert('Coming soon') },
        { text: 'End Session', style: 'destructive', onPress: () => Alert.alert('Coming soon') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  const sessionMs = now.getTime() - sessionStartRef.current;
  const timeLabel = useMemo(() => formatTime(now), [now]);
  const durationLabel = useMemo(() => formatDuration(sessionMs), [sessionMs]);

  const renderOverlay = () => {
    if (!result) return null;

    if (result.status === 'valid') {
      return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(43, 191, 186, 0.15)' }]} testID="overlay-success">
          <View style={styles.overlayInner}>
            <AnimatedCheck />
            <Text style={styles.overlayTitle}>{result.guestName ?? 'Valid Ticket'}</Text>
            {result.is21Plus ? (
              <View style={[styles.verifyBadge, { backgroundColor: TEAL }]}>
                <ShieldCheck size={14} color="#041318" />
                <Text style={[styles.verifyBadgeText, { color: '#041318' }]}>21+ VERIFIED</Text>
              </View>
            ) : (
              <View style={[styles.verifyBadge, { backgroundColor: AMBER }]}>
                <AlertTriangle size={14} color="#1A1200" />
                <Text style={[styles.verifyBadgeText, { color: '#1A1200' }]}>ID REQUIRED</Text>
              </View>
            )}
            {result.tier ? <Text style={styles.overlayTier}>{result.tier}</Text> : null}
          </View>
        </View>
      );
    }

    if (result.status === 'already_scanned') {
      return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]} testID="overlay-used">
          <View style={styles.overlayInner}>
            <View style={[styles.iconCircle, { backgroundColor: AMBER, shadowColor: AMBER }]}>
              <AlertTriangle size={56} color="#1A1200" strokeWidth={2.6} />
            </View>
            <Text style={styles.overlayTitle}>Already Scanned</Text>
            <Text style={styles.overlaySubtitle}>This ticket was used at {result.usedAt ?? '9:42 PM'}</Text>
            <TouchableOpacity style={styles.dismissBtn} onPress={clearResult}>
              <RefreshCcw size={16} color="#FFFFFF" />
              <Text style={styles.dismissText}>Scan next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(255, 68, 68, 0.15)' }]} testID="overlay-invalid">
        <View style={styles.overlayInner}>
          <View style={[styles.iconCircle, { backgroundColor: RED, shadowColor: RED }]}>
            <X size={60} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.overlayTitle}>Invalid Ticket</Text>
          <Text style={styles.overlaySubtitle}>Do not admit</Text>
          <TouchableOpacity style={styles.dismissBtn} onPress={clearResult}>
            <RefreshCcw size={16} color="#FFFFFF" />
            <Text style={styles.dismissText}>Scan next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]} testID="staff-scan-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Camera size={48} color={TEAL} />
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
            <ActivityIndicator color={TEAL} />
          ) : (
            <>
              <Camera size={48} color={TEAL} />
              <Text style={styles.permissionText}>Camera access is required to scan tickets</Text>
              <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: TEAL }]} onPress={() => requestPermission()}>
                <Text style={styles.permissionBtnText}>Grant access</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleOptions} testID="options-btn">
            <Settings2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEvent} numberOfLines={1}>{eventName}</Text>
            <Text style={styles.headerVenue} numberOfLines={1}>{venueName}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
        </View>
      </SafeAreaView>

      {!result && (
        <View style={styles.frameWrap} pointerEvents="none">
          <Text style={styles.frameLabel}>SCAN TICKET OR ID</Text>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View
              style={[
                styles.scanLine,
                {
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

      <SafeAreaView edges={['bottom']} style={styles.footerWrap} pointerEvents="box-none">
        <View style={styles.statsRow}>
          <View style={styles.statCell} testID="admitted-counter">
            <Text style={[styles.statValue, { color: TEAL }]}>{admittedCount}</Text>
            <Text style={styles.statLabel}>ADMITTED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell} testID="denied-counter">
            <Text style={[styles.statValue, { color: RED }]}>{deniedCount}</Text>
            <Text style={styles.statLabel}>DENIED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#FFFFFF', fontVariant: ['tabular-nums'] }]}>{durationLabel}</Text>
            <Text style={styles.statLabel}>SESSION</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={handleClose} testID="close-scan">
          <Text style={styles.endBtnText}>End Session</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  webText: { fontSize: FontSize.body, fontWeight: FontWeight.medium, textAlign: 'center' },
  permissionView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 16 },
  permissionText: { color: '#FFFFFF', textAlign: 'center', fontSize: FontSize.body, fontWeight: FontWeight.medium },
  permissionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill },
  permissionBtnText: { color: '#000', fontSize: FontSize.body, fontWeight: FontWeight.bold },

  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  headerEvent: { color: '#FFFFFF', fontSize: FontSize.subtitle, fontWeight: FontWeight.bold },
  headerVenue: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, marginTop: 2 },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minWidth: 92, alignItems: 'center' },
  timeText: { color: '#FFFFFF', fontSize: 12, fontWeight: FontWeight.bold, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },

  frameWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frameLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 3, marginBottom: Spacing.lg, opacity: 0.85 },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: TEAL },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 6 },
  scanLine: { position: 'absolute', left: 6, right: 6, top: 0, height: 2, borderRadius: 2, backgroundColor: TEAL, shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 6 },
  frameHint: { color: 'rgba(255,255,255,0.7)', marginTop: Spacing.lg, fontSize: FontSize.small, fontWeight: FontWeight.medium },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  overlayInner: { alignItems: 'center', gap: Spacing.md, backgroundColor: 'rgba(4, 19, 24, 0.78)', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  iconCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20 },
  overlayTitle: { color: '#FFFFFF', fontSize: FontSize.heading, fontWeight: FontWeight.heavy, marginTop: Spacing.sm, textAlign: 'center' },
  overlaySubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.body, fontWeight: FontWeight.medium, textAlign: 'center' },
  overlayTier: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  verifyBadgeText: { fontSize: 11, fontWeight: FontWeight.heavy, letterSpacing: 1 },
  dismissBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: Spacing.sm },
  dismissText: { color: '#FFFFFF', fontWeight: FontWeight.bold, fontSize: FontSize.body },

  footerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4, 19, 24, 0.85)', borderRadius: Radius.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: FontWeight.heavy },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  endBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  endBtnText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
});
