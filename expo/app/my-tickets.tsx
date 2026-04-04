import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Ticket,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';

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

export default function MyTicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isVerified } = useAgeVerification();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const purchasesQuery = useQuery({
    queryKey: ['purchases'],
    queryFn: async (): Promise<PurchaseRecord[]> => {
      const stored = await AsyncStorage.getItem(PURCHASES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PurchaseRecord[];
        console.log('[MyTickets] Loaded', parsed.length, 'purchases');
        return parsed.reverse();
      }
      return [];
    },
  });

  const purchases = useMemo(() => purchasesQuery.data ?? [], [purchasesQuery.data]);

  const handleOpenPass = useCallback((purchase: PurchaseRecord) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/ticket-pass',
      params: {
        purchaseId: purchase.id,
        eventTitle: purchase.eventTitle,
        venueName: purchase.venueName,
        date: purchase.date,
        tierName: purchase.tierName,
        quantity: String(purchase.quantity),
        total: purchase.total.toFixed(2),
      },
    });
  }, [router]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const formatPurchaseDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const renderTicketCard = useCallback(({ item, index }: { item: PurchaseRecord; index: number }) => {
    return (
      <TicketCard
        purchase={item}
        index={index}
        onPress={handleOpenPass}
        formatDate={formatPurchaseDate}
        isVerified={isVerified}
      />
    );
  }, [handleOpenPass, formatPurchaseDate, isVerified]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="my-tickets-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          testID="my-tickets-back"
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Tickets</Text>
          {purchases.length > 0 && (
            <Text style={[styles.headerCount, { color: colors.textMuted }]}>
              {purchases.length} ticket{purchases.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        {purchases.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.08)' : 'rgba(26, 158, 153, 0.06)' }]}>
              <Ticket color={colors.aqua} size={40} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tickets yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Your purchased event tickets will appear here as scannable passes.
            </Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/tickets');
              }}
              style={({ pressed }) => [styles.browseBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
            >
              <Ticket color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.browseBtnText, { color: isDark ? colors.background : '#fff' }]}>Browse Events</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={purchases}
            renderItem={renderTicketCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </Animated.View>
    </View>
  );
}

const TicketCard = React.memo(function TicketCard({
  purchase,
  index,
  onPress,
  formatDate,
  isVerified,
}: {
  purchase: PurchaseRecord;
  index: number;
  onPress: (p: PurchaseRecord) => void;
  formatDate: (iso: string) => string;
  isVerified: boolean;
}) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim, index]);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
      <Pressable
        onPress={() => onPress(purchase)}
        style={({ pressed }) => [
          styles.ticketCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        testID={`ticket-card-${purchase.id}`}
      >
        <View style={[styles.ticketCardLeft, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.08)' : 'rgba(26, 158, 153, 0.06)' }]}>
          <Ticket color={colors.aqua} size={24} />
          {isVerified && (
            <View style={[styles.miniVerifiedBadge, { backgroundColor: colors.lime + '20' }]}>
              <ShieldCheck color={colors.lime} size={10} />
            </View>
          )}
        </View>

        <View style={styles.ticketCardBody}>
          <Text style={[styles.ticketCardTitle, { color: colors.text }]} numberOfLines={1}>
            {purchase.eventTitle}
          </Text>
          <View style={styles.ticketCardMeta}>
            <Calendar color={colors.textSoft} size={12} />
            <Text style={[styles.ticketCardMetaText, { color: colors.textMuted }]}>{purchase.date}</Text>
          </View>
          <View style={styles.ticketCardMeta}>
            <MapPin color={colors.textSoft} size={12} />
            <Text style={[styles.ticketCardMetaText, { color: colors.textMuted }]}>{purchase.venueName}</Text>
          </View>
          <View style={styles.ticketCardFooter}>
            <View style={[styles.ticketQtyBadge, { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.1)' : 'rgba(26, 158, 153, 0.07)' }]}>
              <Text style={[styles.ticketQtyText, { color: colors.aqua }]}>
                {purchase.quantity}x {purchase.tierName}
              </Text>
            </View>
            <Text style={[styles.ticketPurchaseDate, { color: colors.textSoft }]}>
              {formatDate(purchase.purchasedAt)}
            </Text>
          </View>
        </View>

        <ChevronRight color={colors.textSoft} size={16} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  browseBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  ticketCardLeft: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCardBody: {
    flex: 1,
    gap: 4,
  },
  ticketCardTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  ticketCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketCardMetaText: {
    fontSize: 13,
  },
  ticketCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ticketQtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketQtyText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  ticketPurchaseDate: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
