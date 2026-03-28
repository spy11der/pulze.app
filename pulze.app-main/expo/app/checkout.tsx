import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Lock,
  ShieldCheck,
  Smartphone,
  Ticket,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { hasEventbriteConfig, useTicketEvent } from '@/services/eventbrite';

type PaymentMethod = 'apple' | 'card';
type CheckoutStep = 'review' | 'processing' | 'confirmed';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string; tierId: string; quantity: string }>();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('apple');
  const [step, setStep] = useState<CheckoutStep>('review');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const { event, isError, error, isFetching, isEventbrite } = useTicketEvent(params.eventId);
  const eventbriteConfigured = hasEventbriteConfig(params.eventId);
  const checkoutUrl = event.externalCheckoutUrl ?? event.externalEventUrl;
  const isExternalCheckout = isEventbrite && Boolean(checkoutUrl);
  const tier = useMemo(() => event.ticketTiers.find(t => t.id === params.tierId) ?? event.ticketTiers[0], [params.tierId, event]);
  const quantity = useMemo(() => {
    const q = parseInt(params.quantity ?? '1', 10);
    return isNaN(q) || q < 1 ? 1 : q;
  }, [params.quantity]);

  const subtotal = tier.price * quantity;
  const serviceFee = Math.round(subtotal * event.serviceFeePercent / 100 * 100) / 100;
  const total = subtotal + serviceFee;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  const handlePurchase = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (isExternalCheckout && checkoutUrl) {
      try {
        await WebBrowser.openBrowserAsync(checkoutUrl);
      } catch {
        await Linking.openURL(checkoutUrl);
      }
      return;
    }

    setStep('processing');

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    }).start(() => {
      setStep('confirmed');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });
  }, [checkScale, checkoutUrl, isExternalCheckout, progressAnim]);

  const handleDone = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
    setTimeout(() => router.back(), 100);
  }, [router]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const checkoutStatus = useMemo(() => {
    if (isExternalCheckout) {
      return 'This purchase will finish in Eventbrite’s hosted checkout.';
    }

    if (eventbriteConfigured && isError) {
      return error instanceof Error
        ? `Eventbrite fetch failed (${error.message}). Using the local fallback checkout.`
        : 'Eventbrite fetch failed. Using the local fallback checkout.';
    }

    if (!eventbriteConfigured) {
      return 'Set Eventbrite env vars in expo/.env to turn this into a live checkout handoff.';
    }

    return 'Loading Eventbrite checkout details...';
  }, [error, eventbriteConfigured, isError, isExternalCheckout]);

  if (step === 'confirmed') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]} testID="checkout-confirmed">
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.confirmedContainer, { paddingTop: insets.top + 40 }]}>
          <Animated.View style={[styles.checkCircle, { backgroundColor: colors.aqua, transform: [{ scale: checkScale }] }]}>
            <CheckCircle2 color={isDark ? colors.background : '#fff'} size={48} />
          </Animated.View>
          <Text style={[styles.confirmedTitle, { color: colors.text }]}>You're in!</Text>
          <Text style={[styles.confirmedSub, { color: colors.textMuted }]}>
            {quantity}x {tier.name} for {event.title}
          </Text>
          <View style={[styles.confirmDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.confirmDetailRow}>
              <Text style={[styles.confirmDetailLabel, { color: colors.textMuted }]}>Event</Text>
              <Text style={[styles.confirmDetailValue, { color: colors.text }]}>{event.title}</Text>
            </View>
            <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmDetailRow}>
              <Text style={[styles.confirmDetailLabel, { color: colors.textMuted }]}>Date</Text>
              <Text style={[styles.confirmDetailValue, { color: colors.text }]}>{event.date}</Text>
            </View>
            <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmDetailRow}>
              <Text style={[styles.confirmDetailLabel, { color: colors.textMuted }]}>Venue</Text>
              <Text style={[styles.confirmDetailValue, { color: colors.text }]}>{event.venueName}</Text>
            </View>
            <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmDetailRow}>
              <Text style={[styles.confirmDetailLabel, { color: colors.textMuted }]}>Tickets</Text>
              <Text style={[styles.confirmDetailValue, { color: colors.text }]}>{quantity}x {tier.name}</Text>
            </View>
            <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmDetailRow}>
              <Text style={[styles.confirmDetailLabel, { color: colors.textMuted }]}>Total Paid</Text>
              <Text style={[styles.confirmDetailValue, { color: colors.aqua, fontWeight: '900' as const }]}>${total.toFixed(2)}</Text>
            </View>
          </View>
          <Text style={[styles.confirmNote, { color: colors.textSoft }]}>
            A confirmation email has been sent. Your tickets will appear in your Pulze profile.
          </Text>
          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1 }]}
            testID="checkout-done"
          >
            <Text style={[styles.doneBtnText, { color: isDark ? colors.background : '#fff' }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'processing') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]} testID="checkout-processing">
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.processingContainer, { paddingTop: insets.top + 80 }]}>
          <Lock color={colors.aqua} size={40} />
          <Text style={[styles.processingTitle, { color: colors.text }]}>Processing payment...</Text>
          <Text style={[styles.processingSub, { color: colors.textMuted }]}>Securing your spot</Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: colors.aqua, width: progressWidth as unknown as number }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="checkout-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.topBar, { paddingTop: insets.top + 8, opacity: fadeIn }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
          testID="checkout-back"
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Checkout</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.topBarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
          testID="checkout-close"
        >
          <X color={colors.text} size={20} />
        </Pressable>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        <Animated.View style={{ opacity: fadeIn }}>
          <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.orderHeader}>
              <Ticket color={colors.aqua} size={20} />
              <Text style={[styles.orderHeaderText, { color: colors.text }]}>Order Summary</Text>
            </View>

            <View style={[styles.orderEventRow, { backgroundColor: isDark ? 'rgba(53,212,207,0.05)' : 'rgba(26,168,163,0.04)' }]}>
              <Text style={[styles.orderEventName, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.orderEventMeta, { color: colors.textMuted }]}>{event.date} · {event.venueName}</Text>
            </View>

            <View style={styles.orderLineRow}>
              <View style={styles.orderLineLeft}>
                <Text style={[styles.orderLineLabel, { color: colors.text }]}>{tier.name}</Text>
                <Text style={[styles.orderLineSub, { color: colors.textMuted }]}>{quantity} ticket{quantity > 1 ? 's' : ''} × ${tier.price}</Text>
              </View>
              <Text style={[styles.orderLineAmount, { color: colors.text }]}>${subtotal.toFixed(2)}</Text>
            </View>

            <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />

            <View style={styles.orderLineRow}>
              <Text style={[styles.orderLineLabel, { color: colors.textMuted }]}>Service fee</Text>
              <Text style={[styles.orderLineAmount, { color: colors.textMuted }]}>${serviceFee.toFixed(2)}</Text>
            </View>

            <View style={[styles.orderTotalDivider, { backgroundColor: colors.aqua }]} />

            <View style={styles.orderLineRow}>
              <Text style={[styles.orderTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.orderTotalAmount, { color: colors.aqua }]}>${total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.integrationNotice, { backgroundColor: isDark ? 'rgba(53,212,207,0.08)' : 'rgba(26,168,163,0.06)', borderColor: colors.border }]}> 
            <View style={styles.integrationNoticeRow}>
              <ExternalLink color={colors.aqua} size={16} />
              <Text style={[styles.integrationNoticeText, { color: colors.textMuted }]}>{checkoutStatus}</Text>
            </View>
            {isFetching && eventbriteConfigured && (
              <ActivityIndicator color={colors.aqua} size="small" />
            )}
          </View>

          {isExternalCheckout ? (
            <View style={[styles.handoffCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={[styles.handoffIcon, { backgroundColor: isDark ? 'rgba(53,212,207,0.12)' : 'rgba(26,168,163,0.08)' }]}> 
                <ExternalLink color={colors.aqua} size={18} />
              </View>
              <View style={styles.handoffCopy}>
                <Text style={[styles.handoffTitle, { color: colors.text }]}>Eventbrite checkout handoff</Text>
                <Text style={[styles.handoffText, { color: colors.textMuted }]}>Ticket availability is loaded in-app, then Eventbrite handles payment and final order confirmation.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.paymentSection}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Payment Method</Text>

              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMethod('apple');
                }}
                style={[
                  styles.paymentOption,
                  {
                    backgroundColor: paymentMethod === 'apple' ? (isDark ? 'rgba(53,212,207,0.08)' : 'rgba(26,168,163,0.06)') : colors.surface,
                    borderColor: paymentMethod === 'apple' ? colors.aqua : colors.border,
                  },
                ]}
                testID="pay-apple"
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: isDark ? '#1A1A1A' : '#000' }]}> 
                  <Smartphone color="#fff" size={18} />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <Text style={[styles.paymentOptionName, { color: colors.text }]}> 
                    {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                  </Text>
                  <Text style={[styles.paymentOptionSub, { color: colors.textMuted }]}>Instant checkout</Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: paymentMethod === 'apple' ? colors.aqua : colors.textSoft }]}> 
                  {paymentMethod === 'apple' && <View style={[styles.radioInner, { backgroundColor: colors.aqua }]} />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMethod('card');
                }}
                style={[
                  styles.paymentOption,
                  {
                    backgroundColor: paymentMethod === 'card' ? (isDark ? 'rgba(53,212,207,0.08)' : 'rgba(26,168,163,0.06)') : colors.surface,
                    borderColor: paymentMethod === 'card' ? colors.aqua : colors.border,
                  },
                ]}
                testID="pay-card"
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: isDark ? 'rgba(53,212,207,0.15)' : 'rgba(26,168,163,0.1)' }]}> 
                  <CreditCard color={colors.aqua} size={18} />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <Text style={[styles.paymentOptionName, { color: colors.text }]}>Credit / Debit Card</Text>
                  <Text style={[styles.paymentOptionSub, { color: colors.textMuted }]}>Visa, Mastercard, Amex</Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: paymentMethod === 'card' ? colors.aqua : colors.textSoft }]}> 
                  {paymentMethod === 'card' && <View style={[styles.radioInner, { backgroundColor: colors.aqua }]} />}
                </View>
              </Pressable>
            </View>
          )}

          <View style={[styles.securityRow, { backgroundColor: isDark ? 'rgba(53,212,207,0.04)' : 'rgba(26,168,163,0.03)' }]}>
            <ShieldCheck color={colors.aqua} size={16} />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>
              {isExternalCheckout
                ? 'Pulze hands you off to Eventbrite for the secure hosted payment step in this POC.'
                : 'Secured with end-to-end encryption. Your payment info is never stored.'}
            </Text>
          </View>

          <View style={styles.tierPerksReview}>
            <Text style={[styles.perksReviewTitle, { color: colors.text }]}>What's included</Text>
            {tier.perks.map((perk, idx) => (
              <View key={idx} style={styles.perkReviewRow}>
                <CheckCircle2 color={colors.aqua} size={14} />
                <Text style={[styles.perkReviewText, { color: colors.textMuted }]}>{perk}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? 'rgba(4,19,24,0.96)' : 'rgba(245,248,250,0.96)', borderTopColor: colors.border }]}>
        <Pressable
          onPress={handlePurchase}
          style={({ pressed }) => [
            styles.purchaseBtn,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          testID="confirm-purchase"
        >
          <LinearGradient
            colors={isDark ? [colors.aqua, colors.aquaBright] : ['#1AA8A3', '#17C5BE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.purchaseBtnGradient}
          >
            <Lock color={isDark ? colors.background : '#fff'} size={16} />
            <Text style={[styles.purchaseBtnText, { color: isDark ? colors.background : '#fff' }]}>
              {isExternalCheckout
                ? 'Continue in Eventbrite'
                : paymentMethod === 'apple'
                ? (Platform.OS === 'ios' ? 'Pay with Apple Pay' : 'Pay with Google Pay')
                : `Pay $${total.toFixed(2)}`}
            </Text>
          </LinearGradient>
        </Pressable>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  orderCard: {
    borderRadius: 22,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderHeaderText: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  orderEventRow: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  orderEventName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  orderEventMeta: {
    fontSize: 13,
  },
  orderLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLineLeft: {
    gap: 2,
  },
  orderLineLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  orderLineSub: {
    fontSize: 13,
  },
  orderLineAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  orderDivider: {
    height: 1,
  },
  orderTotalDivider: {
    height: 2,
    borderRadius: 1,
    opacity: 0.3,
  },
  orderTotalLabel: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  orderTotalAmount: {
    fontSize: 22,
    fontWeight: '900' as const,
  },
  paymentSection: {
    gap: 12,
  },
  integrationNotice: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  integrationNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  integrationNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  handoffCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  handoffIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handoffCopy: {
    flex: 1,
    gap: 4,
  },
  handoffTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  handoffText: {
    fontSize: 13,
    lineHeight: 18,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  paymentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionInfo: {
    flex: 1,
    gap: 2,
  },
  paymentOptionName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  paymentOptionSub: {
    fontSize: 12,
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
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  securityText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  tierPerksReview: {
    gap: 10,
  },
  perksReviewTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  perkReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkReviewText: {
    fontSize: 14,
    flex: 1,
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
  purchaseBtn: {
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  purchaseBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  purchaseBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginTop: 16,
  },
  processingSub: {
    fontSize: 15,
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
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmedTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
  },
  confirmedSub: {
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  confirmDetailCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmDetailLabel: {
    fontSize: 14,
  },
  confirmDetailValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  confirmDivider: {
    height: 1,
  },
  confirmNote: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  doneBtn: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 16,
  },
  doneBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
});
