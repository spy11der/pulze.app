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
import { Compass, Database, Eye, Flame, Heart, MapPinned, Radio, Ticket, Trash2, X, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { feedFilters, vibeStories } from '@/mocks/city';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import type { SavedVibe } from '@/services/database';

type FeedMode = 'everyone' | 'friends' | 'my_vibes';

const _VIBE_DESCRIPTIONS: Record<string, string> = {
  'Social': 'Conversational atmosphere. Good for meeting people.',
  'Chill': 'Relaxed pace. Great for unwinding.',
  'Party': 'High energy, loud music, packed crowd.',
  'Active': 'On the move. Buzzing with anticipation.',
  'Romantic': 'Warm and intimate. Quiet corners.',
  'Creative': 'Artistic energy. Expect the unexpected.',
  'Busy': 'Lots of movement. Things happening fast.',
  'Quiet': 'Peaceful. Ideal for focus or escape.',
};

function getVibeColor(vibe: string): string {
  const v = vibe.toLowerCase();
  if (v === 'party') return '#E8564A';
  if (v === 'active') return '#E8A830';
  if (v === 'social') return '#8DD44E';
  if (v === 'romantic') return '#5CE8DC';
  if (v === 'creative') return '#D456A8';
  if (v === 'quiet') return '#6AADCC';
  if (v === 'chill') return '#4EBE7A';
  if (v === 'busy') return '#E89050';
  return '#2BBFBA';
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

function getScoreColor(score: number, colors: { coral: string; amber: string; lime: string; aqua: string; quiet: string }): string {
  if (score >= 80) return colors.coral;
  if (score >= 60) return colors.amber;
  if (score >= 40) return colors.lime;
  if (score >= 20) return colors.aqua;
  return colors.quiet;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [feedMode, setFeedMode] = useState<FeedMode>('everyone');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const { vibes, removeVibe, vibeCount } = useData();
  const { isFavorited, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [vibeModalVisible, setVibeModalVisible] = useState<boolean>(false);
  const [vibeModalScore, setVibeModalScore] = useState<number>(0);
  const [vibeModalVenue, setVibeModalVenue] = useState<string>('');

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
  const avgColor = getScoreColor(liveAverage, colors);

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

  const handleStoryPress = useCallback((venueId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/venue-detail', params: { venueId } });
    console.log('[Feed] Story pressed, navigating to venue detail', { venueId });
  }, [router]);

  const handleVibePress = useCallback((storyId: string, intensity: number, venue: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVibeModalScore(intensity);
    setVibeModalVenue(venue);
    setVibeModalVisible(true);
    console.log('[Feed] Vibe score pressed, showing explanation', { storyId, intensity });
  }, []);

  const handleStoryHeart = useCallback((venueId: string, venueName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(venueId, 'venue', venueName);
  }, [toggleFavorite]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="feed-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brandMark, { color: colors.aqua }]}>Pulze</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Denver, right now</Text>
            </View>
            <Pressable
              onPress={handleLiveBadgePress}
              style={({ pressed }) => [
                styles.liveBadge,
                { backgroundColor: isDark ? 'rgba(43, 191, 186, 0.12)' : 'rgba(26, 158, 153, 0.08)' },
                pressed && styles.pressed,
              ]}
              testID="live-badge-btn"
            >
              <View style={[styles.liveDot, { backgroundColor: colors.aqua }]} />
              <Text style={[styles.liveBadgeText, { color: colors.aqua }]}>Live</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statNumber, { color: avgColor }]}>{liveAverage}</Text>
              <Text style={[styles.statUnit, { color: colors.textSoft }]}>avg energy</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{signalCount}</Text>
              <Text style={[styles.statUnit, { color: colors.textSoft }]}>{feedMode === 'my_vibes' ? 'vibes' : 'signals'}</Text>
            </View>
          </View>
        </View>

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
                  {
                    backgroundColor: active ? colors.aqua : 'transparent',
                    borderColor: active ? colors.aqua : colors.border,
                  },
                ]}
                testID={`feed-mode-${m.id}`}
              >
                <m.icon color={active ? (isDark ? '#060F13' : '#fff') : colors.textMuted} size={14} />
                <Text style={[styles.modeText, { color: active ? (isDark ? '#060F13' : '#fff') : colors.textMuted }]}>{m.label}</Text>
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
                    {
                      backgroundColor: active ? (isDark ? 'rgba(43, 191, 186, 0.14)' : 'rgba(26, 158, 153, 0.08)') : 'transparent',
                      borderColor: active ? colors.aqua : colors.border,
                    },
                  ]}
                  testID={`filter-${filter.id}`}
                >
                  <Text style={[styles.filterText, { color: active ? colors.aqua : colors.textMuted }]}>{filter.label}</Text>
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
            style={({ pressed }) => [styles.promoCard, { backgroundColor: isDark ? '#0C1C28' : '#E8F0F5' }, pressed && styles.pressed]}
            testID="event-promo-card"
          >
            <View style={styles.promoTop}>
              <Ticket color={colors.aqua} size={16} />
              <Text style={[styles.promoTitle, { color: colors.text }]}>Neon Drift: Rooftop After Dark</Text>
            </View>
            <Text style={[styles.promoMeta, { color: colors.textMuted }]}>Mica Rooftop · 9 PM · From $25</Text>
          </Pressable>
        )}

        {feedMode !== 'my_vibes' && (
          <Pressable
            onPress={handleMomentPillPress}
            style={({ pressed }) => [styles.insightCard, { backgroundColor: isDark ? '#0C2430' : '#E4EFF5' }, pressed && styles.pressed]}
            testID="moment-card"
          >
            <View style={styles.insightHeader}>
              <Flame color={colors.coral} size={14} />
              <Text style={[styles.insightLabel, { color: colors.coral }]}>Trending now</Text>
            </View>
            <Text style={[styles.insightTitle, { color: colors.text }]}>Mica Rooftop peaking</Text>
            <Text style={[styles.insightBody, { color: colors.textMuted }]}>Strongest energy spike in the last 15 min. Crowd level rising fast.</Text>
          </Pressable>
        )}

        {feedMode === 'my_vibes' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your saved vibes</Text>
              <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>Stored locally on device</Text>
            </View>
            {vibes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Database color={colors.textSoft} size={28} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No vibes yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Drop your first vibe from the post tab.</Text>
              </View>
            ) : (
              vibes.map((vibe) => (
                <SavedVibeCard
                  key={vibe.id}
                  vibe={vibe}
                  onDelete={handleDeleteVibe}
                />
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby</Text>
            </View>
            {filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isHearted={isFavorited(story.venueId)}
                onPress={() => handleStoryPress(story.venueId)}
                onVibePress={() => handleVibePress(story.id, story.intensity, story.venue)}
                onHeartPress={() => handleStoryHeart(story.venueId, story.venue)}
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

const StoryCard = React.memo(function StoryCard({
  story,
  isHearted,
  onPress,
  onVibePress,
  onHeartPress,
}: {
  story: (typeof vibeStories)[number];
  isHearted: boolean;
  onPress: () => void;
  onVibePress: () => void;
  onHeartPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const scoreColor = getScoreColor(story.intensity, colors);
  const vibeColor = getVibeColor(story.vibe);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.storyCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
      testID={`story-${story.id}`}
    >
      <View style={styles.storyTop}>
        <Pressable
          onPress={onVibePress}
          hitSlop={8}
          style={({ pressed }) => [styles.scoreBadge, { backgroundColor: scoreColor + '14' }, pressed && { opacity: 0.7 }]}
          testID={`story-vibe-${story.id}`}
        >
          <Text style={[styles.scoreText, { color: scoreColor }]}>{story.intensity}</Text>
        </Pressable>
        <View style={styles.storyHeading}>
          <Text style={[styles.storyTitle, { color: colors.text }]} numberOfLines={2}>{story.title}</Text>
          <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{story.venue} · {story.neighborhood}</Text>
        </View>
      </View>

      <Text style={[styles.storySummary, { color: colors.textSoft }]} numberOfLines={2}>{story.summary}</Text>

      <View style={styles.storyBottom}>
        <View style={[styles.chip, { backgroundColor: vibeColor + '14' }]}>
          <View style={[styles.chipDot, { backgroundColor: vibeColor }]} />
          <Text style={[styles.chipText, { color: vibeColor }]}>{story.vibe}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <MapPinned color={colors.textSoft} size={12} />
          <Text style={[styles.chipText, { color: colors.textSoft }]}>{story.distance}</Text>
        </View>
        <Pressable
          onPress={onHeartPress}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: isHearted
                ? (isDark ? 'rgba(232,86,74,0.10)' : 'rgba(204,68,56,0.06)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
            },
            pressed && { opacity: 0.7 },
          ]}
          testID={`story-heart-${story.id}`}
        >
          <Heart
            color={isHearted ? colors.coral : colors.textSoft}
            size={12}
            fill={isHearted ? colors.coral : 'transparent'}
          />
          <Text style={[styles.chipText, { color: isHearted ? colors.coral : colors.textSoft }]}>
            {isHearted ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const SavedVibeCard = React.memo(function SavedVibeCard({
  vibe,
  onDelete,
}: {
  vibe: SavedVibe;
  onDelete: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const privacyLabel = vibe.privacy === 'public' ? 'Public' : vibe.privacy === 'friends' ? 'Friends' : 'Private';
  const privacyColor = vibe.privacy === 'public' ? colors.aqua : vibe.privacy === 'friends' ? colors.lime : colors.amber;
  const scoreColor = getScoreColor(vibe.energy, colors);

  return (
    <View style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} testID={`saved-vibe-${vibe.id}`}>
      <View style={styles.storyTop}>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '14' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{vibe.energy}</Text>
        </View>
        <View style={styles.storyHeading}>
          <Text style={[styles.storyTitle, { color: colors.text }]}>{vibe.vibeLabel}</Text>
          <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{vibe.venue} · {vibe.neighborhood}</Text>
        </View>
      </View>
      {vibe.caption ? <Text style={[styles.storySummary, { color: colors.textSoft }]}>{vibe.caption}</Text> : null}
      <View style={styles.storyBottom}>
        <View style={[styles.chip, { backgroundColor: privacyColor + '14' }]}>
          <Text style={[styles.chipText, { color: privacyColor }]}>{privacyLabel}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.chipText, { color: colors.textSoft }]}>{formatTimeAgo(vibe.createdAt)}</Text>
        </View>
        <Pressable
          onPress={() => onDelete(vibe.id)}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: isDark ? 'rgba(232,86,74,0.08)' : 'rgba(204,68,56,0.05)' },
            pressed && { opacity: 0.7 },
          ]}
          testID={`delete-vibe-${vibe.id}`}
        >
          <Trash2 color={colors.coral} size={12} />
          <Text style={[styles.chipText, { color: colors.coral }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
});

function getVibeLabel(score: number): { label: string; color: string; description: string } {
  if (score >= 80) return { label: 'Packed', color: '#E8564A', description: 'Maximum crowd density. Expect long waits and high energy.' };
  if (score >= 60) return { label: 'Buzzing', color: '#E8A830', description: 'Lively and social. Active crowds without being overwhelming.' };
  if (score >= 40) return { label: 'Lively', color: '#8DD44E', description: 'Good balance of energy. Enough going on without being crowded.' };
  if (score >= 20) return { label: 'Chill', color: '#4EBE7A', description: 'Relaxed pace. Easy to find a seat, casual atmosphere.' };
  return { label: 'Quiet', color: '#6AADCC', description: 'Very calm. Few people, minimal noise.' };
}

const VIBE_TIERS = [
  { min: 80, max: 100, label: 'Packed', color: '#E8564A', icon: Flame },
  { min: 60, max: 79, label: 'Buzzing', color: '#E8A830', icon: Zap },
  { min: 40, max: 59, label: 'Lively', color: '#8DD44E', icon: Radio },
  { min: 20, max: 39, label: 'Chill', color: '#4EBE7A', icon: Compass },
  { min: 0, max: 19, label: 'Quiet', color: '#6AADCC', icon: Eye },
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
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 120, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [scaleAnim, opacityAnim, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID="vibe-score-modal">
      <Pressable style={vibeModalStyles.backdrop} onPress={handleClose}>
        <Animated.View
          style={[
            vibeModalStyles.container,
            {
              backgroundColor: isDark ? '#0C1E26' : '#fff',
              borderColor: isDark ? 'rgba(100,180,180,0.12)' : 'rgba(0,0,0,0.06)',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Pressable onPress={handleClose} style={[vibeModalStyles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <X color={colors.textMuted} size={14} />
          </Pressable>

          <View style={[vibeModalStyles.scoreCircle, { borderColor: vibe.color }]}>
            <Text style={[vibeModalStyles.scoreText, { color: vibe.color }]}>{score}</Text>
          </View>

          <Text style={[vibeModalStyles.label, { color: vibe.color }]}>{vibe.label}</Text>
          <Text style={[vibeModalStyles.venue, { color: colors.textMuted }]}>{venue}</Text>
          <Text style={[vibeModalStyles.description, { color: colors.textSoft }]}>{vibe.description}</Text>

          <View style={[vibeModalStyles.divider, { backgroundColor: colors.border }]} />

          <Text style={[vibeModalStyles.scaleTitle, { color: colors.textSoft }]}>SCALE</Text>
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
                      backgroundColor: isActive ? tier.color + '12' : 'transparent',
                      borderColor: isActive ? tier.color + '30' : 'transparent',
                    },
                  ]}
                >
                  <TierIcon color={isActive ? tier.color : colors.textSoft} size={13} />
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
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  label: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  venue: {
    fontSize: 13,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 10,
  },
  scaleTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tierList: {
    width: '100%',
    gap: 3,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  tierRange: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 12,
  },
  headerSection: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    gap: 5,
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  filterRow: {
    gap: 6,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  promoCard: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  promoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  promoMeta: {
    fontSize: 13,
    marginLeft: 24,
  },
  insightCard: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    gap: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionMeta: {
    fontSize: 13,
  },
  storyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  storyTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  storyHeading: {
    flex: 1,
    gap: 3,
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  storyVenue: {
    fontSize: 13,
  },
  storySummary: {
    fontSize: 13,
    lineHeight: 19,
  },
  storyBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
