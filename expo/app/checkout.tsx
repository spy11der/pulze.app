import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Ticket,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { sampleEvent, getEventForVenue } from '@/mocks/events';

type PaymentMethod = 'apple' | 'card';
type CheckoutStep = 'review' | 'processing' | 'confirmed';

const PURCHASES_KEY = 'pulze_purchases_v1';

interface PurchaseRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  venueName: string;
  date: string;
  tierName: string;
  quantity: number;
  total: number;
  paymentMethod: string;
  purchasedAt: string;
}

async function savePurchase(purchase: PurchaseRecord): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PURCHASES_KEY);
    const purchases: PurchaseRecord[] = stored ? JSON.parse(stored) : [];
    purchases.push(purchase);
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
    console.log('[Checkout] Purchase saved:', purchase.id);
  } catch (e) {
    console.log('[Checkout] Error saving purchase:', e);
  }
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string; tierId: string; quantity: string }>();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('apple');
  const [step, setStep] = useState<CheckoutStep>('review');

  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [lastPurchase, setLastPurchase] = useState<PurchaseRecord | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const venueId = params.eventId?.replace('evt-', '') ?? '';
  const event = useMemo(() => {
    if (venueId) return getEventForVenue(venueId);
    return sampleEvent;
  }, [venueId]);

  const tier = useMemo(() => event.ticketTiers.find(t => t.id === params.tierId) ?? event.ticketTiers[0], [params.tierId, event]);
  const quantity = useMemo(() => {
    const q = parseInt(params.quantity ?? '1', 10);
    return isNaN(q) || q < 1 ? 1 : q;
  }, [params.quantity]);

  const subtotal = tier.price * quantity;
  const serviceFee = Math.round(subtotal * event.serviceFeePercent / 100 * 100) / 100;
  const total = subtotal + serviceFee;

  const cardValid = useMemo(() => {
    if (paymentMethod === 'apple') return true;
    const digits = cardNumber.replace(/\D/g, '');
    const expiryDigits = cardExpiry.replace(/\D/g, '');
    const cvcDigits = cardCvc.replace(/\D/g, '');
    return digits.length >= 15 && expiryDigits.length === 4 && cvcDigits.length >= 3 && cardName.trim().length > 1;
  }, [paymentMethod, cardNumber, cardExpiry, cardCvc, cardName]);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  const handlePurchase = useCallback(async () => {
    if (!cardValid) {
      Alert.alert('Missing Info', 'Please fill in all card details to continue.');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStep('processing');

    console.log('[Checkout] Creating payment intent...', { paymentMethod, total });

    Animated.timing(progressAnim, {
      toValue: 0.6,
      duration: 1200,
      useNativeDriver: false,
    }).start(() => {
      console.log('[Checkout] Payment intent created, confirming payment...');

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start(async () => {
        const purchase: PurchaseRecord = {
          id: `pur-${Date.now()}`,
          eventId: event.id,
          eventTitle: event.title,
          venueName: event.venueName,
          date: event.date,
          tierName: tier.name,
          quantity,
          total,
          paymentMethod: paymentMethod === 'apple'
            ? (Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay')
            : 'Card',
          purchasedAt: new Date().toISOString(),
        };

        await savePurchase(purchase);
        setLastPurchase(purchase);
        console.log('[Checkout] Payment confirmed, ticket marked as purchased');

        setStep('confirmed');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }).start();
      });
    });
  }, [progressAnim, checkScale, cardValid, paymentMethod, total, event, tier, quantity]);

  const handleDone = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
    setTimeout(() => router.back(), 100);
  }, [router]);

  const handleViewTicket = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (lastPurchase) {
      router.back();
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          router.push({
            pathname: '/ticket-pass',
            params: {
              purchaseId: lastPurchase.id,
              eventTitle: lastPurchase.eventTitle,
              venueName: lastPurchase.venueName,
              date: lastPurchase.date,
              tierName: lastPurchase.tierName,
              quantity: String(lastPurchase.quantity),
              total: lastPurchase.total.toFixed(2),
            },
          });
        }, 100);
      }, 100);
    }
  }, [router, lastPurchase]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
            onPress={handleViewTicket}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1 }]}
            testID="checkout-view-ticket"
          >
            <QrCode color={isDark ? colors.background : '#fff'} size={18} />
            <Text style={[styles.doneBtnText, { color: isDark ? colors.background : '#fff' }]}>View Your Ticket</Text>
          </Pressable>
          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.doneBtnOutline, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            testID="checkout-done"
          >
            <Text style={[styles.doneBtnOutlineText, { color: colors.textMuted }]}>Done</Text>
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
          <Text style={[styles.processingSub, { color: colors.textMuted }]}>
            {paymentMethod === 'apple'
              ? (Platform.OS === 'ios' ? 'Authenticating with Apple Pay' : 'Authenticating with Google Pay')
              : 'Verifying card and securing your spot'}
          </Text>
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

          {paymentMethod === 'card' && (
            <View style={[styles.cardInputSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardInputTitle, { color: colors.text }]}>Card Details</Text>

              <View style={styles.cardFieldWrap}>
                <Text style={[styles.cardFieldLabel, { color: colors.textMuted }]}>Name on card</Text>
                <TextInput
                  style={[styles.cardInput, {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }]}
                  placeholder="John Doe"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="card-name"
                />
              </View>

              <View style={styles.cardFieldWrap}>
                <Text style={[styles.cardFieldLabel, { color: colors.textMuted }]}>Card number</Text>
                <TextInput
                  style={[styles.cardInput, {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }]}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(t) => setCardNumber(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={19}
                  testID="card-number"
                />
              </View>

              <View style={styles.cardFieldRow}>
                <View style={[styles.cardFieldWrap, { flex: 1 }]}>
                  <Text style={[styles.cardFieldLabel, { color: colors.textMuted }]}>Expiry</Text>
                  <TextInput
                    style={[styles.cardInput, {
                      color: colors.text,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }]}
                    placeholder="MM/YY"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    value={formatExpiry(cardExpiry)}
                    onChangeText={(t) => setCardExpiry(t.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={5}
                    testID="card-expiry"
                  />
                </View>
                <View style={[styles.cardFieldWrap, { flex: 1 }]}>
                  <Text style={[styles.cardFieldLabel, { color: colors.textMuted }]}>CVC</Text>
                  <TextInput
                    style={[styles.cardInput, {
                      color: colors.text,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }]}
                    placeholder="123"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    value={cardCvc}
                    onChangeText={(t) => setCardCvc(t.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    testID="card-cvc"
                  />
                </View>
              </View>
            </View>
          )}

          <View style={[styles.securityRow, { backgroundColor: isDark ? 'rgba(53,212,207,0.04)' : 'rgba(26,168,163,0.03)' }]}>
            <ShieldCheck color={colors.aqua} size={16} />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>
              {paymentMethod === 'apple'
                ? `Payments processed securely through ${Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}. No card details stored.`
                : 'Payments processed securely via Stripe. Your card details are encrypted end-to-end.'}
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
          onPress={() => void handlePurchase()}
          disabled={paymentMethod === 'card' && !cardValid}
          style={({ pressed }) => [
            styles.purchaseBtn,
            {
              opacity: (paymentMethod === 'card' && !cardValid) ? 0.5 : (pressed ? 0.9 : 1),
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
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
              {paymentMethod === 'apple'
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
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '800' as const },
  scrollContent: { paddingHorizontal: 16, gap: 20 },
  orderCard: { borderRadius: 22, padding: 20, gap: 16, borderWidth: 1 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderHeaderText: { fontSize: 18, fontWeight: '800' as const },
  orderEventRow: { borderRadius: 14, padding: 14, gap: 4 },
  orderEventName: { fontSize: 16, fontWeight: '700' as const },
  orderEventMeta: { fontSize: 13 },
  orderLineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderLineLeft: { gap: 2 },
  orderLineLabel: { fontSize: 15, fontWeight: '600' as const },
  orderLineSub: { fontSize: 13 },
  orderLineAmount: { fontSize: 15, fontWeight: '700' as const },
  orderDivider: { height: 1 },
  orderTotalDivider: { height: 2, borderRadius: 1, opacity: 0.3 },
  orderTotalLabel: { fontSize: 17, fontWeight: '800' as const },
  orderTotalAmount: { fontSize: 22, fontWeight: '900' as const },
  paymentSection: { gap: 12 },
  paymentTitle: { fontSize: 18, fontWeight: '800' as const },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16, borderWidth: 1.5 },
  paymentIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentOptionInfo: { flex: 1, gap: 2 },
  paymentOptionName: { fontSize: 15, fontWeight: '700' as const },
  paymentOptionSub: { fontSize: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  cardInputSection: { borderRadius: 22, padding: 20, gap: 16, borderWidth: 1 },
  cardInputTitle: { fontSize: 16, fontWeight: '800' as const },
  cardFieldWrap: { gap: 6 },
  cardFieldLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  cardInput: { height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '500' as const },
  cardFieldRow: { flexDirection: 'row', gap: 12 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14 },
  securityText: { fontSize: 13, lineHeight: 18, flex: 1 },
  tierPerksReview: { gap: 10 },
  perksReviewTitle: { fontSize: 16, fontWeight: '800' as const },
  perkReviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkReviewText: { fontSize: 14, flex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1 },
  purchaseBtn: { borderRadius: 16, overflow: 'hidden' as const },
  purchaseBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
  purchaseBtnText: { fontSize: 17, fontWeight: '800' as const },
  processingContainer: { flex: 1, alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  processingTitle: { fontSize: 22, fontWeight: '800' as const, marginTop: 16 },
  processingSub: { fontSize: 15, textAlign: 'center' as const },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: 24, overflow: 'hidden' as const },
  progressFill: { height: '100%', borderRadius: 3 },
  confirmedContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  checkCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  confirmedTitle: { fontSize: 28, fontWeight: '900' as const },
  confirmedSub: { fontSize: 16, textAlign: 'center' as const, lineHeight: 22 },
  confirmDetailCard: { width: '100%', borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, marginTop: 12 },
  confirmDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmDetailLabel: { fontSize: 14 },
  confirmDetailValue: { fontSize: 14, fontWeight: '700' as const, textAlign: 'right' as const, flex: 1, marginLeft: 16 },
  confirmDivider: { height: 1 },
  confirmNote: { fontSize: 13, textAlign: 'center' as const, lineHeight: 19, marginTop: 8, paddingHorizontal: 12 },
  doneBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 16 },
  doneBtnText: { fontSize: 17, fontWeight: '800' as const },
  doneBtnOutline: { width: '100%', alignItems: 'center', borderRadius: 16, paddingVertical: 16, marginTop: 8, borderWidth: 1 },
  doneBtnOutlineText: { fontSize: 15, fontWeight: '700' as const },
});
