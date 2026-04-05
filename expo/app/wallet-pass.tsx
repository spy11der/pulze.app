import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Smartphone,
  Ticket,
  Wallet,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';
import { useWalletPass, type WalletType } from '@/providers/WalletPassProvider';

type FlowStep = 'select' | 'processing' | 'success';

export default function WalletPassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isVerified } = useAgeVerification();
  const { addPass, hasPassForPurchase, isAdding } = useWalletPass();

  const params = useLocalSearchParams<{
    purchaseId: string;
    eventTitle: string;
    venueName: string;
    date: string;
    tierName: string;
    quantity: string;
    total: string;
  }>();

  const purchaseId = params.purchaseId ?? `PUR-${Date.now()}`;
  const eventTitle = params.eventTitle ?? 'Event';
  const venueName = params.venueName ?? 'Venue';
  const date = params.date ?? '';
  const tierName = params.tierName ?? 'General';
  const quantity = parseInt(params.quantity ?? '1', 10);

  const [step, setStep] = useState<FlowStep>('select');
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const existingPasses = useMemo(() => hasPassForPurchase(purchaseId), [hasPassForPurchase, purchaseId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSelectWallet = useCallback((type: WalletType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedWallet(type);
    console.log('[WalletPass] Selected wallet type:', type);
  }, []);

  const handleAddToWallet = useCallback(async () => {
    if (!selectedWallet) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStep('processing');
    console.log('[WalletPass] Starting add to', selectedWallet, 'wallet...');

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 0.5,
      duration: 800,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start(async () => {
        try {
          await addPass({
            purchaseId,
            eventTitle,
            venueName,
            date,
            tierName,
            quantity,
            walletType: selectedWallet,
            verified21: isVerified,
          });

          console.log('[WalletPass] Pass added successfully to', selectedWallet);
          setStep('success');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }).start();
        } catch (e) {
          console.log('[WalletPass] Error adding pass:', e);
          setStep('select');
        }
      });
    });
  }, [selectedWallet, addPass, purchaseId, eventTitle, venueName, date, tierName, quantity, isVerified, progressAnim, checkScale]);

  const handleOpenWalletApp = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedWallet === 'apple') {
      if (Platform.OS === 'ios') {
        void Linking.openURL('shoebox://');
      } else {
        console.log('[WalletPass] Apple Wallet not available on this platform');
      }
    } else {
      void Linking.openURL('https://pay.google.com/gp/v/home');
    }
  }, [selectedWallet]);

  const handleDone = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isAppleDevice = Platform.OS === 'ios';
  const isAndroidDevice = Platform.OS === 'android';

  if (step === 'success') {
    const walletName = selectedWallet === 'apple' ? 'Apple Wallet' : 'Google Wallet';
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]} testID="wallet-pass-success">
        <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
        <View style={[styles.successContainer, { paddingTop: insets.top + 60 }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
            <LinearGradient
              colors={selectedWallet === 'apple' ? ['#1A1A1A', '#333'] : ['#4285F4', '#34A853']}
              style={styles.successCircleInner}
            >
              <CheckCircle2 color="#fff" size={44} />
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Added to {walletName}</Text>
          <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
            Your ticket pass is now in your {walletName}. Show it at the door for entry.
          </Text>

          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.successCardRow}>
              <Ticket color={colors.aqua} size={16} />
              <Text style={[styles.successCardTitle, { color: colors.text }]} numberOfLines={1}>{eventTitle}</Text>
            </View>
            <View style={styles.successCardRow}>
              <Calendar color={colors.textSoft} size={14} />
              <Text style={[styles.successCardMeta, { color: colors.textMuted }]}>{date}</Text>
            </View>
            <View style={styles.successCardRow}>
              <MapPin color={colors.textSoft} size={14} />
              <Text style={[styles.successCardMeta, { color: colors.textMuted }]}>{venueName}</Text>
            </View>
            {isVerified && (
              <View style={[styles.successVerifiedRow, { backgroundColor: isDark ? 'rgba(141,212,78,0.08)' : 'rgba(78,148,40,0.05)' }]}>
                <ShieldCheck color={colors.lime} size={14} />
                <Text style={[styles.successVerifiedText, { color: colors.lime }]}>21+ Verified</Text>
              </View>
            )}
          </View>

          {(selectedWallet === 'apple' && isAppleDevice) || selectedWallet === 'google' ? (
            <Pressable
              onPress={handleOpenWalletApp}
              style={({ pressed }) => [
                styles.openWalletBtn,
                {
                  backgroundColor: selectedWallet === 'apple' ? '#1A1A1A' : '#4285F4',
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              testID="open-wallet-btn"
            >
              <Wallet color="#fff" size={18} />
              <Text style={styles.openWalletBtnText}>Open {walletName}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.doneBtn, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            testID="wallet-done-btn"
          >
            <Text style={[styles.doneBtnText, { color: colors.textMuted }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'processing') {
    const walletName = selectedWallet === 'apple' ? 'Apple Wallet' : 'Google Wallet';
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]} testID="wallet-pass-processing">
        <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
        <View style={[styles.processingContainer, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.processingIcon, { backgroundColor: selectedWallet === 'apple' ? '#1A1A1A' : 'rgba(66,133,244,0.12)' }]}>
            <Wallet color={selectedWallet === 'apple' ? '#fff' : '#4285F4'} size={36} />
          </View>
          <Text style={[styles.processingTitle, { color: colors.text }]}>Adding to {walletName}...</Text>
          <Text style={[styles.processingSub, { color: colors.textMuted }]}>
            Generating your digital pass with {isVerified ? '21+ verification' : 'event details'}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: selectedWallet === 'apple' ? '#1A1A1A' : '#4285F4',
                  width: progressWidth as unknown as number,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="wallet-pass-screen">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          testID="wallet-back-btn"
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Wallet color={colors.aqua} size={18} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add to Wallet</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Digital pass for quick entry</Text>
        </View>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.surface }, pressed && styles.pressed]}
        >
          <X color={colors.textMuted} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.eventSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.eventSummaryIcon, { backgroundColor: isDark ? 'rgba(43,191,186,0.1)' : 'rgba(26,158,153,0.07)' }]}>
              <Ticket color={colors.aqua} size={24} />
            </View>
            <View style={styles.eventSummaryBody}>
              <Text style={[styles.eventSummaryTitle, { color: colors.text }]} numberOfLines={2}>{eventTitle}</Text>
              <View style={styles.eventSummaryMeta}>
                <Calendar color={colors.textSoft} size={12} />
                <Text style={[styles.eventSummaryMetaText, { color: colors.textMuted }]}>{date}</Text>
              </View>
              <View style={styles.eventSummaryMeta}>
                <MapPin color={colors.textSoft} size={12} />
                <Text style={[styles.eventSummaryMetaText, { color: colors.textMuted }]}>{venueName}</Text>
              </View>
              <View style={styles.eventSummaryBadges}>
                <View style={[styles.tierBadge, { backgroundColor: isDark ? 'rgba(43,191,186,0.1)' : 'rgba(26,158,153,0.07)' }]}>
                  <Text style={[styles.tierBadgeText, { color: colors.aqua }]}>{quantity}x {tierName}</Text>
                </View>
                {isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(141,212,78,0.1)' : 'rgba(78,148,40,0.06)' }]}>
                    <ShieldCheck color={colors.lime} size={11} />
                    <Text style={[styles.verifiedBadgeText, { color: colors.lime }]}>21+</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Choose your wallet</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            Add your ticket as a digital pass for tap-and-go entry at the venue.
          </Text>

          <Pressable
            onPress={() => handleSelectWallet('apple')}
            style={({ pressed }) => [
              styles.walletOption,
              {
                backgroundColor: selectedWallet === 'apple'
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                  : colors.surface,
                borderColor: selectedWallet === 'apple' ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') : colors.border,
              },
              pressed && styles.pressed,
            ]}
            testID="wallet-apple-option"
          >
            <View style={[styles.walletOptionIcon, { backgroundColor: '#1A1A1A' }]}>
              <Smartphone color="#fff" size={20} />
            </View>
            <View style={styles.walletOptionBody}>
              <Text style={[styles.walletOptionTitle, { color: colors.text }]}>Apple Wallet</Text>
              <Text style={[styles.walletOptionDesc, { color: colors.textMuted }]}>
                {isAppleDevice ? 'Add to your iPhone Wallet app' : 'Generate Apple Wallet pass (.pkpass)'}
              </Text>
              {existingPasses.apple && (
                <View style={[styles.alreadyAddedBadge, { backgroundColor: colors.lime + '14' }]}>
                  <CheckCircle2 color={colors.lime} size={11} />
                  <Text style={[styles.alreadyAddedText, { color: colors.lime }]}>Already added</Text>
                </View>
              )}
            </View>
            <View style={[styles.radioOuter, { borderColor: selectedWallet === 'apple' ? '#1A1A1A' : colors.textSoft }]}>
              {selectedWallet === 'apple' && <View style={[styles.radioInner, { backgroundColor: '#1A1A1A' }]} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleSelectWallet('google')}
            style={({ pressed }) => [
              styles.walletOption,
              {
                backgroundColor: selectedWallet === 'google'
                  ? (isDark ? 'rgba(66,133,244,0.08)' : 'rgba(66,133,244,0.04)')
                  : colors.surface,
                borderColor: selectedWallet === 'google' ? '#4285F4' + '50' : colors.border,
              },
              pressed && styles.pressed,
            ]}
            testID="wallet-google-option"
          >
            <View style={[styles.walletOptionIcon, { backgroundColor: 'rgba(66,133,244,0.12)' }]}>
              <Wallet color="#4285F4" size={20} />
            </View>
            <View style={styles.walletOptionBody}>
              <Text style={[styles.walletOptionTitle, { color: colors.text }]}>Google Wallet</Text>
              <Text style={[styles.walletOptionDesc, { color: colors.textMuted }]}>
                {isAndroidDevice ? 'Add to your Google Wallet app' : 'Generate Google Wallet pass'}
              </Text>
              {existingPasses.google && (
                <View style={[styles.alreadyAddedBadge, { backgroundColor: colors.lime + '14' }]}>
                  <CheckCircle2 color={colors.lime} size={11} />
                  <Text style={[styles.alreadyAddedText, { color: colors.lime }]}>Already added</Text>
                </View>
              )}
            </View>
            <View style={[styles.radioOuter, { borderColor: selectedWallet === 'google' ? '#4285F4' : colors.textSoft }]}>
              {selectedWallet === 'google' && <View style={[styles.radioInner, { backgroundColor: '#4285F4' }]} />}
            </View>
          </Pressable>

          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(43,191,186,0.06)' : 'rgba(26,158,153,0.04)' }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>What's included in your pass</Text>
            <View style={styles.infoList}>
              <InfoRow icon={<Ticket color={colors.aqua} size={14} />} text="Scannable QR code for venue entry" colors={colors} />
              <InfoRow icon={<Calendar color={colors.aqua} size={14} />} text="Event details, date, and time" colors={colors} />
              <InfoRow icon={<MapPin color={colors.aqua} size={14} />} text="Venue name and location" colors={colors} />
              {isVerified && (
                <InfoRow icon={<ShieldCheck color={colors.lime} size={14} />} text="21+ age verification status" colors={colors} />
              )}
            </View>
          </View>

          <View style={[styles.securityNote, { backgroundColor: isDark ? 'rgba(141,212,78,0.06)' : 'rgba(78,148,40,0.04)' }]}>
            <ShieldCheck color={colors.lime} size={16} />
            <Text style={[styles.securityNoteText, { color: colors.textSoft }]}>
              Your pass data is encrypted and securely transferred to your wallet app. No personal data is shared with third parties.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? 'rgba(4,19,24,0.96)' : 'rgba(245,248,250,0.96)', borderTopColor: colors.border }]}>
        {selectedWallet ? (
          <Pressable
            onPress={() => void handleAddToWallet()}
            disabled={isAdding}
            style={({ pressed }) => [
              styles.addBtn,
              {
                opacity: isAdding ? 0.6 : (pressed ? 0.9 : 1),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            testID="add-to-wallet-btn"
          >
            <LinearGradient
              colors={
                selectedWallet === 'apple'
                  ? ['#1A1A1A', '#333333']
                  : ['#4285F4', '#34A853']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Wallet color="#fff" size={18} />
              <Text style={styles.addBtnText}>
                {isAdding ? 'Adding...' : `Add to ${selectedWallet === 'apple' ? 'Apple' : 'Google'} Wallet`}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={[styles.addBtnDisabled, { backgroundColor: colors.card }]}>
            <Wallet color={colors.textSoft} size={18} />
            <Text style={[styles.addBtnDisabledText, { color: colors.textSoft }]}>Select a wallet to continue</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, text, colors }: { icon: React.ReactNode; text: string; colors: { textMuted: string } }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={[styles.infoRowText, { color: colors.textMuted }]}>{text}</Text>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  eventSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  eventSummaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSummaryBody: {
    flex: 1,
    gap: 4,
  },
  eventSummaryTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    lineHeight: 22,
  },
  eventSummaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventSummaryMetaText: {
    fontSize: 13,
  },
  eventSummaryBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
  },
  walletOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletOptionBody: {
    flex: 1,
    gap: 2,
  },
  walletOptionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  walletOptionDesc: {
    fontSize: 13,
  },
  alreadyAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  alreadyAddedText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoCard: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoRowText: {
    fontSize: 14,
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  securityNoteText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  addBtn: {
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  addBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#fff',
  },
  addBtnDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  addBtnDisabledText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  processingIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginTop: 8,
  },
  processingSub: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  successCircleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  successCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  successCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  successCardMeta: {
    fontSize: 14,
  },
  successVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  successVerifiedText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  openWalletBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 16,
  },
  openWalletBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#fff',
  },
  doneBtn: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
