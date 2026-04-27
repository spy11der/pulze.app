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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useEventDetail } from '@/hooks/useEvents';
import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';

interface ZoneTier {
  id: string;
  name: string;
  price: number;
  perks: string[];
  available: number;
  total: number;
  soldOut: boolean;
  tag?: string;
}

function useEventListings(eventId: string | null | undefined) {
  return useQuery<ZoneTier[]>({
    queryKey: ['event-listings', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('listings')
        .select('zone, section, quantity, quantity_start, price, active')
        .eq('event_id', eventId);
      if (error) throw error;

      const groups = new Map<string, { prices: number[]; available: number; total: number }>();
      for (const l of data ?? []) {
        const zone = (l.zone ?? l.section ?? 'General').toString();
        const key = zone;
        const g = groups.get(key) ?? { prices: [], available: 0, total: 0 };
        if (typeof l.price === 'number' && l.price > 0) g.prices.push(l.price);
        if (l.active) g.available += l.quantity ?? 0;
        g.total += l.quantity_start ?? l.quantity ?? 0;
        groups.set(key, g);
      }

      const tiers: ZoneTier[] = Array.from(groups.entries())
        .filter(([, g]) => g.prices.length > 0)
        .map(([zone, g]) => {
          const minPrice = Math.min(...g.prices);
          const maxPrice = Math.max(...g.prices);
          const total = Math.max(g.total, g.available);
          const soldOut = g.available === 0;
          return {
            id: zone.toLowerCase().replace(/\s+/g, '-'),
            name: zone,
            price: Math.round(minPrice),
            perks: [
              minPrice === maxPrice ? `Flat $${Math.round(minPrice)}` : `Range $${Math.round(minPrice)}–$${Math.round(maxPrice)}`,
              `${g.available.toLocaleString()} available`,
            ],
            available: g.available,
            total,
            soldOut,
            tag: !soldOut && g.available <= 10 ? 'Almost Gone' : undefined,
          };
        })
        .sort((a, b) => a.price - b.price);

      return tiers;
    },
    staleTime: 60 * 1000,
  });
}

export default function TicketingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();

  const eventId = params.eventId ?? null;
  const { data: event, isLoading: eventLoading, error: eventError } = useEventDetail(eventId);
  const { data: listingTiers, isLoading: listingsLoading } = useEventListings(eventId);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const fallbackTiers = useMemo<ZoneTier[]>(() => {
    if (!event) return [];
    const minPrice = event.minPrice ?? null;
    const maxPrice = event.maxPrice ?? null;
    if (minPrice === null) {
      return [{
        id: 'external',
        name: 'See available tickets',
        price: 0,
        perks: ['Continue to source for live pricing'],
        available: 1,
        total: 1,
        soldOut: false,
      }];
    }
    const tiers: ZoneTier[] = [{
      id: 'starting',
      name: 'Starting price',
      price: Math.round(minPrice),
      perks: ['Lowest available ticket', 'Continue to source for full options'],
      available: event.activeListings || 1,
      total: event.activeListings || 1,
      soldOut: false,
      tag: event.isHot ? 'Almost Gone' : undefined,
    }];
    if (maxPrice !== null && Math.round(maxPrice) > Math.round(minPrice)) {
      tiers.push({
        id: 'top',
        name: 'Premium',
        price: Math.round(maxPrice),
        perks: ['Top price tier from current listings'],
        available: 1,
        total: 1,
        soldOut: false,
      });
    }
    return tiers;
  }, [event]);

  const tiers = useMemo<ZoneTier[]>(() => {
    if (listingTiers && listingTiers.length > 0) return listingTiers;
    return fallbackTiers;
  }, [listingTiers, fallbackTiers]);

  const sortedTiers = useMemo(() => tiers.filter(t => !t.soldOut).sort((a, b) => a.price - b.price), [tiers]);
  const soldOutTiers = useMemo(() => tiers.filter(t => t.soldOut), [tiers]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
    ]).start();
  }, [fadeIn, slideUp]);

  const handleSelectTier = useCallback((tierId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(prev => prev === tierId ? null : tierId);
    if (!quantities[tierId]) {
      setQuantities(prev => ({ ...prev, [tierId]: 1 }));
    }
  }, [quantities]);

  const handleToggleExpand = useCallback((tierId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedTier(prev => prev === tierId ? null : tierId);
  }, []);

  const handleQuantityChange = useCallback((tierId: string, delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantities(prev => {
      const current = prev[tierId] ?? 1;
      const next = Math.max(1, Math.min(current + delta, 10));
      return { ...prev, [tierId]: next };
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (!event) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const tierId = selectedTier ?? sortedTiers[0]?.id;
    const tier = tiers.find(t => t.id === tierId);
    const qty = tierId ? quantities[tierId] || 1 : 1;
    const url = event.url ?? `https://www.ticketmaster.com/search?q=${encodeURIComponent(event.name)}`;

    try {
      const PURCHASES_KEY = 'pulze_purchases_v1';
      const existing = await AsyncStorage.getItem(PURCHASES_KEY);
      const list: unknown[] = existing ? JSON.parse(existing) : [];
      const record = {
        id: Date.now().toString(),
        eventId: event.id,
        eventTitle: event.name,
        venueName: event.venue_name,
        date: event.start_date_time,
        tierName: tier?.name ?? 'General',
        quantity: qty,
        total: (tier?.price ?? 0) * qty,
        paymentMethod: event.source,
        purchasedAt: new Date().toISOString(),
        source: event.source,
      };
      const updated = [...list, record];
      await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(updated));
      console.log('[ticketing] saved purchase', record);
    } catch (err) {
      console.error('[ticketing] failed to persist purchase', err);
    }

    Linking.openURL(url).catch((err) => console.error('[ticketing] failed to open url', err));
  }, [selectedTier, quantities, event, sortedTiers, tiers]);

  const selectedTierData = useMemo(() => {
    if (!selectedTier) return null;
    return tiers.find(t => t.id === selectedTier) ?? null;
  }, [selectedTier, tiers]);

  const stickyTotal = useMemo(() => {
    if (!selectedTierData) return 0;
    return selectedTierData.price * (quantities[selectedTierData.id] ?? 1);
  }, [selectedTierData, quantities]);

  const bestValueId = sortedTiers.length > 0 ? sortedTiers[0].id : null;
  const isLoading = eventLoading || listingsLoading;

  const sourceLabel = event?.source === 'ticketmaster' ? 'Ticketmaster' : event?.source === 'seatdata' ? 'SeatData' : 'partner';

  if (eventLoading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]} testID="ticketing-loading">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.aqua} size="large" />
      </View>
    );
  }

  if (eventError || !event) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]} testID="ticketing-error">
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Event not available</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.errorBtn, { backgroundColor: colors.aqua }]}
        >
          <Text style={[styles.errorBtnText, { color: isDark ? colors.background : '#fff' }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const dateObj = new Date(event.start_date_time);
  const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="ticketing-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.headerBackBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          testID="ticketing-back"
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Select Tickets</Text>
        </View>
        <View style={styles.headerBackBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          <View style={[styles.flightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.flightCardRow}>
              <View style={[styles.flightIconWrap, { backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(26,158,153,0.06)' }]}>
                <Ticket color={colors.aqua} size={18} />
              </View>
              <View style={styles.flightCardInfo}>
                <Text style={[styles.flightCardTitle, { color: colors.text }]} numberOfLines={1}>{event.name}</Text>
                <Text style={[styles.flightCardVenue, { color: colors.textMuted }]} numberOfLines={1}>
                  {event.venue_name ?? 'Venue TBA'}{event.venue_city ? ` · ${event.venue_city}` : ''}
                </Text>
              </View>
            </View>
            <View style={[styles.flightMetaRow, { borderTopColor: colors.border }]}>
              <View style={styles.flightMetaItem}>
                <Calendar color={colors.textSoft} size={13} />
                <Text style={[styles.flightMetaText, { color: colors.textMuted }]}>{dateStr}</Text>
              </View>
              <View style={[styles.flightMetaDot, { backgroundColor: colors.textSoft }]} />
              <View style={styles.flightMetaItem}>
                <Clock color={colors.textSoft} size={13} />
                <Text style={[styles.flightMetaText, { color: colors.textMuted }]}>{timeStr}</Text>
              </View>
              {event.capacity ? (
                <>
                  <View style={[styles.flightMetaDot, { backgroundColor: colors.textSoft }]} />
                  <View style={styles.flightMetaItem}>
                    <Users color={colors.textSoft} size={13} />
                    <Text style={[styles.flightMetaText, { color: colors.textMuted }]}>{event.capacity.toLocaleString()} cap</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeaderText, { color: colors.text }]}>Available tickets</Text>
            <Text style={[styles.sectionHeaderCount, { color: colors.textSoft }]}>
              {sortedTiers.length} option{sortedTiers.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {isLoading && sortedTiers.length === 0 ? (
            <View style={styles.loadingTiers}>
              <ActivityIndicator color={colors.aqua} />
            </View>
          ) : null}

          <View style={styles.tiersList}>
            {sortedTiers.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const isExpanded = expandedTier === tier.id;
              const isBestValue = tier.id === bestValueId;
              const qty = quantities[tier.id] ?? 1;

              return (
                <View
                  key={tier.id}
                  style={[
                    styles.tierCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.aqua : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  {isBestValue && tier.price > 0 && (
                    <View style={[styles.bestValueStrip, { backgroundColor: colors.aqua }]}>
                      <Text style={[styles.bestValueText, { color: isDark ? colors.background : '#fff' }]}>Lowest price</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => handleSelectTier(tier.id)}
                    style={({ pressed }) => [
                      styles.tierMainRow,
                      isBestValue && tier.price > 0 && styles.tierMainRowWithStrip,
                      pressed && { opacity: 0.8 },
                    ]}
                    testID={`ticket-option-${tier.id}`}
                  >
                    <View style={styles.tierRadioCol}>
                      <View style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? colors.aqua : colors.textSoft },
                      ]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.aqua }]} />}
                      </View>
                    </View>

                    <View style={styles.tierInfoCol}>
                      <View style={styles.tierNameRow}>
                        <Text style={[styles.tierName, { color: colors.text }]} numberOfLines={1}>{tier.name}</Text>
                        <View style={[styles.tmBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.tmBadgeText, { color: colors.textSoft }]}>{sourceLabel}</Text>
                        </View>
                      </View>
                      {tier.perks.length > 0 && (
                        <Text style={[styles.tierSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                          {tier.perks[0]}
                        </Text>
                      )}
                      {tier.available <= 20 && tier.available > 0 && tier.available !== tier.total && (
                        <View style={styles.lowStockRow}>
                          <Users color={colors.amber} size={11} />
                          <Text style={[styles.lowStockText, { color: colors.amber }]}>
                            {tier.available} remaining
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.tierPriceCol}>
                      <Text style={[styles.tierPrice, { color: isSelected ? colors.aqua : colors.text }]}>
                        {tier.price > 0 ? `$${tier.price}` : 'See on site'}
                      </Text>
                      {tier.price > 0 ? (
                        <Text style={[styles.tierPricePer, { color: colors.textSoft }]}>per ticket</Text>
                      ) : null}
                    </View>
                  </Pressable>

                  {isSelected && tier.price > 0 && (
                    <View style={[styles.tierSelectedSection, { borderTopColor: colors.border }]}>
                      <View style={styles.qtyRow}>
                        <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>Tickets</Text>
                        <View style={styles.qtyControls}>
                          <Pressable
                            onPress={() => handleQuantityChange(tier.id, -1)}
                            style={[styles.qtyBtn, {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              opacity: qty <= 1 ? 0.35 : 1,
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
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              opacity: qty >= 10 ? 0.35 : 1,
                            }]}
                            disabled={qty >= 10}
                            testID={`qty-plus-${tier.id}`}
                          >
                            <Plus color={colors.textMuted} size={14} />
                          </Pressable>
                        </View>
                      </View>

                      {tier.perks.length > 1 && (
                        <Pressable
                          onPress={() => handleToggleExpand(tier.id)}
                          style={styles.detailsToggle}
                        >
                          <Text style={[styles.detailsToggleText, { color: colors.aqua }]}>
                            {isExpanded ? 'Hide details' : 'View details'}
                          </Text>
                          {isExpanded ? (
                            <ChevronUp color={colors.aqua} size={14} />
                          ) : (
                            <ChevronDown color={colors.aqua} size={14} />
                          )}
                        </Pressable>
                      )}

                      {isExpanded && tier.perks.length > 0 && (
                        <View style={styles.perksSection}>
                          {tier.perks.map((perk, pIdx) => (
                            <View key={pIdx} style={styles.perkRow}>
                              <CheckCircle2 color={colors.aqua} size={13} />
                              <Text style={[styles.perkText, { color: colors.textMuted }]}>{perk}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {soldOutTiers.length > 0 && (
            <View style={styles.soldOutSection}>
              <Text style={[styles.soldOutHeader, { color: colors.textSoft }]}>Unavailable</Text>
              {soldOutTiers.map((tier) => (
                <View
                  key={tier.id}
                  style={[styles.soldOutRow, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderColor: colors.border,
                  }]}
                >
                  <Text style={[styles.soldOutName, { color: colors.textSoft }]}>{tier.name}</Text>
                  <View style={[styles.soldOutPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.soldOutPillText, { color: colors.textSoft }]}>Sold out</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sourceDisclaimer, { color: colors.textSoft }]}>
            Prices and availability sourced from {sourceLabel}. Final pricing and fees set on the seller&apos;s site.
          </Text>

        </Animated.View>
      </ScrollView>

      <View style={[styles.stickyBottom, {
        paddingBottom: insets.bottom + 10,
        backgroundColor: isDark ? 'rgba(6,15,19,0.97)' : 'rgba(246,248,250,0.97)',
        borderTopColor: colors.border,
      }]}>
        <View style={styles.stickyLeft}>
          {selectedTierData && selectedTierData.price > 0 ? (
            <>
              <Text style={[styles.stickyTotal, { color: colors.text }]}>
                ${stickyTotal}
              </Text>
              <Text style={[styles.stickyDetail, { color: colors.textMuted }]}>
                {quantities[selectedTierData.id] ?? 1}× {selectedTierData.name}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.stickyTotal, { color: colors.text }]}>
                {sortedTiers[0]?.price ? `From $${sortedTiers[0].price}` : 'Live pricing'}
              </Text>
              <Text style={[styles.stickyDetail, { color: colors.textMuted }]}>
                {sortedTiers.length > 0 ? 'Select a ticket above' : 'Continue to source'}
              </Text>
            </>
          )}
        </View>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              backgroundColor: colors.aqua,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          testID="continue-to-checkout"
        >
          <ExternalLink color={isDark ? colors.background : '#fff'} size={16} />
          <Text style={[styles.continueBtnText, { color: isDark ? colors.background : '#fff' }]} numberOfLines={1}>
            Get tickets
          </Text>
          <ChevronRight color={isDark ? colors.background : '#fff'} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700' as const },
  errorBtn: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
  errorBtnText: { fontSize: 14, fontWeight: '700' as const },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  scrollContent: { paddingTop: 16, gap: 0 },
  flightCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  flightCardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  flightIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flightCardInfo: { flex: 1, gap: 2 },
  flightCardTitle: { fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.2 },
  flightCardVenue: { fontSize: 13 },
  flightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
    flexWrap: 'wrap',
  },
  flightMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flightMetaText: { fontSize: 12 },
  flightMetaDot: { width: 3, height: 3, borderRadius: 1.5 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHeaderText: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.2 },
  sectionHeaderCount: { fontSize: 13, fontWeight: '500' as const },
  tiersList: { paddingHorizontal: 16, gap: 10 },
  loadingTiers: { paddingVertical: 30, alignItems: 'center' },
  sourceDisclaimer: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 18,
    lineHeight: 15,
  },
  tierCard: { borderRadius: 14, overflow: 'hidden' },
  bestValueStrip: { paddingVertical: 5, paddingHorizontal: 14, alignItems: 'center' },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  tierMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  tierMainRowWithStrip: { paddingTop: 12 },
  tierRadioCol: { width: 24, alignItems: 'center', justifyContent: 'center' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  tierInfoCol: { flex: 1, gap: 3 },
  tierName: { fontSize: 15, fontWeight: '700' as const, flexShrink: 1 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tmBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tmBadgeText: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.2 },
  tierSubtext: { fontSize: 13, lineHeight: 18 },
  lowStockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lowStockText: { fontSize: 11, fontWeight: '600' as const },
  tierPriceCol: { alignItems: 'flex-end', gap: 1 },
  tierPrice: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  tierPricePer: { fontSize: 10, fontWeight: '500' as const },
  tierSelectedSection: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontSize: 14, fontWeight: '600' as const },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qtyValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    minWidth: 22,
    textAlign: 'center' as const,
  },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  detailsToggleText: { fontSize: 13, fontWeight: '600' as const },
  perksSection: { gap: 8, paddingTop: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontSize: 13, flex: 1, lineHeight: 18 },
  soldOutSection: { paddingHorizontal: 16, marginTop: 20, gap: 8 },
  soldOutHeader: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  soldOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  soldOutName: { fontSize: 14, fontWeight: '600' as const },
  soldOutPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  soldOutPillText: { fontSize: 11, fontWeight: '600' as const },
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
  stickyLeft: { flex: 1, gap: 2, marginRight: 12 },
  stickyTotal: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  stickyDetail: { fontSize: 13 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  continueBtnText: { fontSize: 15, fontWeight: '700' as const },
});
