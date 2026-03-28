import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Minus,
  Navigation,
  Plus,

  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { sampleEvent, artistListings } from '@/mocks/events';
import type { TicketTier, ArtistListing } from '@/mocks/events';
import { DirectionsSheet } from '@/components/DirectionsSheet';

export default function TicketsTab() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<boolean>(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  const event = sampleEvent;

  const trendingArtists = useMemo(() => artistListings.filter(a => a.trending), []);
  const allArtists = useMemo(() => artistListings, []);

  const handleArtistTap = useCallback((artist: ArtistListing) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/ticketing', params: { venueId: artist.venueId } });
  }, [router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, contentSlide]);

  const handleQuantityChange = useCallback((tierId: string, delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantities(prev => {
      const current = prev[tierId] ?? 0;
      const next = Math.max(0, Math.min(current + delta, 10));
      return { ...prev, [tierId]: next };
    });
  }, []);

  const handleSelectTier = useCallback((tierId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTier(prev => prev === tierId ? null : tierId);
    if (!quantities[tierId]) {
      setQuantities(prev => ({ ...prev, [tierId]: 1 }));
    }
  }, [quantities]);

  const handleSave = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved(s => !s);
  }, []);

  const [directionsVisible, setDirectionsVisible] = useState<boolean>(false);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, []);

  const handleGetTickets = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const tier = selectedTier ?? event.ticketTiers.find(t => !t.soldOut)?.id;
    const qty = tier ? (quantities[tier] || 1) : 1;
    router.push({
      pathname: '/checkout',
      params: {
        eventId: event.id,
        tierId: tier ?? '',
        quantity: String(qty),
      },
    });
  }, [selectedTier, quantities, event, router]);

  const selectedTierData = useMemo(() => {
    if (!selectedTier) return null;
    return event.ticketTiers.find(t => t.id === selectedTier) ?? null;
  }, [selectedTier, event]);

  const stickyTotal = useMemo(() => {
    if (!selectedTierData) return 0;
    return selectedTierData.price * (quantities[selectedTierData.id] ?? 1);
  }, [selectedTierData, quantities]);

  const energyColor = event.energyType === 'pulze' ? colors.coral : event.energyType === 'moderate' ? colors.amber : colors.quiet;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="tickets-tab-screen">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 260, paddingTop: insets.top + 12 }]}
      >
        <Animated.View style={{ transform: [{ translateY: contentSlide }], opacity: heroOpacity }}>
          <View style={styles.mainContent}>

            <View style={styles.sectionBlock}>
              <View style={styles.artistSectionHeader}>
                <View style={styles.artistSectionTitleRow}>
                  <Zap color={colors.coral} size={18} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Hot Right Now</Text>
                </View>
                <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>Trending artists selling fast</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScrollContent}>
                {trendingArtists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} onPress={handleArtistTap} variant="featured" />
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.artistSectionHeader}>
                <View style={styles.artistSectionTitleRow}>
                  <Ticket color={colors.aqua} size={18} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>All Events</Text>
                </View>
                <Text style={[styles.artistSectionSub, { color: colors.textMuted }]}>{allArtists.length} shows in your city</Text>
              </View>
              <View style={styles.artistGrid}>
                {allArtists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} onPress={handleArtistTap} variant="compact" />
                ))}
              </View>
            </View>

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            <View style={styles.featuredEventHeader}>
              <Star color={colors.amber} size={16} fill={colors.amber} />
              <Text style={[styles.featuredEventLabel, { color: colors.amber }]}>Featured Event</Text>
            </View>

            <View style={styles.tagsRow}>
              {event.tags.map(tag => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.1)' : 'rgba(26, 168, 163, 0.08)' }]}>
                  <Text style={[styles.tagText, { color: colors.aqua }]}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
            <Text style={[styles.eventTagline, { color: colors.textMuted }]}>{event.tagline}</Text>

            <View style={[styles.quickInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.quickInfoRow}>
                <Calendar color={colors.aqua} size={18} />
                <View style={styles.quickInfoText}>
                  <Text style={[styles.quickInfoLabel, { color: colors.text }]}>{event.date}</Text>
                  <Text style={[styles.quickInfoSub, { color: colors.textMuted }]}>{event.time}</Text>
                </View>
              </View>
              <View style={[styles.quickInfoDivider, { backgroundColor: colors.border }]} />
              <View style={styles.quickInfoRow}>
                <MapPin color={colors.aqua} size={18} />
                <View style={styles.quickInfoText}>
                  <Text style={[styles.quickInfoLabel, { color: colors.text }]}>{event.venueName}</Text>
                  <Text style={[styles.quickInfoSub, { color: colors.textMuted }]}>{event.venueAddress}</Text>
                </View>
              </View>
              <View style={[styles.quickInfoDivider, { backgroundColor: colors.border }]} />
              <View style={styles.quickInfoRow}>
                <Clock color={colors.aqua} size={18} />
                <View style={styles.quickInfoText}>
                  <Text style={[styles.quickInfoLabel, { color: colors.text }]}>Doors open {event.doorsOpen}</Text>
                  <Text style={[styles.quickInfoSub, { color: colors.textMuted }]}>{event.distanceFromUser}</Text>
                </View>
              </View>
            </View>

            <View style={styles.liveStatsRow}>
              <View style={[
                styles.vibeScoreCard,
                { backgroundColor: isDark ? 'rgba(232, 86, 74, 0.08)' : 'rgba(204, 68, 56, 0.05)' },
              ]}>
                <Zap color={energyColor} size={20} />
                <Text style={[styles.vibeScoreNum, { color: energyColor }]}>{event.vibeScore}</Text>
                <Text style={[styles.vibeScoreLabel, { color: colors.textMuted }]}>Vibe</Text>
              </View>

              <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.08)' : 'rgba(92, 168, 48, 0.06)' }]}>
                <Users color={colors.lime} size={18} />
                <Text style={[styles.statMiniNum, { color: colors.text }]}>{event.attendingCount}</Text>
                <Text style={[styles.statMiniLabel, { color: colors.textMuted }]}>Going</Text>
              </View>

              <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(255, 191, 71, 0.08)' : 'rgba(204, 142, 0, 0.06)' }]}>
                <Heart color={colors.amber} size={18} />
                <Text style={[styles.statMiniNum, { color: colors.text }]}>{event.interestedCount}</Text>
                <Text style={[styles.statMiniLabel, { color: colors.textMuted }]}>Interested</Text>
              </View>
            </View>

            <View style={[styles.energyBanner, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.06)' : 'rgba(26, 168, 163, 0.05)' }]}>
              <View style={styles.energyBannerLeft}>
                <TrendingUp color={colors.aqua} size={16} />
                <Text style={[styles.energyBannerText, { color: colors.text }]}>
                  {event.energyType === 'pulze' ? 'High Pulze Energy' : event.energyType === 'moderate' ? 'Moderate Energy' : 'Quiet Atmosphere'}
                </Text>
              </View>
              <View style={styles.energyDots}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.energyDot,
                      {
                        backgroundColor: i <= (event.energyType === 'pulze' ? 5 : event.energyType === 'moderate' ? 3 : 1)
                          ? energyColor
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {event.friendsGoing.length > 0 && (
              <View style={[styles.friendsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.friendsHeader}>
                  <Sparkles color={colors.aqua} size={16} />
                  <Text style={[styles.friendsTitle, { color: colors.text }]}>From your network</Text>
                </View>
                <View style={styles.friendsAvatarRow}>
                  {event.friendsGoing.slice(0, 5).map((friend, idx) => (
                    <View key={friend.id} style={[styles.friendAvatarWrap, { marginLeft: idx > 0 ? -10 : 0, zIndex: 5 - idx }]}>
                      <Image source={{ uri: friend.avatar }} style={[styles.friendAvatar, { borderColor: colors.background }]} />
                    </View>
                  ))}
                  <Text style={[styles.friendsCount, { color: colors.textMuted }]}>
                    {event.friendsGoing.length} friends going
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[styles.hostCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              testID="tickets-host-card"
            >
              <Image source={{ uri: event.hostAvatar }} style={styles.hostAvatar} />
              <View style={styles.hostInfo}>
                <View style={styles.hostNameRow}>
                  <Text style={[styles.hostName, { color: colors.text }]}>{event.hostName}</Text>
                  {event.hostVerified && <CheckCircle2 color={colors.aqua} size={14} fill={colors.aqua} />}
                </View>
                <Text style={[styles.hostLabel, { color: colors.textMuted }]}>Organizer</Text>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{event.description}</Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What to expect</Text>
              {event.whatToExpect.map((item, idx) => (
                <View key={idx} style={styles.expectRow}>
                  <View style={[styles.expectDot, { backgroundColor: colors.aqua }]} />
                  <Text style={[styles.expectText, { color: colors.text }]}>{item}</Text>
                </View>
              ))}
            </View>

            {event.lineup.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Lineup</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineupScroll}>
                  {event.lineup.map(guest => (
                    <View
                      key={guest.id}
                      style={[styles.lineupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Image source={{ uri: guest.avatar }} style={styles.lineupAvatar} />
                      <Text style={[styles.lineupName, { color: colors.text }]}>{guest.name}</Text>
                      <Text style={[styles.lineupRole, { color: colors.textMuted }]}>{guest.role}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={[styles.pulzeInsightCard, { backgroundColor: isDark ? '#0F2A34' : '#E4F0F4' }]}>
              <View style={styles.insightHeader}>
                <Sparkles color={colors.aqua} size={16} />
                <Text style={[styles.insightTitle, { color: colors.aqua }]}>Pulze Insights</Text>
              </View>
              <View style={styles.insightRow}>
                <Clock color={colors.textMuted} size={14} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightLabel, { color: colors.text }]}>Best time to arrive</Text>
                  <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.bestTimeToArrive}</Text>
                </View>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.insightRow}>
                <TrendingUp color={colors.textMuted} size={14} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightLabel, { color: colors.text }]}>Current vibe around venue</Text>
                  <Text style={[styles.insightValue, { color: colors.textMuted }]}>{event.currentVibeAround}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tickets</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Select a tier to continue</Text>
            </View>

            {event.ticketTiers.map(tier => (
              <TicketTierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                quantity={quantities[tier.id] ?? 0}
                onSelect={handleSelectTier}
                onQuantityChange={handleQuantityChange}
              />
            ))}

            <View style={[styles.mapPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.mapPreviewTitle, { color: colors.text }]}>Venue Location</Text>
              <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
                <MapPin color={colors.aqua} size={32} />
                <Text style={[styles.mapPlaceholderText, { color: colors.textMuted }]}>{event.venueName}</Text>
                <Text style={[styles.mapPlaceholderAddr, { color: colors.textSoft }]}>{event.venueAddress}</Text>
              </View>
              <View style={styles.mapActionsRow}>
                <Pressable
                  onPress={handleDirections}
                  style={[styles.mapActionBtn, { backgroundColor: colors.aqua }]}
                  testID="tickets-directions-btn"
                >
                  <Navigation color={isDark ? colors.background : '#fff'} size={16} />
                  <Text style={[styles.mapActionText, { color: isDark ? colors.background : '#fff' }]}>Get there now</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={[styles.mapActionBtnOutline, { borderColor: colors.border, backgroundColor: saved ? (isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)') : 'transparent' }]}
                  testID="tickets-save-btn"
                >
                  <Bookmark color={saved ? colors.aqua : colors.textMuted} size={16} fill={saved ? colors.aqua : 'transparent'} />
                  <Text style={[styles.mapActionOutlineText, { color: saved ? colors.aqua : colors.textMuted }]}>{saved ? 'Saved' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>

          </View>
        </Animated.View>
      </ScrollView>

      <DirectionsSheet
        visible={directionsVisible}
        onClose={() => setDirectionsVisible(false)}
        latitude={event.venueLatitude}
        longitude={event.venueLongitude}
        address={event.venueAddress}
        name={event.venueName}
      />

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 90, backgroundColor: isDark ? 'rgba(4,19,24,0.97)' : 'rgba(245,248,250,0.97)', borderTopColor: colors.border }]}>
        <View style={styles.stickyInfo}>
          {selectedTierData ? (
            <>
              <Text style={[styles.stickyPrice, { color: colors.text }]}>${stickyTotal}</Text>
              <Text style={[styles.stickyMeta, { color: colors.textMuted }]}>
                {quantities[selectedTierData.id] ?? 1}x {selectedTierData.name}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.stickyPrice, { color: colors.text }]}>From ${Math.min(...event.ticketTiers.filter(t => !t.soldOut).map(t => t.price))}</Text>
              <Text style={[styles.stickyMeta, { color: colors.textMuted }]}>per ticket</Text>
            </>
          )}
        </View>
        <Pressable
          onPress={handleGetTickets}
          style={({ pressed }) => [
            styles.stickyBtn,
            { backgroundColor: colors.aqua, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
          testID="tickets-get-btn"
        >
          <Ticket color={isDark ? colors.background : '#fff'} size={18} />
          <Text style={[styles.stickyBtnText, { color: isDark ? colors.background : '#fff' }]}>Lock in spot</Text>
        </Pressable>
      </View>
    </View>
  );
}

const TicketTierCard = React.memo(function TicketTierCard({
  tier,
  selected,
  quantity,
  onSelect,
  onQuantityChange,
}: {
  tier: TicketTier;
  selected: boolean;
  quantity: number;
  onSelect: (id: string) => void;
  onQuantityChange: (id: string, delta: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const lowStock = !tier.soldOut && tier.available <= 15 && tier.available > 0;

  return (
    <Pressable
      onPress={() => !tier.soldOut && onSelect(tier.id)}
      style={({ pressed }) => [
        styles.tierCard,
        {
          backgroundColor: selected ? (isDark ? 'rgba(53, 212, 207, 0.08)' : 'rgba(26, 168, 163, 0.06)') : colors.surface,
          borderColor: selected ? colors.aqua : colors.border,
          opacity: tier.soldOut ? 0.5 : (pressed ? 0.95 : 1),
        },
      ]}
      disabled={tier.soldOut}
      testID={`tickets-tier-${tier.id}`}
    >
      <View style={styles.tierTop}>
        <View style={styles.tierNameRow}>
          <Text style={[styles.tierName, { color: tier.soldOut ? colors.textSoft : colors.text }]}>{tier.name}</Text>
          {tier.tag && !tier.soldOut && (
            <View style={[styles.tierTag, { backgroundColor: tier.tag === 'Best Value' ? (isDark ? 'rgba(165,240,92,0.15)' : 'rgba(92,168,48,0.1)') : (isDark ? 'rgba(53,212,207,0.15)' : 'rgba(26,168,163,0.1)') }]}>
              <Star color={tier.tag === 'Best Value' ? colors.lime : colors.aqua} size={10} />
              <Text style={[styles.tierTagText, { color: tier.tag === 'Best Value' ? colors.lime : colors.aqua }]}>{tier.tag}</Text>
            </View>
          )}
        </View>
        <View style={styles.tierPriceCol}>
          <View style={styles.tierPriceRow}>
            {tier.originalPrice && !tier.soldOut && (
              <Text style={[styles.tierOrigPrice, { color: colors.textSoft }]}>${tier.originalPrice}</Text>
            )}
            <Text style={[styles.tierPrice, { color: tier.soldOut ? colors.textSoft : colors.text }]}>${tier.price}</Text>
          </View>
          {tier.soldOut && (
            <View style={[styles.soldOutBadge, { backgroundColor: isDark ? 'rgba(255,77,58,0.12)' : 'rgba(224,57,43,0.08)' }]}>
              <Text style={[styles.soldOutText, { color: colors.danger }]}>Sold Out</Text>
            </View>
          )}
          {lowStock && (
            <Text style={[styles.lowStockText, { color: colors.coral }]}>{tier.available} left</Text>
          )}
        </View>
      </View>

      <View style={styles.tierPerks}>
        {tier.perks.map((perk, idx) => (
          <View key={idx} style={styles.perkRow}>
            <CheckCircle2 color={tier.soldOut ? colors.textSoft : colors.aqua} size={13} />
            <Text style={[styles.perkText, { color: tier.soldOut ? colors.textSoft : colors.textMuted }]}>{perk}</Text>
          </View>
        ))}
      </View>

      {selected && !tier.soldOut && (
        <View style={[styles.quantityRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.quantityLabel, { color: colors.textMuted }]}>Quantity</Text>
          <View style={styles.quantityControls}>
            <Pressable
              onPress={() => onQuantityChange(tier.id, -1)}
              style={[styles.qtyBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              testID={`tickets-qty-minus-${tier.id}`}
            >
              <Minus color={colors.textMuted} size={16} />
            </Pressable>
            <Text style={[styles.qtyValue, { color: colors.text }]}>{quantity || 1}</Text>
            <Pressable
              onPress={() => onQuantityChange(tier.id, 1)}
              style={[styles.qtyBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              testID={`tickets-qty-plus-${tier.id}`}
            >
              <Plus color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
});

const ArtistCard = React.memo(function ArtistCard({
  artist,
  onPress,
  variant,
}: {
  artist: ArtistListing;
  onPress: (artist: ArtistListing) => void;
  variant: 'featured' | 'compact';
}) {
  const { colors, isDark } = useTheme();

  if (variant === 'featured') {
    return (
      <Pressable
        onPress={() => onPress(artist)}
        style={({ pressed }) => [
          styles.featuredArtistCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
        testID={`artist-featured-${artist.id}`}
      >
        <Image source={{ uri: artist.image }} style={styles.featuredArtistImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.featuredArtistGradient}
        />
        {artist.sellingFast && (
          <View style={[styles.sellingFastBadge, { backgroundColor: colors.coral }]}>
            <Zap color="#fff" size={10} />
            <Text style={styles.sellingFastText}>Selling Fast</Text>
          </View>
        )}
        <View style={styles.featuredArtistInfo}>
          <Text style={styles.featuredArtistName} numberOfLines={1}>{artist.artistName}</Text>
          <Text style={styles.featuredArtistEvent} numberOfLines={1}>{artist.eventName}</Text>
          <View style={styles.featuredArtistMeta}>
            <Text style={styles.featuredArtistVenue}>{artist.venue}</Text>
            <View style={styles.featuredArtistDot} />
            <Text style={styles.featuredArtistDate}>{artist.date}</Text>
          </View>
          <View style={styles.featuredArtistBottom}>
            <Text style={styles.featuredArtistPrice}>From ${artist.startingPrice}</Text>
            <View style={styles.soldOutBar}>
              <View style={[styles.soldOutBarFill, { width: `${artist.soldOutPercent}%`, backgroundColor: artist.soldOutPercent > 75 ? colors.coral : colors.aqua }]} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(artist)}
      style={({ pressed }) => [
        styles.compactArtistCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      testID={`artist-compact-${artist.id}`}
    >
      <Image source={{ uri: artist.image }} style={styles.compactArtistImage} />
      <View style={styles.compactArtistInfo}>
        <View style={styles.compactArtistTop}>
          <Text style={[styles.compactArtistName, { color: colors.text }]} numberOfLines={1}>{artist.artistName}</Text>
          {artist.sellingFast && (
            <View style={[styles.compactSellingFast, { backgroundColor: isDark ? 'rgba(255,109,94,0.1)' : 'rgba(224,85,69,0.06)' }]}>
              <Text style={[styles.compactSellingFastText, { color: colors.coral }]}>{artist.soldOutPercent}% sold</Text>
            </View>
          )}
          {!artist.sellingFast && artist.trending && (
            <View style={[styles.trendingBadge, { backgroundColor: isDark ? 'rgba(255,109,94,0.12)' : 'rgba(224,85,69,0.08)' }]}>
              <TrendingUp color={colors.coral} size={10} />
            </View>
          )}
        </View>
        <Text style={[styles.compactArtistEvent, { color: colors.textMuted }]} numberOfLines={1}>{artist.eventName}</Text>
        <View style={styles.compactArtistMeta}>
          <MapPin color={colors.textSoft} size={11} />
          <Text style={[styles.compactArtistVenue, { color: colors.textSoft }]}>{artist.venue}</Text>
          <View style={[styles.compactDot, { backgroundColor: colors.textSoft }]} />
          <Text style={[styles.compactArtistDate, { color: colors.textSoft }]}>{artist.date}</Text>
        </View>
        <View style={styles.compactArtistBottom}>
          <View style={[styles.genrePill, { backgroundColor: isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)' }]}>
            <Text style={[styles.genreText, { color: colors.aqua }]}>{artist.genre}</Text>
          </View>
          <Text style={[styles.compactArtistPrice, { color: colors.text }]}>${artist.startingPrice}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  heroTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  heroTitleBadgeText: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    position: 'relative',
    zIndex: 2,
  },
  mainContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  eventTagline: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: -4,
  },
  quickInfoCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
  },
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickInfoText: {
    flex: 1,
    gap: 2,
  },
  quickInfoLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickInfoSub: {
    fontSize: 13,
  },
  quickInfoDivider: {
    height: 1,
    marginLeft: 32,
  },
  liveStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vibeScoreCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  vibeScoreNum: {
    fontSize: 32,
    fontWeight: '900' as const,
  },
  vibeScoreLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  statMiniCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  statMiniNum: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statMiniLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  energyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  energyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  energyBannerText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  energyDots: {
    flexDirection: 'row',
    gap: 5,
  },
  energyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  friendsCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  friendsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatarWrap: {
    borderRadius: 18,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  friendsCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginLeft: 10,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostInfo: {
    flex: 1,
    gap: 2,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  hostLabel: {
    fontSize: 13,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  sectionSub: {
    fontSize: 14,
    marginTop: -6,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 23,
  },
  expectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 4,
  },
  expectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  expectText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  artistSectionHeader: {
    gap: 4,
  },
  artistSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artistSectionSub: {
    fontSize: 13,
    marginLeft: 26,
  },
  artistScrollContent: {
    gap: 12,
    paddingRight: 4,
    paddingTop: 4,
  },
  featuredArtistCard: {
    width: 200,
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  featuredArtistImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredArtistGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  sellingFastBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sellingFastText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  featuredArtistInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 3,
  },
  featuredArtistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800' as const,
  },
  featuredArtistEvent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  featuredArtistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  featuredArtistVenue: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  featuredArtistDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  featuredArtistDate: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  featuredArtistBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  featuredArtistPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800' as const,
  },
  soldOutBar: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  soldOutBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  artistGrid: {
    gap: 10,
    paddingTop: 4,
  },
  compactArtistCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactArtistImage: {
    width: 80,
    height: 96,
    resizeMode: 'cover',
  },
  compactArtistInfo: {
    flex: 1,
    padding: 12,
    gap: 3,
    justifyContent: 'center',
  },
  compactArtistTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactArtistName: {
    fontSize: 15,
    fontWeight: '800' as const,
    flex: 1,
  },
  trendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactArtistEvent: {
    fontSize: 12,
  },
  compactArtistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compactArtistVenue: {
    fontSize: 11,
  },
  compactDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  compactArtistDate: {
    fontSize: 11,
  },
  compactArtistBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genreText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  compactArtistPrice: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  compactSellingFast: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactSellingFastText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  dividerLine: {
    height: 1,
    marginVertical: 4,
  },
  featuredEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredEventLabel: {
    fontSize: 13,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  lineupScroll: {
    gap: 12,
    paddingRight: 4,
  },
  lineupCard: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    padding: 16,
    width: 120,
    borderWidth: 1,
  },
  lineupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  lineupName: {
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  lineupRole: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
  pulzeInsightCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  insightValue: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  insightDivider: {
    height: 1,
    marginLeft: 24,
  },
  tierCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tierNameRow: {
    flex: 1,
    gap: 6,
  },
  tierName: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  tierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierTagText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  tierPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierOrigPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through' as const,
  },
  tierPrice: {
    fontSize: 22,
    fontWeight: '900' as const,
  },
  soldOutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldOutText: {
    fontSize: 11,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  tierPerks: {
    gap: 8,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 13,
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    minWidth: 24,
    textAlign: 'center' as const,
  },
  mapPreviewCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
  },
  mapPreviewTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  mapPlaceholderAddr: {
    fontSize: 12,
  },
  mapActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
  },
  mapActionText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  mapActionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  mapActionOutlineText: {
    fontSize: 14,
    fontWeight: '700' as const,
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
  },
  stickyPrice: {
    fontSize: 22,
    fontWeight: '900' as const,
  },
  stickyMeta: {
    fontSize: 13,
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  stickyBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
});
