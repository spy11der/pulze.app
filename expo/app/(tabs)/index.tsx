import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bookmark, Calendar, CalendarDays, ChevronRight, Compass, Database, Eye, Flame, Heart, MapPin, MessageCircle, RadioTower, Send, Star, Ticket, Trash2, Users, X } from 'lucide-react-native';
import { RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { feedFilters, vibeStories } from '@/mocks/city';
import { sampleEvent } from '@/mocks/events';
import { getUrgencyLabel } from '@/utils/urgency';
import { UrgencyTag } from '@/components/UrgencyTag';
import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useFavorites } from '@/providers/FavoritesProvider';
import type { SavedVibe } from '@/services/database';

type FeedMode = 'everyone' | 'friends' | 'my_vibes';

function getVibeColor(_vibe: string): string {
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

function getScoreColor(score: number, colors: { aqua: string; aquaBright: string; textSoft: string }): string {
  if (score >= 60) return colors.aquaBright;
  if (score >= 30) return colors.aqua;
  return colors.textSoft;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [feedMode, setFeedMode] = useState<FeedMode>('everyone');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setIsLoading(true);
    const t = setTimeout(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const { vibes, removeVibe, vibeCount } = useData();
  const { isFavorited, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [commentModalVisible, setCommentModalVisible] = useState<boolean>(false);
  const [commentTarget, setCommentTarget] = useState<string>('');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

  const filteredStories = useMemo(() => {
    console.log('Filtering feed stories', { feedMode, activeFilter });
    if (feedMode === 'my_vibes') return [];
    return vibeStories.filter((story) => {
      if (feedMode === 'friends' && story.privacy !== 'friends') return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'tonight') return story.tags.includes('tonight');
      if (activeFilter === 'tomorrow') return story.tags.includes('tomorrow');
      if (activeFilter === 'events') return story.tags.includes('concert') || story.tags.includes('comedy') || story.tags.includes('sports');
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
    const total = filteredStories.reduce((sum, story) => sum + story.soldOutPercent, 0);
    return Math.round(total / filteredStories.length);
  }, [filteredStories, feedMode, vibes]);

  const signalCount = feedMode === 'my_vibes' ? vibeCount : filteredStories.length;
  const avgColor = getScoreColor(liveAverage, colors);

  const handleDeleteVibe = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeVibe(id);
  }, [removeVibe]);

  const handleStoryPress = useCallback((venueId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/venue-detail', params: { venueId } });
    console.log('[Feed] Story pressed, navigating to venue detail', { venueId });
  }, [router]);

  const handleLike = useCallback((storyId: string, currentLikes: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikedPosts(prev => {
      const wasLiked = prev[storyId] ?? false;
      return { ...prev, [storyId]: !wasLiked };
    });
    setLikeCounts(prev => {
      const wasLiked = likedPosts[storyId] ?? false;
      const base = prev[storyId] ?? currentLikes;
      return { ...prev, [storyId]: wasLiked ? base - 1 : base + 1 };
    });
  }, [likedPosts]);

  const handleComment = useCallback((storyId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentTarget(storyId);
    setCommentModalVisible(true);
  }, []);

  const handleSave = useCallback((storyId: string, venueId: string, venueName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedPosts(prev => ({ ...prev, [storyId]: !(prev[storyId] ?? false) }));
    toggleFavorite(venueId, 'venue', venueName);
  }, [toggleFavorite]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="feed-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.aqua}
            colors={[colors.aqua]}
          />
        }
      >
        <View style={styles.headerSection}>
          <View style={styles.topRow}>
            <Text style={[styles.heroTitle, { color: colors.aqua }]}>PULZE</Text>
            <Text style={[styles.brandMark, { color: colors.textMuted }]}>Denver, tonight</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statPill, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statNumber, { color: avgColor }]}>{liveAverage}</Text>
              <Text style={[styles.statUnit, { color: colors.textSoft }]}>avg sold</Text>
            </View>
            <View style={[styles.statPill, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{signalCount}</Text>
              <Text style={[styles.statUnit, { color: colors.textSoft }]}>{feedMode === 'my_vibes' ? 'going' : 'reports'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.modeRow}>
          {([
            { id: 'everyone' as FeedMode, label: 'Everyone', icon: Eye },
            { id: 'friends' as FeedMode, label: 'Friends', icon: Compass },
            { id: 'my_vibes' as FeedMode, label: 'My Vibes', icon: Ticket },
          ]).map((m) => {
            const active = feedMode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setFeedMode(m.id)}
                style={styles.modeTab}
                testID={`feed-mode-${m.id}`}
              >
                <View style={styles.modeTabInner}>
                  <m.icon color={active ? colors.text : '#888'} size={14} />
                  <Text style={[styles.modeTabText, { color: active ? colors.text : '#888', fontWeight: active ? '700' : '500' }]}>{m.label}</Text>
                </View>
                <View style={[styles.modeTabUnderline, { backgroundColor: active ? colors.aqua : 'transparent' }]} />
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

        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : feedMode === 'my_vibes' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your plans</Text>
              <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>Events you're going to tonight</Text>
            </View>
            {vibes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Database color={colors.textSoft} size={28} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No plans yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap the + tab to let friends know you&apos;re going out.</Text>
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
        ) : feedMode === 'friends' && filteredStories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="empty-friends">
            <Users color={colors.aqua} size={32} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your friends haven&apos;t posted yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Invite them to Pulze</Text>
          </View>
        ) : filteredStories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="empty-feed">
            <RadioTower color={colors.aqua} size={32} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No vibes yet tonight</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Be the first to check in somewhere</Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/post');
              }}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: colors.aqua },
                pressed && { opacity: 0.85 },
              ]}
              testID="empty-checkin-cta"
            >
              <Text style={[styles.emptyCtaText, { color: isDark ? '#060F13' : '#fff' }]}>Check In Now</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/events');
              }}
              style={({ pressed }) => [
                styles.liveEventsCta,
                {
                  backgroundColor: isDark ? 'rgba(43,191,186,0.10)' : 'rgba(26,158,153,0.06)',
                  borderColor: isDark ? 'rgba(43,191,186,0.25)' : 'rgba(26,158,153,0.18)',
                },
                pressed && { opacity: 0.85 },
              ]}
              testID="live-events-cta"
            >
              <View style={[styles.liveEventsIcon, { backgroundColor: colors.aqua }]}>
                <CalendarDays color={isDark ? '#060F13' : '#fff'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveEventsTitle, { color: colors.text }]}>Live events near you</Text>
                <Text style={[styles.liveEventsSub, { color: colors.textMuted }]}>
                  Real-time from Ticketmaster &amp; SeatData
                </Text>
              </View>
              <ChevronRight color={colors.aqua} size={18} />
            </Pressable>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby</Text>
            </View>
            <FeaturedEventCard
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/ticketing', params: { venueId: sampleEvent.venueId } });
              }}
            />
            {filteredStories.map((story, idx) => (
              <StoryCard
                key={story.id}
                story={story}
                isLive={idx < 2}
                isLiked={likedPosts[story.id] ?? false}
                likeCount={likeCounts[story.id] ?? story.likes}
                isSaved={savedPosts[story.id] ?? isFavorited(story.venueId)}
                onPress={() => handleStoryPress(story.venueId)}
                onLike={() => handleLike(story.id, story.likes)}
                onComment={() => handleComment(story.id)}
                onSave={() => handleSave(story.id, story.venueId, story.venue)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <CommentsSheet
        visible={commentModalVisible}
        storyId={commentTarget}
        onClose={() => setCommentModalVisible(false)}
      />
    </View>
  );
}

const FeaturedEventCard = React.memo(function FeaturedEventCard({
  onPress,
}: {
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featuredCard,
        { borderColor: colors.border },
        pressed && styles.pressed,
      ]}
      testID="featured-event-card"
    >
      <Image source={{ uri: sampleEvent.heroImage }} style={styles.featuredImage} />
      <LinearGradient
        colors={isDark ? ['rgba(6,15,19,0)', 'rgba(6,15,19,0.85)', 'rgba(6,15,19,0.98)'] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.featuredTopRow}>
        <View style={[styles.featuredBadge, { backgroundColor: colors.aqua }]}>
          <Flame color={isDark ? '#060F13' : '#fff'} size={12} />
          <Text style={[styles.featuredBadgeText, { color: isDark ? '#060F13' : '#fff' }]}>Featured</Text>
        </View>
        <View style={[styles.featuredVibePill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <Star color="#FFD66B" size={11} fill="#FFD66B" />
          <Text style={styles.featuredVibeText}>{sampleEvent.vibeScore}</Text>
        </View>
      </View>
      <View style={styles.featuredBottom}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{sampleEvent.title}</Text>
        <Text style={styles.featuredTagline} numberOfLines={1}>{sampleEvent.tagline}</Text>
        <View style={styles.featuredMetaRow}>
          <View style={styles.featuredMetaItem}>
            <Calendar color="rgba(255,255,255,0.85)" size={12} />
            <Text style={styles.featuredMetaText}>{sampleEvent.date} · {sampleEvent.time}</Text>
          </View>
        </View>
        <View style={styles.featuredMetaRow}>
          <View style={styles.featuredMetaItem}>
            <MapPin color="rgba(255,255,255,0.85)" size={12} />
            <Text style={styles.featuredMetaText}>{sampleEvent.venueName} · {sampleEvent.distanceFromUser}</Text>
          </View>
        </View>
        <View style={styles.featuredCtaRow}>
          <View style={[styles.featuredCta, { backgroundColor: colors.aqua }]}>
            <Ticket color={isDark ? '#060F13' : '#fff'} size={14} />
            <Text style={[styles.featuredCtaText, { color: isDark ? '#060F13' : '#fff' }]}>Get tickets</Text>
          </View>
          <Text style={styles.featuredAttending}>{sampleEvent.attendingCount} going</Text>
        </View>
      </View>
    </Pressable>
  );
});

const SkeletonCard = React.memo(function SkeletonCard() {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const blockColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      style={[
        styles.storyCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity },
      ]}
      testID="skeleton-card"
    >
      <View style={[styles.storyImage, { backgroundColor: blockColor }]} />
      <View style={styles.storyBody}>
        <View style={styles.storyTop}>
          <View style={[styles.storyHeading, { gap: 6 }]}>
            <View style={{ height: 14, width: '70%', borderRadius: 4, backgroundColor: blockColor }} />
            <View style={{ height: 12, width: '50%', borderRadius: 4, backgroundColor: blockColor }} />
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: blockColor }]} />
        </View>
        <View style={{ height: 12, width: '90%', borderRadius: 4, backgroundColor: blockColor }} />
        <View style={{ height: 12, width: '60%', borderRadius: 4, backgroundColor: blockColor }} />
        <View style={styles.storyMeta}>
          <View style={{ height: 22, width: 60, borderRadius: 8, backgroundColor: blockColor }} />
          <View style={{ height: 22, width: 70, borderRadius: 8, backgroundColor: blockColor }} />
          <View style={{ height: 22, width: 50, borderRadius: 8, backgroundColor: blockColor }} />
        </View>
      </View>
    </Animated.View>
  );
});

const StoryCard = React.memo(function StoryCard({
  story,
  isLive,
  isLiked,
  likeCount,
  isSaved,
  onPress,
  onLike,
  onComment,
  onSave,
}: {
  story: (typeof vibeStories)[number];
  isLive?: boolean;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
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
      {story.image && (
        <View style={styles.storyImageWrap}>
          <Image source={{ uri: story.image }} style={styles.storyImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            style={styles.storyImageGradient}
            pointerEvents="none"
          />
          {isLive && (
            <View style={[styles.liveBadge, { backgroundColor: colors.aqua }]} testID={`live-${story.id}`}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveBadgeText, { color: isDark ? '#060F13' : '#fff' }]}>LIVE</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.storyBody}>
        <View style={styles.storyTop}>
          <View style={styles.storyHeading}>
            <Text style={[styles.storyTitle, { color: colors.text }]} numberOfLines={2}>{story.title}</Text>
            <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{story.venue} · {story.neighborhood}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '14' }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{story.intensity}</Text>
          </View>
        </View>

        <Text style={[styles.storySummary, { color: colors.textSoft }]} numberOfLines={2}>{story.summary}</Text>

        <View style={styles.storyMeta}>
          <View style={[styles.chip, { backgroundColor: colors.aqua + '14' }]}>
            <Text style={[styles.chipText, { color: colors.aqua }]}>{story.vibe}</Text>
          </View>
          <View style={[styles.chip, {
            backgroundColor: story.soldOutPercent >= 80
              ? 'rgba(232,68,58,0.08)'
              : colors.aqua + '10'
          }]}>
            <Text style={[styles.chipText, {
              color: story.soldOutPercent >= 80 ? colors.danger : colors.aqua
            }]}>
              {story.soldOutPercent}% sold
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <MapPin color={colors.textSoft} size={11} />
            <Text style={[styles.chipText, { color: colors.textSoft }]}>{story.distance}</Text>
          </View>
          <UrgencyTag urgency={getUrgencyLabel(story.intensity, story.pace === 'packed' ? 200 : story.pace === 'busy' ? 100 : 40, story.pace)} />
        </View>

        <View style={[styles.interactionBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
          <Pressable
            onPress={onLike}
            hitSlop={8}
            style={({ pressed }) => [styles.interactionBtn, pressed && { opacity: 0.6 }]}
            testID={`like-${story.id}`}
          >
            <Heart
              color={isLiked ? colors.coral : colors.textMuted}
              size={18}
              fill={isLiked ? colors.coral : 'transparent'}
            />
            <Text style={[styles.interactionCount, { color: isLiked ? colors.coral : colors.textMuted }]}>
              {likeCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={onComment}
            hitSlop={8}
            style={({ pressed }) => [styles.interactionBtn, pressed && { opacity: 0.6 }]}
            testID={`comment-${story.id}`}
          >
            <MessageCircle color={colors.textMuted} size={18} />
            <Text style={[styles.interactionCount, { color: colors.textMuted }]}>
              {story.comments}
            </Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            hitSlop={8}
            style={({ pressed }) => [styles.interactionBtn, { marginLeft: 'auto' }, pressed && { opacity: 0.6 }]}
            testID={`save-${story.id}`}
          >
            <Bookmark
              color={isSaved ? colors.aqua : colors.textMuted}
              size={18}
              fill={isSaved ? colors.aqua : 'transparent'}
            />
          </Pressable>
        </View>
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
  const privacyColor = colors.aqua;
  const scoreColor = getScoreColor(vibe.energy, colors);

  return (
    <View style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} testID={`saved-vibe-${vibe.id}`}>
      <View style={styles.storyBody}>
        <View style={styles.storyTop}>
          <View style={styles.storyHeading}>
            <Text style={[styles.storyTitle, { color: colors.text }]}>{vibe.vibeLabel}</Text>
            <Text style={[styles.storyVenue, { color: colors.textMuted }]}>{vibe.venue} · {vibe.neighborhood}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '14' }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{vibe.energy}</Text>
          </View>
        </View>
        {vibe.caption ? <Text style={[styles.storySummary, { color: colors.textSoft }]}>{vibe.caption}</Text> : null}
        <View style={styles.storyMeta}>
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
              { backgroundColor: colors.dangerBg },
              pressed && { opacity: 0.7 },
            ]}
            testID={`delete-vibe-${vibe.id}`}
          >
            <Trash2 color={colors.danger} size={12} />
            <Text style={[styles.chipText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

interface MockComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
}

const MOCK_COMMENTS: Record<string, MockComment[]> = {
  '1': [
    { id: 'c1', author: 'Jake M.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', text: 'Blake St is absolutely insane rn. Get here early.', timeAgo: '4m ago' },
    { id: 'c2', author: 'Mia T.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', text: 'Wait is way longer than 15 min now tbh', timeAgo: '8m ago' },
    { id: 'c3', author: 'Sam R.', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face', text: 'Multiple bars doing green beer specials 🍀', timeAgo: '12m ago' },
  ],
  '2': [
    { id: 'c4', author: 'Alex K.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', text: 'Merch line is moving fast. Get the poster before it sells out.', timeAgo: '6m ago' },
    { id: 'c5', author: 'Jordan L.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', text: 'GA floor is already packed near the stage', timeAgo: '10m ago' },
  ],
  '3': [
    { id: 'c6', author: 'Chris P.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face', text: 'Patio is the move. Grab the hoppy pilsner.', timeAgo: '15m ago' },
  ],
  '5': [
    { id: 'c7', author: 'Luna W.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face', text: 'The new exhibit room is wild. Go left after the portal.', timeAgo: '3m ago' },
    { id: 'c8', author: 'Kai D.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', text: 'Vendredi set starts at 7 sharp, they never delay here', timeAgo: '9m ago' },
  ],
};

function CommentsSheet({
  visible,
  storyId,
  onClose,
}: {
  visible: boolean;
  storyId: string;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string>('');
  const [localComments, setLocalComments] = useState<MockComment[]>([]);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const existingComments = useMemo(() => {
    return MOCK_COMMENTS[storyId] ?? [];
  }, [storyId]);

  const allComments = useMemo(() => {
    return [...localComments, ...existingComments];
  }, [localComments, existingComments]);

  useEffect(() => {
    if (visible) {
      setText('');
      setLocalComments([]);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 50, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(600);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, backdropAnim, onClose]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newComment: MockComment = {
      id: `local_${Date.now()}`,
      author: 'You',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face',
      text: text.trim(),
      timeAgo: 'just now',
    };
    setLocalComments((prev) => [newComment, ...prev]);
    setText('');
    console.log('[Feed] Comment sent', { storyId, text });
  }, [text, storyId]);

  const renderComment = useCallback(({ item }: { item: MockComment }) => (
    <View style={commentStyles.commentRow} key={item.id}>
      <Image source={{ uri: item.avatar }} style={commentStyles.commentAvatar} />
      <View style={commentStyles.commentBody}>
        <View style={commentStyles.commentHeader}>
          <Text style={[commentStyles.commentAuthor, { color: colors.text }]}>{item.author}</Text>
          <Text style={[commentStyles.commentTime, { color: colors.textSoft }]}>{item.timeAgo}</Text>
        </View>
        <Text style={[commentStyles.commentText, { color: colors.textSoft }]}>{item.text}</Text>
      </View>
    </View>
  ), [colors]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID="comment-modal">
      <KeyboardAvoidingView
        style={commentStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[commentStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            commentStyles.sheet,
            {
              backgroundColor: isDark ? '#0C1E26' : '#fff',
              paddingBottom: insets.bottom + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={commentStyles.sheetHandle}>
            <View style={[commentStyles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          <View style={commentStyles.sheetHeader}>
            <Text style={[commentStyles.sheetTitle, { color: colors.text }]}>Comments</Text>
            <Pressable onPress={handleClose} hitSlop={8} style={commentStyles.closeBtn}>
              <X color={colors.textMuted} size={18} />
            </Pressable>
          </View>

          <FlatList
            data={allComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={commentStyles.commentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={commentStyles.emptyState}>
                <MessageCircle color={colors.textSoft} size={28} />
                <Text style={[commentStyles.emptyText, { color: colors.textMuted }]}>No comments yet</Text>
                <Text style={[commentStyles.emptyHint, { color: colors.textSoft }]}>Be the first to share your take</Text>
              </View>
            }
          />

          <View style={[commentStyles.inputRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <TextInput
              style={[
                commentStyles.input,
                {
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSoft}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
              testID="comment-input"
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim()}
              style={({ pressed }) => [
                commentStyles.sendBtn,
                {
                  backgroundColor: text.trim() ? colors.aqua : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  opacity: pressed && text.trim() ? 0.8 : 1,
                },
              ]}
              testID="comment-send"
            >
              <Send color={text.trim() ? (isDark ? '#060F13' : '#fff') : colors.textSoft} size={16} />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const commentStyles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: 320,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 16,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emptyHint: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
    fontWeight: '400' as const,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
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
    alignItems: 'baseline',
    gap: 10,
  },
  brandMark: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    letterSpacing: 1,
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
  modeTab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  modeTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  modeTabText: {
    fontSize: 13,
  },
  modeTabUnderline: {
    height: 2,
    width: '60%',
    borderRadius: 2,
  },
  emptyCta: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  storyImageWrap: {
    position: 'relative' as const,
  },
  storyImageGradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  liveBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
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
  promoUrgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginLeft: 24,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoUrgencyText: {
    fontSize: 11,
    fontWeight: '700' as const,
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
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  storyImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  storyBody: {
    padding: 14,
    gap: 10,
  },
  storyTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 16,
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
  storyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionCount: {
    fontSize: 13,
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
  featuredCard: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden' as const,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  featuredVibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  featuredVibeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  featuredBottom: {
    padding: 16,
    gap: 6,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 25,
  },
  featuredTagline: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMetaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  featuredCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  liveEventsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  liveEventsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveEventsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  liveEventsSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  featuredCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  featuredCtaText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  featuredAttending: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
