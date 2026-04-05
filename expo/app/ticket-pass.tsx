import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  MapPin,
  ShieldCheck,
  Smartphone,
  Ticket,
  Wallet,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';
import { useWalletPass } from '@/providers/WalletPassProvider';
import { generateQRCodeUrl, generateQRCodeUrlLight } from '@/constants/identity';

export default function TicketPassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isVerified } = useAgeVerification();
  const { hasPassForPurchase } = useWalletPass();
  const params = useLocalSearchParams<{
    purchaseId: string;
    eventTitle: string;
    venueName: string;
    date: string;
    tierName: string;
    quantity: string;
    total: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const qrGlow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(qrGlow, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
        Animated.timing(qrGlow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [fadeAnim, scaleAnim, qrGlow]);

  const eventTitle = params.eventTitle ?? 'Event';
  const venueName = params.venueName ?? 'Venue';
  const date = params.date ?? '';
  const tierName = params.tierName ?? 'General';
  const quantity = parseInt(params.quantity ?? '1', 10);
  const total = params.total ?? '0';
  const purchaseId = params.purchaseId ?? `PUR-${Date.now()}`;

  const qrData = useMemo(() => {
    return JSON.stringify({
      type: 'pulze_ticket',
      id: purchaseId,
      event: eventTitle,
      venue: venueName,
      tier: tierName,
      qty: quantity,
      verified21: isVerified,
    });
  }, [purchaseId, eventTitle, venueName, tierName, quantity, isVerified]);

  const qrUrl = useMemo(() => {
    return isDark
      ? generateQRCodeUrl(qrData, 600)
      : generateQRCodeUrlLight(qrData, 600);
  }, [qrData, isDark]);

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const glowOpacity = qrGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  const passCardBg = isDark ? '#0A1A22' : '#FFFFFF';
  const passCardBorder = isDark ? 'rgba(43, 191, 186, 0.15)' : 'rgba(26, 158, 153, 0.12)';

  const walletStatus = useMemo(() => hasPassForPurchase(purchaseId), [hasPassForPurchase, purchaseId]);

  const handleAddToWallet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/wallet-pass',
      params: {
        purchaseId,
        eventTitle,
        venueName,
        date,
        tierName,
        quantity: String(quantity),
        total,
      },
    });
  }, [router, purchaseId, eventTitle, venueName, date, tierName, quantity, total]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="ticket-pass-screen">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarLeft}>
          <Ticket color={colors.aqua} size={18} />
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Ticket Pass</Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
          testID="ticket-pass-close"
        >
          <X color={colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.passContainer}>
        <Animated.View
          style={[
            styles.glowRing,
            { opacity: glowOpacity, borderColor: colors.aqua },
          ]}
        />

        <Animated.View
          style={[
            styles.passCard,
            {
              backgroundColor: passCardBg,
              borderColor: passCardBorder,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark
              ? ['rgba(43, 191, 186, 0.08)', 'transparent']
              : ['rgba(26, 158, 153, 0.06)', 'transparent']
            }
            style={styles.passGradientTop}
          />

          <View style={styles.passHeader}>
            <View style={styles.passHeaderLeft}>
              <View style={[styles.passLogoBadge, { backgroundColor: colors.aqua + '18' }]}>
                <Text style={[styles.passLogoText, { color: colors.aqua }]}>P</Text>
              </View>
              <Text style={[styles.passHeaderLabel, { color: colors.textMuted }]}>PULZE PASS</Text>
            </View>
            {isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(141, 212, 78, 0.12)' : 'rgba(78, 148, 40, 0.08)' }]}>
                <ShieldCheck color={colors.lime} size={14} />
                <Text style={[styles.verifiedText, { color: colors.lime }]}>21+</Text>
              </View>
            )}
          </View>

          <View style={styles.passEventInfo}>
            <Text style={[styles.passEventTitle, { color: colors.text }]} numberOfLines={2}>
              {eventTitle}
            </Text>

            <View style={styles.passDetailRow}>
              <Calendar color={colors.aqua} size={14} />
              <Text style={[styles.passDetailText, { color: colors.textMuted }]}>{date}</Text>
            </View>
            <View style={styles.passDetailRow}>
              <MapPin color={colors.aqua} size={14} />
              <Text style={[styles.passDetailText, { color: colors.textMuted }]}>{venueName}</Text>
            </View>
          </View>

          <View style={[styles.passDivider, { borderColor: isDark ? 'rgba(100,180,180,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.dividerNotchLeft, { backgroundColor: colors.background }]} />
            <View style={[styles.dividerLine, { borderColor: isDark ? 'rgba(100,180,180,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={[styles.dividerNotchRight, { backgroundColor: colors.background }]} />
          </View>

          <View style={styles.passTicketDetails}>
            <View style={styles.ticketDetailCol}>
              <Text style={[styles.ticketDetailLabel, { color: colors.textSoft }]}>TIER</Text>
              <Text style={[styles.ticketDetailValue, { color: colors.text }]}>{tierName}</Text>
            </View>
            <View style={styles.ticketDetailCol}>
              <Text style={[styles.ticketDetailLabel, { color: colors.textSoft }]}>QTY</Text>
              <Text style={[styles.ticketDetailValue, { color: colors.text }]}>{quantity}</Text>
            </View>
            <View style={styles.ticketDetailCol}>
              <Text style={[styles.ticketDetailLabel, { color: colors.textSoft }]}>TOTAL</Text>
              <Text style={[styles.ticketDetailValue, { color: colors.aqua }]}>${total}</Text>
            </View>
          </View>

          <View style={[styles.qrSection, { backgroundColor: isDark ? '#0D2831' : '#F0F4F6' }]}>
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
              testID="ticket-qr-image"
            />
          </View>

          <Text style={[styles.scanLabel, { color: colors.textSoft }]}>
            Scan at entrance for entry
          </Text>

          <View style={styles.passFooter}>
            <Text style={[styles.passIdLabel, { color: colors.textSoft }]}>
              {purchaseId.toUpperCase()}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.walletActions, { paddingBottom: insets.bottom + 16 }]}>
        {(walletStatus.apple || walletStatus.google) ? (
          <View style={styles.walletStatusRow}>
            {walletStatus.apple && (
              <View style={[styles.walletAddedBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Smartphone color={colors.textMuted} size={14} />
                <Text style={[styles.walletAddedText, { color: colors.textMuted }]}>Apple Wallet</Text>
              </View>
            )}
            {walletStatus.google && (
              <View style={[styles.walletAddedBadge, { backgroundColor: 'rgba(66,133,244,0.08)' }]}>
                <Wallet color="#4285F4" size={14} />
                <Text style={[styles.walletAddedGoogleText]}>Google Wallet</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.walletBtnRow}>
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={handleAddToWallet}
              style={({ pressed }) => [
                styles.appleWalletBtn,
                pressed && styles.pressed,
              ]}
              testID="add-apple-wallet"
            >
              <Smartphone color="#fff" size={16} />
              <Text style={styles.appleWalletBtnText}>
                {walletStatus.apple ? 'View in Apple Wallet' : 'Add to Apple Wallet'}
              </Text>
            </Pressable>
          ) : Platform.OS === 'android' ? (
            <Pressable
              onPress={handleAddToWallet}
              style={({ pressed }) => [
                styles.googleWalletBtn,
                pressed && styles.pressed,
              ]}
              testID="add-google-wallet"
            >
              <Wallet color="#fff" size={16} />
              <Text style={styles.googleWalletBtnText}>
                {walletStatus.google ? 'View in Google Wallet' : 'Add to Google Wallet'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAddToWallet}
              style={({ pressed }) => [
                styles.addWalletBtn,
                { backgroundColor: colors.aqua },
                pressed && styles.pressed,
              ]}
              testID="add-wallet-web"
            >
              <Wallet color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.addWalletBtnText, { color: isDark ? colors.background : '#fff' }]}>
                {(walletStatus.apple || walletStatus.google) ? 'Manage Wallet Pass' : 'Add to Wallet'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 340,
    height: 560,
    borderRadius: 32,
    borderWidth: 2,
  },
  passCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  passGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 8,
  },
  passHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passLogoText: {
    fontSize: 18,
    fontWeight: '900' as const,
  },
  passHeaderLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  passEventInfo: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  passEventTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  passDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passDetailText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  passDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
  },
  dividerNotchLeft: {
    width: 16,
    height: 32,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginLeft: -1,
  },
  dividerLine: {
    flex: 1,
    borderTopWidth: 2,
    borderStyle: 'dashed' as const,
  },
  dividerNotchRight: {
    width: 16,
    height: 32,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: -1,
  },
  passTicketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  ticketDetailCol: {
    alignItems: 'center',
    gap: 4,
  },
  ticketDetailLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  ticketDetailValue: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  qrSection: {
    marginHorizontal: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  scanLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  passFooter: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 4,
  },
  passIdLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  walletActions: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 24,
    gap: 10,
  },
  walletStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  walletAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  walletAddedText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  walletAddedGoogleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#4285F4',
  },
  walletBtnRow: {
    width: '100%',
  },
  appleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 14,
  },
  appleWalletBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  googleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 14,
  },
  googleWalletBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  addWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addWalletBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
