import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

type ScanState = 'idle' | 'success' | 'already' | 'invalid';

interface ScanPayload {
  ticketId: string;
  guestName: string;
  tier: string;
  is21Plus: boolean;
  status: 'valid' | 'used' | 'invalid';
}

const DEBOUNCE_MS = 1500;

const usedTickets = new Set<string>();

function parsePayload(raw: string): ScanPayload | null {
  try {
    const obj = JSON.parse(raw) as Partial<ScanPayload> & { id?: string; name?: string };
    const ticketId = (obj.ticketId ?? obj.id ?? '').toString();
    if (!ticketId) return null;
    return {
      ticketId,
      guestName: (obj.guestName ?? obj.name ?? 'Guest').toString(),
      tier: (obj.tier ?? 'General Admission').toString(),
      is21Plus: Boolean(obj.is21Plus),
      status: 'valid',
    };
  } catch {
    if (raw.startsWith('PULZE:')) {
      const parts = raw.split('|');
      const ticketId = parts[0]?.replace('PULZE:', '') ?? '';
      if (!ticketId) return null;
      return {
        ticketId,
        guestName: parts[1] ?? 'Guest',
        tier: parts[2] ?? 'General Admission',
        is21Plus: parts[3] === '21+',
        status: 'valid',
      };
    }
    return null;
  }
}

export default function StaffScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ eventName?: string; venueName?: string }>();

  const eventName = params.eventName ?? 'Event';
  const venueName = params.venueName ?? 'Venue';

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('idle');
  const [payload, setPayload] = useState<ScanPayload | null>(null);

  const lastScanRef = useRef<number>(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setState('idle');
      setPayload(null);
    }, 2200);
  }, []);

  const handleBarcodeScanned = useCallback(
    (scan: { type: string; data: string }) => {
      const now = Date.now();
      if (now - lastScanRef.current < DEBOUNCE_MS) return;
      if (state !== 'idle') return;
      lastScanRef.current = now;

      console.log('[StaffScan] scanned', scan.type, scan.data);

      const parsed = parsePayload(scan.data);

      if (!parsed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPayload(null);
        setState('invalid');
        scheduleReset();
        return;
      }

      if (usedTickets.has(parsed.ticketId)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPayload(parsed);
        setState('already');
        scheduleReset();
        return;
      }

      usedTickets.add(parsed.ticketId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayload(parsed);
      setState('success');
      scheduleReset();
    },
    [state, scheduleReset]
  );

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleDismissOverlay = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setState('idle');
    setPayload(null);
  }, []);

  const scanLineTranslate = useMemo(
    () =>
      scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 240],
      }),
    [scanLineAnim]
  );

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {Platform.OS !== 'web' ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={state === 'idle' ? handleBarcodeScanned : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webFallback]}>
          <Text style={styles.webText}>Camera scanning is only available on iOS or Android.</Text>
        </View>
      )}

      <View style={styles.dimOverlay} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          hitSlop={12}
          testID="staff-scan-close"
        >
          <X color="#fff" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {eventName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {venueName}
          </Text>
        </View>
        <View style={styles.closeBtnPlaceholder} />
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.aquaBright }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.aquaBright }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.aquaBright }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.aquaBright }]} />
          <Animated.View
            style={[
              styles.scanLine,
              {
                backgroundColor: colors.aquaBright,
                transform: [{ translateY: scanLineTranslate }],
              },
            ]}
          />
        </View>
        <View style={styles.hintWrap}>
          <Text style={styles.hintText}>Align the QR code inside the frame</Text>
        </View>
      </View>

      {state !== 'idle' && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismissOverlay}
          testID="staff-scan-result"
        >
          <ResultOverlay
            state={state}
            payload={payload}
            insets={insets}
            isDark={isDark}
          />
        </Pressable>
      )}
    </View>
  );
}

interface ResultOverlayProps {
  state: ScanState;
  payload: ScanPayload | null;
  insets: { top: number; bottom: number; left: number; right: number };
  isDark: boolean;
}

function ResultOverlay({ state, payload, insets }: ResultOverlayProps) {
  const config = useMemo(() => {
    if (state === 'success') {
      return {
        bg: '#0F8F46',
        accent: '#1FBF66',
        title: 'ADMIT',
        subtitle: 'Valid ticket',
        icon: <CheckCircle2 color="#fff" size={88} strokeWidth={2.4} />,
      } as const;
    }
    if (state === 'already') {
      return {
        bg: '#B8830A',
        accent: '#F0B400',
        title: 'ALREADY SCANNED',
        subtitle: 'This ticket was already used',
        icon: <Clock color="#fff" size={88} strokeWidth={2.4} />,
      } as const;
    }
    return {
      bg: '#B22A22',
      accent: '#E8443A',
      title: 'INVALID',
      subtitle: 'Invalid ticket',
      icon: <AlertTriangle color="#fff" size={88} strokeWidth={2.4} />,
    } as const;
  }, [state]);

  return (
    <View style={[styles.overlayFill, { backgroundColor: config.bg }]}>
      <View style={[styles.overlayContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.iconCircle}>{config.icon}</View>
        <Text style={styles.overlayTitle}>{config.title}</Text>
        <Text style={styles.overlaySubtitle}>{config.subtitle}</Text>

        {state === 'success' && payload && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailLabel}>Guest</Text>
            <Text style={styles.detailValue}>{payload.guestName}</Text>

            <View style={styles.detailDivider} />

            <Text style={styles.detailLabel}>Ticket</Text>
            <Text style={styles.detailValue}>{payload.tier}</Text>

            {payload.is21Plus && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.badge21}>
                  <ShieldCheck color="#0F8F46" size={18} />
                  <Text style={styles.badge21Text}>21+ VERIFIED</Text>
                </View>
              </>
            )}
          </View>
        )}

        <Text style={styles.tapHint}>Tap to dismiss</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  webFallback: {
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  webText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 14,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPlaceholder: { width: 40, height: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  pressed: { opacity: 0.7 },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  scanFrame: {
    width: 260,
    height: 260,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderColor: '#5CE8DC',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    opacity: 0.85,
    shadowColor: '#5CE8DC',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hintWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  overlayFill: { flex: 1 },
  overlayContent: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900' as const,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  overlaySubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 22,
    padding: 22,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 14,
  },
  badge21: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badge21Text: {
    color: '#0F8F46',
    fontSize: 13,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 28,
  },
});
