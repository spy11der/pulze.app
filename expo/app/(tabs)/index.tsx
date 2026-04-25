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
import { Bookmark, Calendar, Compass, Database, Eye, Flame, Heart, MapPin, MessageCircle, Send, Star, Ticket, Trash2, X } from 'lucide-react-native';
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
            { id: 'my_vibes' as FeedMode, label: 'Going', icon: Ticket },
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

        {feedMode === 'my_vibes' ? (
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
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby</Text>
            </View>
            <FeaturedEventCard
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/ticketing', params: { venueId: sampleEvent.venueId } });
              }}
            />
            {filteredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
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

const StoryCard = React.memo(function StoryCard({
  story,
  isLiked,
  likeCount,
  isSaved,
  onPress,
  onLike,
  onComment,
  onSave,
}: {
  story: (typeof vibeStories)[number];
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
        <Image source={{ uri: story.image }} style={styles.storyImage} />
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
});
