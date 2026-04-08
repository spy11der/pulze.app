import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  Ticket,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { getEventForVenue } from '@/mocks/events';

export default function TicketingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId: string }>();

  const venueId = params.venueId ?? 'v-001';
  const event = useMemo(() => getEventForVenue(venueId), [venueId]);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const sortedTiers = useMemo(() => {
    return [...event.ticketTiers]
      .filter(t => !t.soldOut)
      .sort((a, b) => a.price - b.price);
  }, [event.ticketTiers]);

  const soldOutTiers = useMemo(() => {
    return [...event.ticketTiers].filter(t => t.soldOut);
  }, [event.ticketTiers]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  const handleSelectTier = useCallback((tierId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(prev => prev === tierId ? null : tierId);
    if (!quantities[tierId]) {
      setQuantities(prev => ({ ...prev, [tierId]: 1 }));
    }
  }, [quantities]);

  const handleQuantityChange = useCallback((tierId: string, delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantities(prev => {
      const current = prev[tierId] ?? 1;
      const next = Math.max(1, Math.min(current + delta, 10));
      return { ...prev, [tierId]: next };
    });
  }, []);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const tier = selectedTier ?? sortedTiers[0]?.id;
    if (!tier) return;
    const qty = quantities[tier] || 1;
    router.push({
      pathname: '/checkout',
      params: {
        eventId: event.id,
        tierId: tier,
        quantity: String(qty),
      },
    });
  }, [selectedTier, quantities, event, router, sortedTiers]);

  const selectedTierData = useMemo(() => {
    if (!selectedTier) return null;
    return event.ticketTiers.find(t => t.id === selectedTier) ?? null;
  }, [selectedTier, event]);

  const stickyTotal = useMemo(() => {
    if (!selectedTierData) return 0;
    return selectedTierData.price * (quantities[selectedTierData.id] ?? 1);
  }, [selectedTierData, quantities]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="ticketing-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
          testID="ticketing-back"
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Select Tickets</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>{event.title}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <View style={[styles.eventSummary, { backgroundColor: isDark ? 'rgba(53,212,207,0.05)' : 'rgba(26,168,163,0.04)', borderColor: colors.border }]}>
            <View style={styles.eventSummaryRow}>
              <Ticket color={colors.aqua} size={16} />
              <View style={styles.eventSummaryText}>
                <Text style={[styles.eventSummaryName, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                <Text style={[styles.eventSummaryMeta, { color: colors.textMuted }]}>
                  {event.date} · {event.time}
                </Text>
                <Text style={[styles.eventSummaryVenue, { color: colors.textMuted }]}>{event.venueName}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {sortedTiers.length} option{sortedTiers.length !== 1 ? 's' : ''} available
          </Text>

          <View style={[styles.ticketList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sortedTiers.map((tier, idx) => {
              const isSelected = selectedTier === tier.id;
              const qty = quantities[tier.id] ?? 1;

              return (
                <View key={tier.id}>
                  <Pressable
                    onPress={() => handleSelectTier(tier.id)}
                    style={({ pressed }) => [
                      styles.ticketRow,
                      isSelected && { backgroundColor: isDark ? 'rgba(53,212,207,0.06)' : 'rgba(26,168,163,0.04)' },
                      pressed && !isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' },
                    ]}
                    testID={`ticket-option-${tier.id}`}
                  >
                    <View style={styles.ticketRowRadio}>
                      <View style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? colors.aqua : colors.textSoft },
                      ]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.aqua }]} />}
                      </View>
                    </View>

                    <View style={styles.ticketRowInfo}>
                      <Text style={[styles.ticketName, { color: colors.text }]}>{tier.name}</Text>
                      {tier.perks.length > 0 && (
                        <Text style={[styles.ticketDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {tier.perks[0]}
                        </Text>
                      )}
                    </View>

                    <Text style={[styles.ticketPrice, { color: isSelected ? colors.aqua : colors.text }]}>
                      ${tier.price}
                    </Text>
                  </Pressable>

                  {isSelected && (
                    <View style={[styles.quantityRow, { borderTopColor: colors.border }]}>
                      <Text style={[styles.quantityLabel, { color: colors.textMuted }]}>Quantity</Text>
                      <View style={styles.quantityControls}>
                        <Pressable
                          onPress={() => handleQuantityChange(tier.id, -1)}
                          style={[styles.qtyBtn, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            opacity: qty <= 1 ? 0.4 : 1,
                          }]}
                          disabled={qty <= 1}
                          testID={`qty-minus-${tier.id}`}
                        >
                          <Minus color={colors.textMuted} size={14} />
                        </Pressable>
                        <Text style={[styles.qtyValue, { color: colors.text }]}>{qty}</Text>
                        <Pressable
                          onPress={() => handleQuantityChange(tier.id, 1)}
                          style={[styles.qtyBtn, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            opacity: qty >= 10 ? 0.4 : 1,
                          }]}
                          disabled={qty >= 10}
                          testID={`qty-plus-${tier.id}`}
                        >
                          <Plus color={colors.textMuted} size={14} />
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {idx < sortedTiers.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>

          {soldOutTiers.length > 0 && (
            <View style={styles.soldOutSection}>
              <Text style={[styles.soldOutLabel, { color: colors.textSoft }]}>Sold out</Text>
              {soldOutTiers.map((tier) => (
                <View
                  key={tier.id}
                  style={[styles.soldOutRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}
                >
                  <View style={styles.ticketRowInfo}>
                    <Text style={[styles.ticketName, { color: colors.textSoft }]}>{tier.name}</Text>
                  </View>
                  <Text style={[styles.soldOutBadge, { color: colors.textSoft }]}>Sold out</Text>
                </View>
              ))}
            </View>
          )}

          {selectedTierData && selectedTierData.perks.length > 0 && (
            <View style={[styles.perksCard, { backgroundColor: isDark ? 'rgba(53,212,207,0.04)' : 'rgba(26,168,163,0.03)', borderColor: colors.border }]}>
              <Text style={[styles.perksTitle, { color: colors.text }]}>What's included</Text>
              {selectedTierData.perks.map((perk, idx) => (
                <View key={idx} style={styles.perkRow}>
                  <CheckCircle2 color={colors.aqua} size={14} />
                  <Text style={[styles.perkText, { color: colors.textMuted }]}>{perk}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.stickyBottom, {
        paddingBottom: insets.bottom + 8,
        backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)',
        borderTopColor: colors.border,
      }]}>
        <View style={styles.stickyInfo}>
          {selectedTierData ? (
            <>
              <Text style={[styles.stickyPrice, { color: colors.text }]}>${stickyTotal}</Text>
              <Text style={[styles.stickyMeta, { color: colors.textMuted }]}>
                {quantities[selectedTierData.id] ?? 1}× {selectedTierData.name}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.stickyPrice, { color: colors.text }]}>
                From ${sortedTiers.length > 0 ? sortedTiers[0].price : 0}
              </Text>
              <Text style={[styles.stickyMeta, { color: colors.textMuted }]}>Select a ticket</Text>
            </>
          )}
        </View>
        <Pressable
          onPress={handleContinue}
          disabled={!selectedTier && sortedTiers.length === 0}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              backgroundColor: colors.aqua,
              opacity: (!selectedTier && sortedTiers.length === 0) ? 0.5 : (pressed ? 0.9 : 1),
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          testID="continue-to-checkout"
        >
          <Text style={[styles.continueBtnText, { color: isDark ? colors.background : '#fff' }]}>Continue</Text>
          <ChevronRight color={isDark ? colors.background : '#fff'} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  headerSub: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  eventSummary: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  eventSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventSummaryText: {
    flex: 1,
    gap: 3,
  },
  eventSummaryName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  eventSummaryMeta: {
    fontSize: 13,
  },
  eventSummaryVenue: {
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  ticketList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  ticketRowRadio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ticketRowInfo: {
    flex: 1,
    gap: 3,
  },
  ticketName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  ticketDesc: {
    fontSize: 13,
  },
  ticketPrice: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 52,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    minWidth: 20,
    textAlign: 'center' as const,
  },
  rowDivider: {
    height: 1,
    marginLeft: 52,
  },
  soldOutSection: {
    gap: 8,
  },
  soldOutLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  soldOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  soldOutBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  perksCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  perksTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkText: {
    fontSize: 14,
    flex: 1,
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  stickyInfo: {
    gap: 2,
    flex: 1,
  },
  stickyPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  stickyMeta: {
    fontSize: 13,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
