import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Share2,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { venues, getEventForVenue } from '@/mocks/events';
import type { TicketTier } from '@/mocks/events';

const TM_API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY ?? '';

const venueSearchNames: Record<string, string> = {
  'v-001': 'Fillmore Auditorium',
  'v-002': 'Gothic Theatre',
  'v-003': 'Bluebird Theater',
  'v-004': 'Ogden Theatre',
  'v-005': 'Cervantes Masterpiece',
  'v-006': 'Summit Music Hall',
  'v-007': 'Church Nightclub',
  'v-008': 'Meow Wolf Denver',
  'v-009': 'Swallow Hill',
  'v-010': 'Oriental Theater',
};

async function fetchTMVenueImage(venueId: string): Promise<string | null> {
  const keyword = venueSearchNames[venueId];
  if (!keyword || !TM_API_KEY) return null;
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/venues.json?keyword=${encodeURIComponent(keyword)}&stateCode=CO&apikey=${TM_API_KEY}&size=3`;
    console.log('[TM] Fetching venue image for:', keyword);
    const res = await fetch(url);
    const data = await res.json();
    const tmVenues = data?._embedded?.venues ?? [];
    for (const v of tmVenues) {
      const images = v?.images ?? [];
      if (images.length > 0) {
        const best = images.reduce((a: any, b: any) => ((b.width ?? 0) > (a.width ?? 0) ? b : a), images[0]);
        console.log('[TM] Found image for', keyword, ':', best.url, `(${best.width}x${best.height})`);
        if ((best.width ?? 0) >= 400) {
          return best.url;
        }
        console.log('[TM] Image too small, using fallback for', keyword);
        return null;
      }
    }
    console.log('[TM] No images found for', keyword);
    return null;
  } catch (e) {
    console.log('[TM] Error fetching venue image:', e);
    return null;
  }
}



export default function TicketingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [selectedVenueId, setSelectedVenueId] = useState<string>(venues[0].id);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [tmVenueImages, setTmVenueImages] = useState<Record<string, string>>({});


  const pulseAnim = useRef(new Animated.Value(1)).current;
  const vibeGlow = useRef(new Animated.Value(0.6)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  const event = useMemo(() => getEventForVenue(selectedVenueId), [selectedVenueId]);

  const heroImageUri = useMemo(() => {
    const tmImage = tmVenueImages[selectedVenueId];
    if (tmImage && tmImage.length > 0) return tmImage;
    return event.heroImage;
  }, [selectedVenueId, tmVenueImages, event.heroImage]);

  const tmImageFetched = tmVenueImages[selectedVenueId] !== undefined;
  useEffect(() => {
    if (tmImageFetched) return;
    let cancelled = false;
    void fetchTMVenueImage(selectedVenueId).then(url => {
      if (cancelled) return;
      setTmVenueImages(prev => ({ ...prev, [selectedVenueId]: url ?? '' }));
    });
    return () => { cancelled = true; };
  }, [selectedVenueId, tmImageFetched]);

  const handleSelectVenue = useCallback((venueId: string) => {
    if (venueId === selectedVenueId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVenueId(venueId);
    setSelectedTier(null);
    setQuantities({});
    setSaved(false);
    setLiked(false);
    heroOpacity.setValue(0);
    contentSlide.setValue(30);
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 350, delay: 100, useNativeDriver: true }),
    ]).start();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [selectedVenueId, heroOpacity, contentSlide]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(vibeGlow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(vibeGlow, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
      ])
    );
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [heroOpacity, contentSlide, pulseAnim, vibeGlow]);

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

  const handleLike = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(l => !l);
  }, []);

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out ${event.title} at ${event.venueName}! ${event.date} ${event.time}`,
      });
    } catch (e) {
      console.log('[Ticketing] Share error:', e);
    }
  }, [event]);

  const handleDirections = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = Platform.select({
      ios: `maps://app?daddr=${event.venueLatitude},${event.venueLongitude}`,
      android: `google.navigation:q=${event.venueLatitude},${event.venueLongitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${event.venueLatitude},${event.venueLongitude}`,
    });
    if (url) void Linking.openURL(url);
  }, [event]);

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

  const heroGradientColors: [string, string, string] = isDark
    ? ['transparent', 'rgba(4, 19, 24, 0.6)', colors.background]
    : ['transparent', 'rgba(245, 248, 250, 0.6)', colors.background];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="ticketing-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.heroContainer, { opacity: heroOpacity }]}>
        <Image source={{ uri: heroImageUri }} style={styles.heroImage} />
        <LinearGradient colors={heroGradientColors} style={styles.heroGradient} />
        <View style={[styles.heroTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.heroIconBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
            testID="ticketing-back"
          >
            <ArrowLeft color={isDark ? '#fff' : '#000'} size={20} />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable
              onPress={handleLike}
              style={[styles.heroIconBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
              testID="ticketing-like"
            >
              <Heart color={liked ? colors.coral : (isDark ? '#fff' : '#000')} size={20} fill={liked ? colors.coral : 'transparent'} />
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={[styles.heroIconBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
              testID="ticketing-share"
            >
              <Share2 color={isDark ? '#fff' : '#000'} size={20} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={{ height: 260 }} />

        <View style={styles.venueSelectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueScrollContent}
          >
            {venues.map(venue => (
              <VenueCard
                key={venue.id}
                venue={venue}
                selected={venue.id === selectedVenueId}
                onSelect={handleSelectVenue}
              />
            ))}
          </ScrollView>
        </View>

        <Animated.View style={{ transform: [{ translateY: contentSlide }], opacity: heroOpacity }}>
          <View style={styles.mainContent}>

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
              <Animated.View style={[
                styles.vibeScoreCard,
                { backgroundColor: isDark ? 'rgba(255, 109, 94, 0.08)' : 'rgba(224, 85, 69, 0.06)', transform: [{ scale: pulseAnim }] },
              ]}>
                <Animated.View style={{ opacity: vibeGlow }}>
                  <Zap color={energyColor} size={22} />
                </Animated.View>
                <Text style={[styles.vibeScoreNum, { color: energyColor }]}>{event.vibeScore}</Text>
                <Text style={[styles.vibeScoreLabel, { color: colors.textMuted }]}>Vibe</Text>
              </Animated.View>

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

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.hostCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              testID="host-card"
            >
              <Image source={{ uri: event.hostAvatar }} style={styles.hostAvatar} />
              <View style={styles.hostInfo}>
                <View style={styles.hostNameRow}>
                  <Text style={[styles.hostName, { color: colors.text }]}>{event.hostName}</Text>
                  {event.hostVerified && <CheckCircle2 color={colors.aqua} size={14} fill={colors.aqua} />}
                </View>
                <Text style={[styles.hostLabel, { color: colors.textMuted }]}>Organizer</Text>
              </View>
              <ChevronRight color={colors.textSoft} size={18} />
            </Pressable>

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
                    <Pressable
                      key={guest.id}
                      onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      style={[styles.lineupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Image source={{ uri: guest.avatar }} style={styles.lineupAvatar} />
                      <Text style={[styles.lineupName, { color: colors.text }]}>{guest.name}</Text>
                      <Text style={[styles.lineupRole, { color: colors.textMuted }]}>{guest.role}</Text>
                    </Pressable>
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
                  testID="directions-btn"
                >
                  <Navigation color={isDark ? colors.background : '#fff'} size={16} />
                  <Text style={[styles.mapActionText, { color: isDark ? colors.background : '#fff' }]}>Directions</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={[styles.mapActionBtnOutline, { borderColor: colors.border, backgroundColor: saved ? (isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)') : 'transparent' }]}
                  testID="save-event-btn"
                >
                  <Bookmark color={saved ? colors.aqua : colors.textMuted} size={16} fill={saved ? colors.aqua : 'transparent'} />
                  <Text style={[styles.mapActionOutlineText, { color: saved ? colors.aqua : colors.textMuted }]}>{saved ? 'Saved' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>

          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? 'rgba(4,19,24,0.95)' : 'rgba(245,248,250,0.95)', borderTopColor: colors.border }]}>
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
          testID="get-tickets-btn"
        >
          <Ticket color={isDark ? colors.background : '#fff'} size={18} />
          <Text style={[styles.stickyBtnText, { color: isDark ? colors.background : '#fff' }]}>Get Tickets</Text>
        </Pressable>
      </View>
    </View>
  );
}

const VenueCard = React.memo(function VenueCard({
  venue,
  selected,
  onSelect,
}: {
  venue: (typeof venues)[number];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const energyColor = venue.energyType === 'pulze' ? colors.coral : venue.energyType === 'moderate' ? colors.amber : colors.quiet;

  return (
    <Pressable
      onPress={() => onSelect(venue.id)}
      style={({ pressed }) => [
        styles.venueCard,
        {
          backgroundColor: selected
            ? (isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.1)')
            : colors.surface,
          borderColor: selected ? colors.aqua : (isDark ? 'rgba(123, 220, 219, 0.35)' : 'rgba(11, 35, 44, 0.2)'),
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      testID={`venue-${venue.id}`}
    >
      <Image source={{ uri: venue.image }} style={styles.venueCardImage} />
      <View style={styles.venueCardInfo}>
        <Text
          style={[styles.venueCardName, { color: selected ? colors.aqua : colors.text }]}
          numberOfLines={1}
        >
          {venue.shortName}
        </Text>
        <View style={styles.venueCardVibeRow}>
          <View style={[styles.venueCardVibeDot, { backgroundColor: energyColor }]} />
          <Text style={[styles.venueCardVibeScore, { color: colors.textMuted }]}>{venue.vibeScore}</Text>
        </View>
      </View>
      {selected && (
        <View style={[styles.venueSelectedIndicator, { backgroundColor: colors.aqua }]} />
      )}
    </Pressable>
  );
});

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
      testID={`tier-${tier.id}`}
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
              testID={`qty-minus-${tier.id}`}
            >
              <Minus color={colors.textMuted} size={16} />
            </Pressable>
            <Text style={[styles.qtyValue, { color: colors.text }]}>{quantity || 1}</Text>
            <Pressable
              onPress={() => onQuantityChange(tier.id, 1)}
              style={[styles.qtyBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              testID={`qty-plus-${tier.id}`}
            >
              <Plus color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  venueSelectorContainer: {
    marginBottom: 8,
  },
  venueScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  venueCard: {
    width: 115,
    alignItems: 'center',
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    overflow: 'hidden' as const,
  },
  venueCardImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  venueCardInfo: {
    marginTop: 6,
    alignItems: 'center',
    gap: 3,
  },
  venueCardName: {
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  venueCardVibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueCardVibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  venueCardVibeScore: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  venueSelectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2.5,
    borderRadius: 2,
  },
});
