import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronRight, Globe2, Lock, MapPin, Send, Users, Zap } from 'lucide-react-native';

import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import type { VibeTags } from '@/services/database';

interface TagCategory {
  key: keyof VibeTags;
  label: string;
  color: string;
  tags: string[];
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    key: 'energy',
    label: 'Energy',
    color: '#A5F05C',
    tags: ['low', 'chill', 'steady', 'turnt', 'packed'],
  },
  {
    key: 'crowd',
    label: 'Crowd',
    color: '#35D4CF',
    tags: ['empty', 'light', 'medium', 'full', 'shoulder-to-shoulder'],
  },
  {
    key: 'music',
    label: 'Music',
    color: '#F56AC5',
    tags: ['quiet', 'vibey', 'loud', 'live', 'DJ'],
  },
  {
    key: 'type',
    label: 'Scene',
    color: '#FFBF47',
    tags: ['date night', 'party', 'solo', 'group', 'work'],
  },
  {
    key: 'mood',
    label: 'Mood',
    color: '#FF6D5E',
    tags: ['good vibes', 'awkward', 'lit', 'relaxed', 'upscale'],
  },
  {
    key: 'wait',
    label: 'Wait',
    color: '#7EC8E3',
    tags: ['no wait', 'short wait', 'long wait'],
  },
];

interface PrivacyOption {
  id: 'public' | 'friends' | 'private';
  label: string;
  icon: typeof Globe2;
}

const privacyOptions: PrivacyOption[] = [
  { id: 'public', label: 'Public', icon: Globe2 },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'private', label: 'Just me', icon: Lock },
];

const venues = [
  { name: 'Mica Rooftop', neighborhood: 'Warehouse District' },
  { name: 'Paper Moon Cafe', neighborhood: 'East Garden' },
  { name: 'Juniper Square', neighborhood: 'North Loop' },
  { name: 'Harbor Reading Lawn', neighborhood: 'Seaport Edge' },
  { name: 'Neon Alley', neighborhood: 'Lower East' },
];

function TagChip({
  tag,
  selected,
  accentColor,
  onPress,
  colors,
  isDark,
}: {
  tag: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.tagChip,
          selected
            ? {
                backgroundColor: isDark
                  ? `${accentColor}22`
                  : `${accentColor}18`,
                borderColor: accentColor,
                borderWidth: 1.5,
              }
            : {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
              },
        ]}
      >
        <Text
          style={[
            styles.tagText,
            { color: selected ? accentColor : colors.textMuted },
          ]}
        >
          {tag}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const MemoTagChip = React.memo(TagChip);

function deriveVibeLabel(tags: VibeTags): string {
  const allTags = [
    ...tags.energy,
    ...tags.crowd,
    ...tags.music,
    ...tags.type,
    ...tags.mood,
    ...tags.wait,
  ];
  if (allTags.length === 0) return 'No vibe yet';
  const top = allTags.slice(0, 3).join(' · ');
  return top;
}

function deriveEnergyScore(tags: VibeTags): number {
  const energyMap: Record<string, number> = {
    low: 15,
    chill: 30,
    steady: 50,
    turnt: 78,
    packed: 92,
  };
  const crowdMap: Record<string, number> = {
    empty: 10,
    light: 25,
    medium: 50,
    full: 75,
    'shoulder-to-shoulder': 95,
  };
  const musicMap: Record<string, number> = {
    quiet: 15,
    vibey: 40,
    loud: 70,
    live: 80,
    DJ: 85,
  };

  let total = 0;
  let count = 0;

  for (const t of tags.energy) {
    if (energyMap[t] != null) { total += energyMap[t]; count++; }
  }
  for (const t of tags.crowd) {
    if (crowdMap[t] != null) { total += crowdMap[t]; count++; }
  }
  for (const t of tags.music) {
    if (musicMap[t] != null) { total += musicMap[t]; count++; }
  }

  if (count === 0) return 50;
  return Math.round(total / count);
}

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { addVibe, isAddingVibe, preferences } = useData();

  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption['id']>(
    preferences.defaultPrivacy
  );
  const [selectedVenueIdx, setSelectedVenueIdx] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<VibeTags>({
    energy: [],
    crowd: [],
    music: [],
    type: [],
    mood: [],
    wait: [],
  });
  const [posted, setPosted] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);

  const totalSelected = useMemo(() => {
    return Object.values(selectedTags).flat().length;
  }, [selectedTags]);

  const vibeLabel = useMemo(() => deriveVibeLabel(selectedTags), [selectedTags]);
  const energyScore = useMemo(() => deriveEnergyScore(selectedTags), [selectedTags]);

  const handleTagToggle = useCallback(
    (category: keyof VibeTags, tag: string) => {
      console.log('[Post] Toggle tag:', category, tag);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedTags((prev) => {
        const current = prev[category];
        const exists = current.includes(tag);
        return {
          ...prev,
          [category]: exists
            ? current.filter((t) => t !== tag)
            : [...current, tag],
        };
      });
    },
    []
  );

  const handlePrivacyPress = useCallback((privacyId: PrivacyOption['id']) => {
    console.log('[Post] Updating privacy:', privacyId);
    void Haptics.selectionAsync();
    setSelectedPrivacy(privacyId);
    setShowPrivacy(false);
  }, []);

  const handlePostVibe = useCallback(() => {
    if (totalSelected === 0) {
      Alert.alert('Tap some vibes', 'Select at least one tag before posting.');
      return;
    }

    const venue = venues[selectedVenueIdx];
    console.log('[Post] Saving vibe...', { selectedPrivacy, selectedTags, energyScore });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    addVibe(
      {
        privacy: selectedPrivacy,
        energy: energyScore,
        caption: '',
        venue: venue.name,
        neighborhood: venue.neighborhood,
        vibeLabel,
        tags: selectedTags,
      },
      {
        onSuccess: () => {
          console.log('[Post] Vibe saved successfully');
          setPosted(true);
          setTimeout(() => {
            setPosted(false);
            setSelectedTags({
              energy: [],
              crowd: [],
              music: [],
              type: [],
              mood: [],
              wait: [],
            });
            setSelectedPrivacy(preferences.defaultPrivacy);
          }, 2200);
        },
        onError: (err) => {
          console.log('[Post] Error saving vibe:', err);
          Alert.alert('Error', 'Could not save your vibe. Please try again.');
        },
      }
    );
  }, [
    totalSelected,
    selectedPrivacy,
    selectedTags,
    selectedVenueIdx,
    energyScore,
    vibeLabel,
    addVibe,
    preferences.defaultPrivacy,
  ]);

  const successScale = useRef(new Animated.Value(0.8)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (posted) {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      successScale.setValue(0.8);
      successOpacity.setValue(0);
    }
  }, [posted, successScale, successOpacity]);

  if (posted) {
    return (
      <View
        style={[
          styles.screen,
          styles.successScreen,
          { backgroundColor: colors.background, paddingTop: insets.top + 14 },
        ]}
        testID="post-success"
      >
        <Animated.View
          style={[
            styles.successCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ scale: successScale }],
              opacity: successOpacity,
            },
          ]}
        >
          <View style={[styles.successIcon, { backgroundColor: colors.aqua }]}>
            <Check color={isDark ? colors.background : '#fff'} size={32} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Vibe dropped
          </Text>
          <Text style={[styles.successSub, { color: colors.textMuted }]}>
            {totalSelected} tags · {venues[selectedVenueIdx].neighborhood}
          </Text>
          <View style={styles.successTagRow}>
            {Object.values(selectedTags)
              .flat()
              .slice(0, 5)
              .map((t) => (
                <View
                  key={t}
                  style={[
                    styles.successTag,
                    { backgroundColor: `${colors.aqua}20` },
                  ]}
                >
                  <Text style={[styles.successTagText, { color: colors.aqua }]}>
                    {t}
                  </Text>
                </View>
              ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  const currentPrivacy = privacyOptions.find((p) => p.id === selectedPrivacy);
  const PrivacyIcon = currentPrivacy?.icon ?? Globe2;

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID="post-screen"
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Zap color={colors.aqua} size={20} fill={colors.aqua} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Drop a vibe
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setShowPrivacy(!showPrivacy);
            }}
            style={[styles.privacyToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <PrivacyIcon color={colors.aqua} size={14} />
            <Text style={[styles.privacyToggleText, { color: colors.textMuted }]}>
              {currentPrivacy?.label}
            </Text>
            <ChevronRight
              color={colors.textSoft}
              size={12}
              style={{ transform: [{ rotate: showPrivacy ? '90deg' : '0deg' }] }}
            />
          </Pressable>
        </View>

        {showPrivacy && (
          <View style={[styles.privacyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {privacyOptions.map((opt) => {
              const Icon = opt.icon;
              const active = opt.id === selectedPrivacy;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handlePrivacyPress(opt.id)}
                  style={[
                    styles.privacyChip,
                    active
                      ? { backgroundColor: `${colors.aqua}18`, borderColor: colors.aqua }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  testID={`privacy-option-${opt.id}`}
                >
                  <Icon color={active ? colors.aqua : colors.textSoft} size={14} />
                  <Text
                    style={[
                      styles.privacyChipText,
                      { color: active ? colors.aqua : colors.textMuted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.venueSection}>
          <View style={styles.venueLabelRow}>
            <MapPin color={colors.textSoft} size={14} />
            <Text style={[styles.venueLabel, { color: colors.textMuted }]}>
              Location
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueScroll}
          >
            {venues.map((v, i) => {
              const active = i === selectedVenueIdx;
              return (
                <Pressable
                  key={v.name}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedVenueIdx(i);
                  }}
                  style={[
                    styles.venueChip,
                    active
                      ? {
                          backgroundColor: isDark
                            ? `${colors.aqua}18`
                            : `${colors.aqua}12`,
                          borderColor: colors.aqua,
                        }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.venueChipText,
                      { color: active ? colors.aqua : colors.textMuted },
                    ]}
                  >
                    {v.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSoft }]}>
            tap the vibe
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {TAG_CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.tagSection}>
            <View style={styles.tagSectionHeader}>
              <View
                style={[styles.tagDot, { backgroundColor: cat.color }]}
              />
              <Text style={[styles.tagSectionLabel, { color: colors.text }]}>
                {cat.label}
              </Text>
              {selectedTags[cat.key].length > 0 && (
                <View
                  style={[
                    styles.tagCount,
                    { backgroundColor: `${cat.color}22` },
                  ]}
                >
                  <Text style={[styles.tagCountText, { color: cat.color }]}>
                    {selectedTags[cat.key].length}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.tagRow}>
              {cat.tags.map((tag) => (
                <MemoTagChip
                  key={tag}
                  tag={tag}
                  selected={selectedTags[cat.key].includes(tag)}
                  accentColor={cat.color}
                  onPress={() => handleTagToggle(cat.key, tag)}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
        ))}

        {totalSelected > 0 && (
          <View
            style={[
              styles.previewStrip,
              {
                backgroundColor: isDark ? '#0E2A33' : '#E4F1F5',
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.textSoft }]}>
              VIBE PREVIEW
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {vibeLabel}
            </Text>
            <View style={styles.previewScoreRow}>
              <View
                style={[
                  styles.previewScoreBadge,
                  { backgroundColor: `${colors.aqua}20` },
                ]}
              >
                <Text
                  style={[styles.previewScoreText, { color: colors.aqua }]}
                >
                  {energyScore}
                </Text>
              </View>
              <Text style={[styles.previewScoreLabel, { color: colors.textMuted }]}>
                energy score
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 12,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomCount, { color: colors.text }]}>
            {totalSelected}
          </Text>
          <Text style={[styles.bottomCountLabel, { color: colors.textMuted }]}>
            {totalSelected === 1 ? 'tag' : 'tags'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.postButton,
            {
              backgroundColor:
                totalSelected > 0 ? colors.aqua : colors.card,
              opacity: isAddingVibe ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={handlePostVibe}
          disabled={isAddingVibe}
          testID="publish-vibe-button"
        >
          <Send
            color={
              totalSelected > 0
                ? isDark
                  ? colors.background
                  : '#fff'
                : colors.textSoft
            }
            size={18}
          />
          <Text
            style={[
              styles.postButtonText,
              {
                color:
                  totalSelected > 0
                    ? isDark
                      ? colors.background
                      : '#fff'
                    : colors.textSoft,
              },
            ]}
          >
            {isAddingVibe ? 'Dropping...' : 'Drop vibe'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    gap: 16,
  },
  successScreen: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 32,
  },
  successCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center' as const,
    gap: 14,
    width: '100%',
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  successSub: {
    fontSize: 14,
  },
  successTagRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 8,
  },
  successTag: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  successTagText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  privacyToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  privacyToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  privacyRow: {
    flexDirection: 'row' as const,
    gap: 8,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
  },
  privacyChip: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  privacyChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  venueSection: {
    gap: 8,
  },
  venueLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  venueLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  venueScroll: {
    gap: 8,
    paddingRight: 4,
  },
  venueChip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  venueChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  tagSection: {
    gap: 10,
  },
  tagSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagSectionLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  tagCount: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tagCountText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  tagRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tagChip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  previewStrip: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  previewValue: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  previewScoreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 2,
  },
  previewScoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewScoreText: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  previewScoreLabel: {
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomInfo: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
  },
  bottomCount: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  bottomCountLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  postButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
});
