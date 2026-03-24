import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Compass, Database, Eye, Flame, Info, MapPinned, Radio, SlidersHorizontal, Ticket, Trash2, X, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { feedFilters, vibeStories } from '@/mocks/city';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import type { SavedVibe } from '@/services/database';

type FeedMode = 'everyone' | 'friends' | 'my_vibes';

const VIBE_DESCRIPTIONS: Record<string, string> = {
  'Packed and rowdy': 'High crowd density with loud, lively energy. Expect movement, noise, and a party atmosphere.',
  'Electric anticipation': 'Something big is about to happen. The crowd is building and excitement is in the air.',
  'Creative and social': 'A blend of artistic energy and friendly conversation. Great for meeting people and soaking in culture.',
  'Calm glow': 'Peaceful and serene. Low energy but warm — perfect for unwinding or a quiet moment.',
  'Buzzing and weird': 'Offbeat and alive. Expect the unexpected — art, sounds, and people doing their own thing.',
  'Quiet before the storm': 'Calm now, but about to erupt. Early arrivals setting the stage for a big night ahead.',
};

function getVibeColor(vibe: string): string {
  if (vibe.toLowerCase().includes('packed') || vibe.toLowerCase().includes('rowdy')) return '#FF6D5E';
  if (vibe.toLowerCase().includes('electric') || vibe.toLowerCase().includes('anticipation')) return '#FFBF47';
  if (vibe.toLowerCase().includes('creative') || vibe.toLowerCase().includes('social')) return '#A5F05C';
  if (vibe.toLowerCase().includes('calm') || vibe.toLowerCase().includes('glow')) return '#67F2E5';
  if (vibe.toLowerCase().includes('buzzing') || vibe.toLowerCase().includes('weird')) return '#F56AC5';
  if (vibe.toLowerCase().includes('quiet') || vibe.toLowerCase().includes('storm')) return '#7EC8E3';
  return '#35D4CF';
}

type FilterId = (typeof feedFilters)[number]['id'];

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [feedMode, setFeedMode] = useState<FeedMode>('everyone');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const glowAnim = useRef<Animated.Value>(new Animated.Value(0.8)).current;
  const livePulse = useRef<Animated.Value>(new Animated.Value(1)).current;
  const vibeScale = useRef<Animated.Value>(new Animated.Value(1)).current;
  const vibeOpacity = useRef<Animated.Value>(new Animated.Value(0.6)).current;

  const { vibes, removeVibe, vibeCount } = useData();
  const router = useRouter();
  const [vibeModalVisible, setVibeModalVisible] = useState<boolean>(false);
  const [vibeModalScore, setVibeModalScore] = useState<number>(0);
  const [vibeModalVenue, setVibeModalVenue] = useState<string>('');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();

    const liveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    liveLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(vibeScale, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(vibeOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(vibeScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(vibeOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.start();

    return () => {
      loop.stop();
      liveLoop.stop();
      pulseLoop.stop();
    };
  }, [glowAnim, livePulse, vibeScale, vibeOpacity]);

  const filteredStories = useMemo(() => {
    console.log('Filtering feed stories', { feedMode, activeFilter });
    if (feedMode === 'my_vibes') return [];
    return vibeStories.filter((story) => {
      if (feedMode === 'friends' && story.privacy !== 'friends') return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'friends') return story.privacy === 'friends';
      if (activeFilter === 'quiet') return story.pace === 'quiet';
      if (activeFilter === 'busy') return story.pace === 'busy' || story.pace === 'packed';
      if (activeFilter === 'events') return story.tags.includes('music') || story.tags.includes('dj');
      return true;
    });
  }, [activeFilter, feedMode]);

  const liveAverage = useMemo(() => {
    if (feedMode === 'my_vibes') {
      if (vibes.length === 0) return 0;
      const total = vibes.reduce((sum, v) => sum + v.energy, 0);
      return Math.round(total / vibes.length);
    }
    if (filteredStories.length === 0) return 0;
    const total = filteredStories.reduce((sum, story) => sum + story.intensity, 0);
    return Math.round(total / filteredStories.length);
  }, [filteredStories, feedMode, vibes]);

  const signalCount = feedMode === 'my_vibes' ? vibeCount : filteredStories.length;

  const handleDeleteVibe = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeVibe(id);
  }, [removeVibe]);

  const handleLiveBadgePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/map');
  }, [router]);

  const handleMomentPillPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/map');
  }, [router]);

  const handleStoryPress = useCallback((storyId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/map');
    console.log('[Feed] Story pressed, navigating to map', { storyId });
  }, [router]);

  const handleVibePress = useCallback((storyId: string, intensity: number, venue: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVibeModalScore(intensity);
    setVibeModalVenue(venue);
    setVibeModalVisible(true);
    console.log('[Feed] Vibe score pressed, showing explanation', { storyId, intensity });
  }, []);

  const handleSignalPress = useCallback((storyId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[Feed] Media signal pressed, opening source details', { storyId });
  }, []);

  const heroGradient: [string, string] = isDark
    ? ['#09232B', '#041318']
    : ['#E8F4F8', '#DCE9EF'];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="feed-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={heroGradient} style={[styles.hero, { borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.aqua }]}>Pulze</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>The city, right now.</Text>
            </View>
            <Pressable onPress={handleLiveBadgePress} testID="live-badge-btn">
              <Animated.View style={[styles.liveBadgeOuter, { transform: [{ scale: livePulse }] }]}>
                <Animated.View style={[styles.liveBadge, { backgroundColor: colors.aquaBright, opacity: glowAnim }]}>
                  <Radio color={isDark ? colors.background : '#fff'} size={12} />
                  <Text style={[styles.liveBadgeText, { color: isDark ? colors.background : '#fff' }]}>Live</Text>
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.heroStats}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{liveAverage}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>energy</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{signalCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{feedMode === 'my_vibes' ? 'vibes' : 'signals'}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.1)' : 'rgba(92, 168, 48, 0.08)' }]}>
              <Text style={[styles.statHighlight, { color: colors.lime }]}>Rooftops</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>best tonight</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.modeRow}>
          {([
            { id: 'everyone' as FeedMode, label: 'Everyone', icon: Eye },
            { id: 'friends' as FeedMode, label: 'Friends', icon: Compass },
            { id: 'my_vibes' as FeedMode, label: 'My Vibes', icon: Database },
          ]).map((m) => {
            const active = feedMode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setFeedMode(m.id)}
                style={[
                  styles.modeButton,
                  { backgroundColor: active ? colors.aqua : colors.surface, borderColor: active ? colors.aqua : colors.border },
                ]}
                testID={`feed-mode-${m.id}`}
              >
                <m.icon color={active ? (isDark ? colors.background : '#fff') : colors.textMuted} size={16} />
                <Text style={[styles.modeText, { color: active ? (isDark ? colors.background : '#fff') : colors.textMuted }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {feedMode !== 'my_vibes' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} testID="feed-filters">
            {feedFilters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: active ? colors.aqua : colors.surface, borderColor: active ? colors.aqua : colors.border },
                  ]}
                  testID={`filter-${filter.id}`}
                >
                  <SlidersHorizontal color={active ? (isDark ? colors.background : '#fff') : colors.aqua} size={14} />
                  <Text style={[styles.filterText, { color: active ? (isDark ? colors.background : '#fff') : colors.text }]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {feedMode !== 'my_vibes' && (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/ticketing');
            }}
            style={({ pressed }) => [styles.eventPromoCard, { backgroundColor: isDark ? '#112030' : '#E2ECF4' }, pressed && styles.cardPressed]}
            testID="event-promo-card"
          >
            <View style={styles.eventPromoTop}>
              <View style={[styles.eventPromoIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.1)' }]}>
                <Ticket color={colors.aqua} size={18} />
              </View>
              <View style={[styles.eventPromoBadge, { backgroundColor: isDark ? 'rgba(255, 109, 94, 0.14)' : 'rgba(224, 85, 69, 0.1)' }]}>
                <Text style={[styles.eventPromoBadgeText, { color: colors.coral }]}>Tonight</Text>
              </View>
            </View>
            <Text style={[styles.eventPromoTitle, { color: colors.text }]}>Neon Drift: Rooftop After Dark</Text>
            <Text style={[styles.eventPromoMeta, { color: colors.textMuted }]}>Mica Rooftop · 9 PM · From $25</Text>
          </Pressable>
        )}

        {feedMode !== 'my_vibes' && (
          <Pressable
            onPress={handleMomentPillPress}
            style={({ pressed }) => [styles.momentCard, { backgroundColor: isDark ? '#102E38' : '#E0F0F5' }, pressed && styles.cardPressed]}
            testID="moment-card"
          >
            <View style={styles.momentHeader}>
              <Text style={[styles.momentTitle, { color: colors.text }]}>Right now nearby</Text>
              <Text style={[styles.momentCaption, { color: colors.textMuted }]}>Best match for a busy and alive pace</Text>
            </View>
            <View style={styles.momentBody}>
              <View style={[styles.momentPill, { backgroundColor: isDark ? 'rgba(255, 109, 94, 0.12)' : 'rgba(224, 85, 69, 0.1)' }]}>
                <Flame color={colors.coral} size={14} />
                <Text style={[styles.momentPillText, { color: colors.coral }]}>Mica Rooftop peaking</Text>
              </View>
              <Text style={[styles.momentText, { color: colors.text }]}>Strongest energy spike in the last 15 minutes. If you want momentum, go now.</Text>
            </View>
          </Pressable>
        )}

        {feedMode === 'my_vibes' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your saved vibes</Text>
              <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>Stored locally on your device</Text>
            </View>
            {vibes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Database color={colors.textSoft} size={32} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No vibes yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Drop your first vibe from the post tab and it will appear here.</Text>
              </View>
            ) : (
              vibes.map((vibe) => (
                <SavedVibeCard
                  key={vibe.id}
                  vibe={vibe}
                  vibeScale={vibeScale}
                  vibeOpacity={vibeOpacity}
                  onDelete={handleDeleteVibe}
                />
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Neighborhood feed</Text>
              <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>Adjusts around where you are</Text>
            </View>
            {filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                vibeScale={vibeScale}
                vibeOpacity={vibeOpacity}
                onPress={() => handleStoryPress(story.id)}
                onVibePress={() => handleVibePress(story.id, story.intensity, story.venue)}
                onSignalPress={() => handleSignalPress(story.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <VibeScoreModal
        visible={vibeModalVisible}
        score={vibeModalScore}
        venue={vibeModalVenue}
        onClose={() => setVibeModalVisible(false)}
      />
    </View>
  );
}

const VibeChip = React.memo(function VibeChip({ vibe }: { vibe: string }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState<boolean>(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const vibeColor = getVibeColor(vibe);
  const description = VIBE_DESCRIPTIONS[vibe] ?? 'A unique energy that defines this spot right now.';

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !expanded;
    setExpanded(next);
    Animated.parallel([
      Animated.spring(glowAnim, { toValue: next ? 1 : 0, friction: 8, tension: 60, useNativeDriver: false }),
      Animated.spring(heightAnim, { toValue: next ? 1 : 0, friction: 8, tension: 60, useNativeDriver: false }),
    ]).start();
  }, [expanded, glowAnim, heightAnim]);

  const glowBg = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? colors.card : colors.card, vibeColor + '28'],
  });
  const glowBorder = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', vibeColor + '60'],
  });
  const descHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });
  const descOpacity = heightAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.vibeChipWrapper}>
      <Pressable onPress={handlePress} testID={`vibe-chip-${vibe}`}>
        <Animated.View
          style={[
            styles.metaChip,
            {
              backgroundColor: glowBg,
              borderColor: glowBorder,
              borderWidth: 1,
            },
          ]}
        >
          <Radio color={expanded ? vibeColor : colors.aqua} size={14} />
          <Text style={[styles.metaChipText, { color: expanded ? vibeColor : colors.text }]}>{vibe}</Text>
          <Info color={expanded ? vibeColor : colors.textSoft} size={12} />
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.vibeDescBox, { maxHeight: descHeight, opacity: descOpacity, borderLeftColor: vibeColor }]}>
        <Text style={[styles.vibeDescText, { color: colors.textMuted }]}>{description}</Text>
      </Animated.View>
    </View>
  );
});

const StoryCard = React.memo(function StoryCard({
  story,
  vibeScale,
  vibeOpacity,
  onPress,
  onVibePress,
  onSignalPress,
}: {
  story: (typeof vibeStories)[number];
  vibeScale: Animated.Value;
  vibeOpacity: Animated.Value;
  onPress: () => void;
  onVibePress: () => void;
  onSignalPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={`story-${story.id}`}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.cardPressed]}
        testID={`story-body-${story.id}`}
      >
        <View style={styles.storyTop}>
          <View style={styles.storyHeading}>
            <Text style={[styles.storyTitle, { color: colors.text }]}>{story.title}</Text>
            <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{story.venue} · {story.neighborhood}</Text>
          </View>
          <Pressable
            onPress={onVibePress}
            hitSlop={8}
            style={({ pressed }) => [styles.vibeBadgeContainer, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
            testID={`story-vibe-${story.id}`}
          >
            <Animated.View style={[styles.vibePulseRing, { transform: [{ scale: vibeScale }], opacity: vibeOpacity }]} />
            <View style={[styles.storyIntensityBadge, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.1)' }]}>
              <Text style={[styles.storyIntensityText, { color: colors.aqua }]}>{story.intensity}</Text>
            </View>
          </Pressable>
        </View>
        <Text style={[styles.storySummary, { color: colors.text }]}>{story.summary}</Text>
        <View style={styles.rowWrap}>
          <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
            <MapPinned color={colors.aqua} size={14} />
            <Text style={[styles.metaChipText, { color: colors.text }]}>{story.distance}</Text>
          </View>
          <VibeChip vibe={story.vibe} />
          <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
            <Text style={[styles.metaChipText, { color: colors.text }]}>{story.privacy === 'friends' ? 'Friends details' : 'Public vibe'}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onSignalPress}
        style={({ pressed }) => [styles.signalCard, { backgroundColor: isDark ? '#123642' : '#E0F0F5' }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        testID={`story-signal-${story.id}`}
      >
        <Text style={[styles.signalLabel, { color: colors.aqua }]}>Media signal</Text>
        <Text style={[styles.signalText, { color: colors.textMuted }]}>{story.mediaLabel}</Text>
      </Pressable>
    </View>
  );
});

const SavedVibeCard = React.memo(function SavedVibeCard({
  vibe,
  vibeScale,
  vibeOpacity,
  onDelete,
}: {
  vibe: SavedVibe;
  vibeScale: Animated.Value;
  vibeOpacity: Animated.Value;
  onDelete: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const privacyLabel = vibe.privacy === 'public' ? 'Public vibe' : vibe.privacy === 'friends' ? 'Friends only' : 'Private';
  const privacyColor = vibe.privacy === 'public' ? colors.aqua : vibe.privacy === 'friends' ? colors.lime : colors.amber;

  return (
    <View style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} testID={`saved-vibe-${vibe.id}`}>
      <View style={styles.storyTop}>
        <View style={styles.storyHeading}>
          <Text style={[styles.storyTitle, { color: colors.text }]}>{vibe.vibeLabel}</Text>
          <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{vibe.venue} · {vibe.neighborhood}</Text>
        </View>
        <View style={styles.vibeBadgeContainer}>
          <Animated.View style={[styles.vibePulseRing, { transform: [{ scale: vibeScale }], opacity: vibeOpacity }]} />
          <View style={[styles.storyIntensityBadge, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.1)' }]}>
            <Text style={[styles.storyIntensityText, { color: colors.aqua }]}>{vibe.energy}</Text>
          </View>
        </View>
      </View>
      {vibe.caption ? <Text style={[styles.storySummary, { color: colors.text }]}>{vibe.caption}</Text> : null}
      <View style={styles.rowWrap}>
        <View style={[styles.metaChip, { backgroundColor: privacyColor + '1A' }]}>
          <Text style={[styles.metaChipText, { color: privacyColor }]}>{privacyLabel}</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
          <Database color={colors.aqua} size={14} />
          <Text style={[styles.metaChipText, { color: colors.text }]}>Local</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
          <Text style={[styles.metaChipText, { color: colors.text }]}>{formatTimeAgo(vibe.createdAt)}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => onDelete(vibe.id)}
        style={[styles.deleteRow, { backgroundColor: isDark ? 'rgba(255, 109, 94, 0.1)' : 'rgba(224, 85, 69, 0.08)' }]}
        testID={`delete-vibe-${vibe.id}`}
      >
        <Trash2 color={colors.coral} size={14} />
        <Text style={[styles.deleteText, { color: colors.coral }]}>Delete vibe</Text>
      </Pressable>
    </View>
  );
});

function getVibeLabel(score: number): { label: string; color: string; description: string } {
  if (score >= 80) return { label: 'On Fire', color: '#FF4D3A', description: 'This place is absolutely electric right now. Maximum energy, packed crowds, and non-stop movement.' };
  if (score >= 60) return { label: 'Buzzing', color: '#FFAA2E', description: 'High energy and social. Expect lively conversations, active crowds, and a strong pulse.' };
  if (score >= 40) return { label: 'Lively', color: '#E8D544', description: 'A nice balance of energy. Enough going on to feel alive, but not overwhelming.' };
  if (score >= 20) return { label: 'Chill', color: '#5BE89E', description: 'Relaxed and easy-going. Great for unwinding, casual hangouts, or a quiet drink.' };
  return { label: 'Quiet', color: '#4DB8E8', description: 'Peaceful and calm. Ideal for focus, reading, or escaping the noise.' };
}

const VIBE_TIERS = [
  { min: 80, max: 100, label: 'On Fire', color: '#FF4D3A', icon: Flame },
  { min: 60, max: 79, label: 'Buzzing', color: '#FFAA2E', icon: Zap },
  { min: 40, max: 59, label: 'Lively', color: '#E8D544', icon: Radio },
  { min: 20, max: 39, label: 'Chill', color: '#5BE89E', icon: Compass },
  { min: 0, max: 19, label: 'Quiet', color: '#4DB8E8', icon: Eye },
];

function VibeScoreModal({
  visible,
  score,
  venue,
  onClose,
}: {
  visible: boolean;
  score: number;
  venue: string;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const vibe = getVibeLabel(score);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [scaleAnim, opacityAnim, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID="vibe-score-modal">
      <Pressable style={vibeModalStyles.backdrop} onPress={handleClose}>
        <Animated.View
          style={[
            vibeModalStyles.container,
            {
              backgroundColor: isDark ? '#0B232C' : '#fff',
              borderColor: isDark ? 'rgba(123,220,219,0.18)' : 'rgba(0,0,0,0.08)',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Pressable onPress={handleClose} style={[vibeModalStyles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <X color={colors.textMuted} size={16} />
          </Pressable>

          <View style={[vibeModalStyles.scoreCircle, { borderColor: vibe.color }]}>
            <Text style={[vibeModalStyles.scoreText, { color: vibe.color }]}>{score}</Text>
          </View>

          <Text style={[vibeModalStyles.label, { color: vibe.color }]}>{vibe.label}</Text>
          <Text style={[vibeModalStyles.venue, { color: colors.textMuted }]}>{venue}</Text>
          <Text style={[vibeModalStyles.description, { color: colors.text }]}>{vibe.description}</Text>

          <View style={[vibeModalStyles.divider, { backgroundColor: colors.border }]} />

          <Text style={[vibeModalStyles.scaleTitle, { color: colors.textMuted }]}>VIBE SCALE</Text>
          <View style={vibeModalStyles.tierList}>
            {VIBE_TIERS.map((tier) => {
              const isActive = score >= tier.min && score <= tier.max;
              const TierIcon = tier.icon;
              return (
                <View
                  key={tier.label}
                  style={[
                    vibeModalStyles.tierRow,
                    {
                      backgroundColor: isActive
                        ? (isDark ? tier.color + '18' : tier.color + '12')
                        : 'transparent',
                      borderColor: isActive ? tier.color + '40' : 'transparent',
                    },
                  ]}
                >
                  <TierIcon color={isActive ? tier.color : colors.textSoft} size={14} />
                  <Text style={[vibeModalStyles.tierLabel, { color: isActive ? tier.color : colors.textSoft }]}>{tier.label}</Text>
                  <Text style={[vibeModalStyles.tierRange, { color: isActive ? tier.color : colors.textSoft }]}>{tier.min}–{tier.max}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const vibeModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '900' as const,
  },
  label: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  venue: {
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  scaleTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tierList: {
    width: '100%',
    gap: 4,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
  },
  tierRange: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  content: {
    padding: 12,
    paddingBottom: 120,
    gap: 8,
    maxWidth: '100%' as const,
  },
  hero: {
    borderRadius: 18,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    lineHeight: 21,
    marginTop: 2,
  },
  liveBadgeOuter: {
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 6,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    gap: 2,
  },
  statCardWide: {
    width: '100%',
    borderRadius: 12,
    padding: 8,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 11,
  },
  statValueSmall: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statHighlight: {
    fontSize: 13,
    fontWeight: '800' as const,
    lineHeight: 17,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  filterRow: {
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  momentCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    overflow: 'hidden' as const,
  },
  momentHeader: {
    gap: 2,
  },
  momentTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  momentCaption: {
    fontSize: 13,
  },
  momentBody: {
    gap: 6,
  },
  momentPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  momentPillText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  momentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800' as const,
  },
  sectionMeta: {
    fontSize: 14,
  },
  storyCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden' as const,
  },
  storyTop: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  storyHeading: {
    flex: 1,
    gap: 6,
  },
  storyTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    lineHeight: 24,
  },
  storyVenue: {
    fontSize: 14,
  },
  vibeBadgeContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibePulseRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(53, 212, 207, 0.5)',
  },
  storyIntensityBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyIntensityText: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  storySummary: {
    fontSize: 15,
    lineHeight: 22,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  signalCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  signalLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signalText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    gap: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  vibeChipWrapper: {
    gap: 6,
  },
  vibeDescBox: {
    overflow: 'hidden',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingRight: 4,
    marginTop: 2,
  },
  vibeDescText: {
    fontSize: 12,
    lineHeight: 17,
  },
  eventPromoCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    overflow: 'hidden' as const,
  },
  eventPromoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventPromoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventPromoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  eventPromoBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  eventPromoTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 20,
  },
  eventPromoMeta: {
    fontSize: 13,
  },
});
