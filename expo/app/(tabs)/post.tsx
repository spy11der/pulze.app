import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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
import Svg, { Path } from 'react-native-svg';
import {
  Camera,
  Check,
  ChevronRight,
  Globe2,
  ImagePlus,
  Lock,
  MapPin,
  Navigation,
  Pencil,
  Radio,
  Send,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react-native';

import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import { useNearbyVenues, type NearbyVenue, type SelectedLocation } from '@/hooks/useNearbyVenues';
import type { VibeTags } from '@/services/database';

interface TagCategory {
  key: keyof Pick<VibeTags, 'energy' | 'crowd' | 'mood'>;
  label: string;
  color: string;
  glowColor: string;
  tags: string[];
  step: number;
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    key: 'energy',
    label: 'When',
    color: '#35D4CF',
    glowColor: 'rgba(53,212,207,',
    tags: ['tonight', 'tomorrow', 'this weekend'],
    step: 1,
  },
  {
    key: 'crowd',
    label: 'Who',
    color: '#2BBFBA',
    glowColor: 'rgba(43,191,186,',
    tags: ['just me', 'with a friend', 'small group', 'big group'],
    step: 2,
  },
  {
    key: 'mood',
    label: 'Vibe',
    color: '#5CE8DC',
    glowColor: 'rgba(92,232,220,',
    tags: ['low key', 'social', 'hype', 'date night'],
    step: 3,
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

function getVibeIntensityLabel(score: number): string {
  if (score <= 30) return 'Calm';
  if (score <= 60) return 'Building';
  if (score <= 80) return 'Active';
  return 'Fired up';
}

function getVibeGradientColor(score: number, isDark: boolean): string {
  if (score <= 25) return isDark ? '#1A3A2A' : '#D4EDD8';
  if (score <= 50) return isDark ? '#1A2E3A' : '#D4E5ED';
  if (score <= 75) return isDark ? '#2A1E3A' : '#E5D4ED';
  return isDark ? '#3A1A1A' : '#EDD4D4';
}

function getBusynessDotColor(score: number): string {
  if (score <= 30) return '#FF4444';
  if (score <= 60) return '#FFB800';
  return '#2BBFBA';
}

const PULZE_TEAL = '#2BBFBA';

function TagChip({
  tag,
  selected,
  onPress,
  colors,
  isDark,
  dimmed,
}: {
  tag: string;
  selected: boolean;
  accentColor: string;
  glowColor: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  dimmed: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: selected ? 1.05 : 1,
      friction: 5,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [selected, scaleAnim]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: selected ? 0.96 : 1.14,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: selected ? 1 : 1.05,
        friction: 4,
        tension: 280,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, scaleAnim, selected]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: dimmed ? 0.45 : 1 }}>
      <Pressable onPress={handlePress} testID={`tag-${tag}`}>
        <View
          style={[
            styles.tagChip,
            selected
              ? {
                  backgroundColor: PULZE_TEAL,
                  borderColor: PULZE_TEAL,
                  borderWidth: 1.5,
                  shadowColor: PULZE_TEAL,
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 4,
                }
              : {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: PULZE_TEAL,
                  borderWidth: 1,
                },
          ]}
        >
          {selected && (
            <View style={[styles.tagCheckIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Check color="#fff" size={10} />
            </View>
          )}
          <Text
            style={[
              styles.tagText,
              {
                color: selected ? '#FFFFFF' : PULZE_TEAL,
                fontWeight: selected ? '800' as const : '600' as const,
              },
            ]}
          >
            {tag}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PulsingPrompt({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const bg = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(43,191,186,0.06)', 'rgba(43,191,186,0.16)'],
  });
  return (
    <Pressable onPress={onPress} testID="pulsing-venue-prompt">
      <Animated.View
        style={{
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: 6,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderStyle: 'dashed' as const,
          borderColor: PULZE_TEAL,
          backgroundColor: bg,
          opacity,
          marginTop: 6,
        }}
      >
        <MapPin color={PULZE_TEAL} size={14} />
        <Text style={{ color: PULZE_TEAL, fontWeight: '700' as const, fontSize: 13 }}>
          Tap to tag where you are →
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function PlaceholderTagPill({ colors, isDark }: { colors: ReturnType<typeof useTheme>['colors']; isDark: boolean }) {
  return (
    <View
      style={[
        styles.tagChip,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          borderWidth: 1,
          borderStyle: 'dashed' as const,
        },
      ]}
    >
      <Text style={[styles.tagText, { color: colors.textSoft, fontWeight: '600' as const }]}>+</Text>
      <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
    </View>
  );
}

const MemoTagChip = React.memo(TagChip);

function VibeMeter({
  score,
  totalSelected,
  colors,
  isDark,
}: {
  score: number;
  totalSelected: number;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const fillTarget = totalSelected > 0 ? score / 100 : 0;
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: fillTarget,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
    const id = fillAnim.addListener(({ value }) => setDisplayProgress(value));
    return () => fillAnim.removeListener(id);
  }, [fillTarget, fillAnim]);

  const lastBucketRef = useRef<number>(-1);
  useEffect(() => {
    if (totalSelected === 0) {
      lastBucketRef.current = -1;
      return;
    }
    const bucket = Math.floor(score / 10);
    if (lastBucketRef.current !== -1 && bucket !== lastBucketRef.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    lastBucketRef.current = bucket;
  }, [score, totalSelected]);

  const shouldPulse = score > 70;
  useEffect(() => {
    if (shouldPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.015,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
    return undefined;
  }, [shouldPulse, pulseAnim]);

  useEffect(() => {
    if (totalSelected > 0) {
      const shimmer = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      shimmer.start();
      return () => shimmer.stop();
    }
    return undefined;
  }, [totalSelected, shimmerAnim]);

  const meterColor = PULZE_TEAL;
  const fillOpacity = totalSelected === 0 ? 0.18 : 0.3 + 0.7 * (score / 100);
  const isHot = score >= 70 && totalSelected > 0;

  const intensityLabel = getVibeIntensityLabel(score);

  const arcRadius = 90;
  const arcStroke = 14;
  const arcWidth = (arcRadius + arcStroke) * 2;
  const arcHeight = arcRadius + arcStroke * 2;
  const arcLength = Math.PI * arcRadius;
  const arcPath = `M ${arcStroke} ${arcRadius + arcStroke} A ${arcRadius} ${arcRadius} 0 0 1 ${arcStroke + arcRadius * 2} ${arcRadius + arcStroke}`;
  const dashOffset = arcLength * (1 - displayProgress);

  return (
    <Animated.View
      style={[
        styles.vibeMeterCard,
        {
          backgroundColor: isDark ? '#0A1820' : '#F0F4F6',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View style={styles.vibeMeterHeader}>
        <View style={styles.vibeMeterLeft}>
          <View style={[styles.vibeMeterIconWrap, { backgroundColor: `${meterColor}22` }]}>
            <Radio color={meterColor} size={14} />
          </View>
          <Text style={[styles.vibeMeterLabel, { color: colors.textMuted }]}>
            VIBE METER
          </Text>
        </View>
        {totalSelected > 0 && (
          <Text style={[styles.vibeMeterIntensityBadge, { color: meterColor, backgroundColor: `${meterColor}14` }]}>
            {intensityLabel}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.vibeArcWrap,
          isHot && {
            shadowColor: PULZE_TEAL,
            shadowOpacity: 0.8,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
            elevation: 10,
          },
        ]}
      >
        <Svg width={arcWidth} height={arcHeight}>
          <Path
            d={arcPath}
            stroke={isDark ? '#0A2228' : '#DCE4E8'}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={arcPath}
            stroke={meterColor}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arcLength} ${arcLength}`}
            strokeDashoffset={dashOffset}
            opacity={fillOpacity}
          />
        </Svg>
        <View style={styles.vibeArcCenter} pointerEvents="none">
          <Text style={[styles.vibeArcScore, { color: meterColor }]}>
            {totalSelected > 0 ? score : '—'}
          </Text>
          <Text style={[styles.vibeArcLabel, { color: colors.textSoft }]}>VIBE</Text>
        </View>
      </View>

      <View style={styles.vibeMeterLabelsRow}>
        <Text style={[styles.vibeMeterRangeLabel, { color: colors.textSoft }]}>Calm</Text>
        <Text style={[styles.vibeMeterRangeLabel, { color: colors.textSoft }]}>Fired up</Text>
      </View>

      {totalSelected === 0 && (
        <Text style={[styles.vibeMeterHint, { color: colors.textSoft }]}>
          Select tags above to charge the meter
        </Text>
      )}
    </Animated.View>
  );
}

function LivePreviewCard({
  tags,
  score,
  caption,
  locationName,
  mediaUri,
  colors,
  isDark,
}: {
  tags: VibeTags;
  score: number;
  caption: string;
  locationName: string;
  mediaUri: string;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const allTags = [...tags.energy, ...tags.crowd, ...tags.mood];
  const hasTags = allTags.length > 0;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: hasTags ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [hasTags, fadeAnim]);

  if (allTags.length === 0 && !mediaUri) return null;

  const bgTint = getVibeGradientColor(score, isDark);

  return (
    <Animated.View
      style={[
        styles.livePreviewCard,
        {
          backgroundColor: isDark ? '#0A1820' : '#F0F4F6',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.livePreviewHeader}>
        <View style={[styles.livePreviewIconWrap, { backgroundColor: `${colors.aqua}14` }]}>
          <Sparkles color={colors.aqua} size={12} />
        </View>
        <Text style={[styles.livePreviewTitle, { color: colors.textMuted }]}>
          THIS IS HOW OTHERS WILL SEE YOUR VIBE
        </Text>
      </View>

      <View style={[styles.livePreviewInner, { backgroundColor: bgTint, borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
        <View style={styles.livePreviewBody}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.livePreviewImage} />
          ) : null}

          <View style={styles.livePreviewContent}>
            {locationName ? (
              <View style={styles.livePreviewLocRow}>
                <MapPin color={colors.textSoft} size={11} />
                <Text style={[styles.livePreviewLocation, { color: colors.textSoft }]} numberOfLines={1}>
                  {locationName}
                </Text>
              </View>
            ) : null}

            {allTags.length > 0 && (
              <View style={styles.livePreviewTags}>
                {allTags.slice(0, 4).map((t) => (
                  <View
                    key={t}
                    style={[styles.livePreviewTag, { backgroundColor: `${colors.aqua}14` }]}
                  >
                    <Text style={[styles.livePreviewTagText, { color: colors.aqua }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {caption ? (
              <Text style={[styles.livePreviewCaption, { color: colors.text }]} numberOfLines={2}>
                "{caption}"
              </Text>
            ) : null}

            <View style={styles.livePreviewFooter}>
              <View style={[styles.livePreviewScoreDot, { backgroundColor: score <= 30 ? '#5BE89E' : score <= 60 ? '#E8D544' : score <= 80 ? '#FFAA2E' : '#FF4D3A' }]} />
              <Text style={[styles.livePreviewScoreLabel, { color: colors.textMuted }]}>
                {score} · {getVibeIntensityLabel(score)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function deriveVibeLabel(tags: VibeTags): string {
  const allTags = [...tags.energy, ...tags.crowd, ...tags.mood];
  if (allTags.length === 0) return 'No vibe yet';
  return allTags.slice(0, 3).join(' · ');
}

function deriveEnergyScore(tags: VibeTags): number {
  const energyMap: Record<string, number> = {
    chill: 25, steady: 50, lively: 78,
  };
  const crowdMap: Record<string, number> = {
    empty: 10, light: 30, medium: 55, full: 80, packed: 95,
  };
  const moodMap: Record<string, number> = {
    relaxed: 25, 'good vibes': 55, upscale: 60, vibrant: 85,
  };

  let total = 0;
  let count = 0;

  for (const t of tags.energy) {
    if (energyMap[t] != null) { total += energyMap[t]; count++; }
  }
  for (const t of tags.crowd) {
    if (crowdMap[t] != null) { total += crowdMap[t]; count++; }
  }
  for (const t of tags.mood) {
    if (moodMap[t] != null) { total += moodMap[t]; count++; }
  }

  if (count === 0) return 50;
  return Math.round(total / count);
}

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { addVibe, isAddingVibe, preferences } = useData();
  const { userLocation, isLocating } = useMapLocation();
  const { nearbyVenues } = useNearbyVenues(userLocation);

  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption['id']>(
    preferences.defaultPrivacy
  );
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [selectedTags, setSelectedTags] = useState<VibeTags>({
    energy: [], crowd: [], mood: [], music: [], type: [], wait: [],
  });
  const [caption, setCaption] = useState<string>('');
  const [mediaUri, setMediaUri] = useState<string>('');
  const [posted, setPosted] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);

  useEffect(() => {
    if (nearbyVenues.length > 0 && !selectedLocation) {
      const v = nearbyVenues[0];
      console.log('[Post] Auto-selecting nearest venue:', v.name);
      setSelectedLocation({
        type: 'venue',
        venueId: v.id,
        name: v.name,
        neighborhood: v.neighborhood,
        latitude: v.latitude,
        longitude: v.longitude,
      });
    }
  }, [nearbyVenues, selectedLocation]);

  const handleSelectNearbyVenue = useCallback((venue: NearbyVenue) => {
    console.log('[Post] Selecting nearby venue:', venue.name);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLocation({
      type: 'venue',
      venueId: venue.id,
      name: venue.name,
      neighborhood: venue.neighborhood,
      latitude: venue.latitude,
      longitude: venue.longitude,
    });
  }, []);

  const handleOpenLocationSelector = useCallback(() => {
    console.log('[Post] Opening location selector');
    void Haptics.selectionAsync();
    router.push('/location-selector');
  }, [router]);

  const totalSelected = useMemo(() => {
    return selectedTags.energy.length + selectedTags.crowd.length + selectedTags.mood.length;
  }, [selectedTags]);

  const currentStep = useMemo(() => {
    if (selectedTags.mood.length > 0) return 4;
    if (selectedTags.crowd.length > 0) return 3;
    if (selectedTags.energy.length > 0) return 2;
    return 1;
  }, [selectedTags]);

  const vibeLabel = useMemo(() => deriveVibeLabel(selectedTags), [selectedTags]);
  const energyScore = useMemo(() => deriveEnergyScore(selectedTags), [selectedTags]);

  const canSubmit = totalSelected > 0;

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

  const handlePickMedia = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[Post] Media picker not fully supported on web');
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to your photos to attach media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 15,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[Post] Media selected:', result.assets[0].uri);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[Post] Error picking media:', err);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[Post] Photo taken:', result.assets[0].uri);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[Post] Error taking photo:', err);
    }
  }, []);

  const handleRecordVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to record a video.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 15,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[Post] Video recorded:', result.assets[0].uri);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[Post] Error recording video:', err);
    }
  }, []);

  const handleMediaAction = useCallback(() => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'web') {
      void handlePickMedia();
      return;
    }
    Alert.alert('Capture in the moment', '', [
      { text: 'Take photo', onPress: () => void handleTakePhoto() },
      { text: 'Record video', onPress: () => void handleRecordVideo() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handlePickMedia, handleTakePhoto, handleRecordVideo]);

  const handleRemoveMedia = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaUri('');
  }, []);

  const locationName = selectedLocation?.name ?? 'Unknown';
  const locationNeighborhood = selectedLocation?.neighborhood ?? '';

  const submitPulseAnim = useRef(new Animated.Value(1)).current;
  const submitGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canSubmit) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(submitGlowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(submitGlowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    } else {
      submitGlowAnim.setValue(0);
    }
    return undefined;
  }, [canSubmit, submitGlowAnim]);

  const handlePostVibe = useCallback(() => {
    if (!canSubmit) {
      Alert.alert('Tap some vibes', 'Select at least one tag before posting.');
      return;
    }

    console.log('[Post] Saving vibe...', { selectedPrivacy, selectedTags, energyScore, caption, mediaUri, selectedLocation });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(submitPulseAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(submitPulseAnim, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();

    addVibe(
      {
        privacy: selectedPrivacy,
        energy: energyScore,
        caption,
        venue: locationName,
        neighborhood: locationNeighborhood,
        vibeLabel,
        tags: selectedTags,
        mediaUri,
      },
      {
        onSuccess: () => {
          console.log('[Post] Vibe saved successfully');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPosted(true);
          setTimeout(() => {
            setPosted(false);
            setSelectedTags({
              energy: [], crowd: [], mood: [], music: [], type: [], wait: [],
            });
            setCaption('');
            setMediaUri('');
            setSelectedLocation(null);
            setSelectedPrivacy(preferences.defaultPrivacy);
          }, 2800);
        },
        onError: (err) => {
          console.log('[Post] Error saving vibe:', err);
          Alert.alert('Error', 'Could not save your vibe. Please try again.');
        },
      }
    );
  }, [
    canSubmit, selectedPrivacy, selectedTags, selectedLocation,
    locationName, locationNeighborhood, energyScore, vibeLabel,
    caption, mediaUri, addVibe, preferences.defaultPrivacy, submitPulseAnim,
  ]);

  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successRingScale = useRef(new Animated.Value(0.5)).current;
  const successRingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (posted) {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1, friction: 5, tension: 200, useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(successRingScale, {
              toValue: 2.5, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
            Animated.timing(successRingOpacity, {
              toValue: 0, duration: 600, useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else {
      successScale.setValue(0.7);
      successOpacity.setValue(0);
      successRingScale.setValue(0.5);
      successRingOpacity.setValue(1);
    }
  }, [posted, successScale, successOpacity, successRingScale, successRingOpacity]);

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
            styles.successRing,
            {
              borderColor: colors.aqua,
              transform: [{ scale: successRingScale }],
              opacity: successRingOpacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.successCard,
            {
              backgroundColor: isDark ? '#0C1E26' : colors.surface,
              borderColor: `${colors.aqua}30`,
              transform: [{ scale: successScale }],
              opacity: successOpacity,
            },
          ]}
        >
          <View style={[styles.successIcon, { backgroundColor: colors.aqua }]}>
            <Check color={isDark ? colors.background : '#fff'} size={32} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            You're going out
          </Text>
          <Text style={[styles.successSub, { color: colors.textMuted }]}>
            Friends can see you tonight · {locationNeighborhood || 'Nearby'}
          </Text>
          <View style={styles.successTagRow}>
            {[...selectedTags.energy, ...selectedTags.crowd, ...selectedTags.mood]
              .slice(0, 5)
              .map((t) => (
                <View
                  key={t}
                  style={[styles.successTag, { backgroundColor: `${colors.aqua}18` }]}
                >
                  <Text style={[styles.successTagText, { color: colors.aqua }]}>{t}</Text>
                </View>
              ))}
          </View>
          <View style={[styles.successScoreBadge, { backgroundColor: `${colors.aqua}12` }]}>
            <Text style={[styles.successScoreText, { color: colors.aqua }]}>
              {energyScore} · {getVibeIntensityLabel(energyScore)}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  const currentPrivacy = privacyOptions.find((p) => p.id === selectedPrivacy);
  const PrivacyIcon = currentPrivacy?.icon ?? Globe2;

  const tabBarHeight = 70 + 18;
  const bgTint = totalSelected > 0 ? getVibeGradientColor(energyScore, isDark) : colors.background;

  return (
    <View
      style={[styles.screen, { backgroundColor: bgTint }]}
      testID="post-screen"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: 100 + tabBarHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${colors.aqua}18` }]}>
              <Zap color={colors.aqua} size={18} fill={colors.aqua} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                I&apos;m going
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSoft }]}>
                Let friends know what you&apos;re doing tonight
              </Text>
            </View>
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
            {isLocating && (
              <ActivityIndicator size="small" color={colors.aqua} style={{ marginLeft: 6 }} />
            )}
          </View>

          {selectedLocation && (
            <View style={[styles.selectedLocationCard, { backgroundColor: colors.surface, borderColor: `${colors.aqua}40` }]}>
              <View style={[styles.selectedLocationIcon, { backgroundColor: `${colors.aqua}18` }]}>
                {selectedLocation.type === 'custom' ? (
                  <Navigation color={colors.aqua} size={16} />
                ) : (
                  <MapPin color={colors.aqua} size={16} />
                )}
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={[styles.selectedLocationName, { color: colors.text }]} numberOfLines={1}>
                  {selectedLocation.name}
                </Text>
                {selectedLocation.neighborhood ? (
                  <Text style={[styles.selectedLocationNeighborhood, { color: colors.textSoft }]} numberOfLines={1}>
                    {selectedLocation.neighborhood}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={handleOpenLocationSelector}
                style={[styles.changeLocationBtn, { backgroundColor: `${colors.aqua}14` }]}
                hitSlop={8}
              >
                <Pencil color={colors.aqua} size={13} />
              </Pressable>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueScroll}
          >
            {nearbyVenues.slice(0, 5).map((v) => {
              const active = selectedLocation?.venueId === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => handleSelectNearbyVenue(v)}
                  style={[
                    styles.venueChip,
                    active
                      ? { backgroundColor: `${colors.aqua}18`, borderColor: colors.aqua }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.venueChipText, { color: active ? colors.aqua : colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {v.name}
                  </Text>
                  {v.distanceLabel && v.distanceLabel !== 'Nearby' ? (
                    <Text style={[styles.venueChipDist, { color: active ? colors.aqua : colors.textSoft }]}>
                      {v.distanceLabel}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={handleOpenLocationSelector}
            style={styles.changeLinkRow}
            hitSlop={6}
            testID="change-location-link"
          >
            <Pencil color={colors.textSoft} size={12} />
            <Text style={[styles.changeLinkText, { color: colors.textSoft }]}>
              Not your location? Tap to fix
            </Text>
          </Pressable>

          {!selectedLocation && (
            <PulsingPrompt onPress={handleOpenLocationSelector} colors={colors} />
          )}
        </View>

        {TAG_CATEGORIES.map((cat) => {
          const isActive = cat.step <= currentStep;
          const isCurrentStep = cat.step === currentStep;
          const hasSelections = selectedTags[cat.key].length > 0;

          return (
            <View
              key={cat.key}
              style={[
                styles.tagCard,
                {
                  backgroundColor: isDark
                    ? (hasSelections ? `${cat.glowColor}0.06)` : 'rgba(255,255,255,0.025)')
                    : (hasSelections ? `${cat.glowColor}0.05)` : 'rgba(0,0,0,0.02)'),
                  borderColor: hasSelections
                    ? `${cat.glowColor}0.2)`
                    : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                },
              ]}
            >
              <View style={styles.tagCardHeader}>
                <View style={styles.tagCardHeaderLeft}>
                  <View style={[styles.tagCardDot, { backgroundColor: isActive ? cat.color : colors.textSoft }]} />
                  <Text style={[styles.tagCardLabel, { color: isActive ? colors.text : colors.textSoft }]}>
                    {cat.label}
                  </Text>
                  {isCurrentStep && !hasSelections && (
                    <View style={[styles.nextBadge, { backgroundColor: `${cat.color}20` }]}>
                      <Text style={[styles.nextBadgeText, { color: cat.color }]}>next</Text>
                    </View>
                  )}
                </View>
                {hasSelections && (
                  <View style={[styles.tagCardCount, { backgroundColor: `${cat.color}20` }]}>
                    <Text style={[styles.tagCardCountText, { color: cat.color }]}>
                      {selectedTags[cat.key].length}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.tagRow}>
                {!isActive && !hasSelections ? (
                  <>
                    {cat.tags.slice(0, 3).map((_, i) => (
                      <PlaceholderTagPill key={i} colors={colors} isDark={isDark} />
                    ))}
                  </>
                ) : (
                  cat.tags.map((tag) => (
                    <MemoTagChip
                      key={tag}
                      tag={tag}
                      selected={selectedTags[cat.key].includes(tag)}
                      accentColor={cat.color}
                      glowColor={cat.glowColor}
                      onPress={() => handleTagToggle(cat.key, tag)}
                      colors={colors}
                      isDark={isDark}
                      dimmed={!isActive}
                    />
                  ))
                )}
              </View>
            </View>
          );
        })}

        <View style={[styles.tagCard, {
          backgroundColor: isDark ? 'rgba(43,191,186,0.06)' : 'rgba(26,158,153,0.05)',
          borderColor: isDark ? 'rgba(43,191,186,0.15)' : 'rgba(26,158,153,0.12)',
        }]}>
          <View style={styles.tagCardHeader}>
            <View style={styles.tagCardHeaderLeft}>
              <Ticket color={colors.aqua} size={16} />
              <Text style={[styles.tagCardLabel, { color: colors.text }]}>
                Pick an event
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/ticketing')}
            style={({ pressed }) => [
              styles.venueChip,
              {
                backgroundColor: isDark ? 'rgba(43,191,186,0.1)' : 'rgba(26,158,153,0.08)',
                borderColor: colors.aqua,
                opacity: pressed ? 0.8 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              },
            ]}
          >
            <Text style={[styles.venueChipText, { color: colors.aqua }]}>
              Browse tonight's events →
            </Text>
          </Pressable>
          <Text style={[styles.changeLinkText, { color: colors.textSoft, marginTop: 4 }]}>
            Optional — tag an event you're going to
          </Text>
        </View>

        <VibeMeter
          score={energyScore}
          totalSelected={totalSelected}
          colors={colors}
          isDark={isDark}
        />

        <LivePreviewCard
          tags={selectedTags}
          score={energyScore}
          caption={caption}
          locationName={locationName}
          mediaUri={mediaUri}
          colors={colors}
          isDark={isDark}
        />

        <View style={[styles.realTimeNote, { backgroundColor: isDark ? 'rgba(43,191,186,0.06)' : 'rgba(26,158,153,0.05)' }]}>
          <Zap color={colors.aqua} size={13} />
          <Text style={[styles.realTimeNoteText, { color: colors.aqua }]}>
            Friends can see when you're going out — and find you there.
          </Text>
        </View>

        <View
          style={[
            styles.mediaCommentCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          {mediaUri ? (
            <View style={styles.mediaPreviewSection}>
              <Image
                source={{ uri: mediaUri }}
                style={[styles.mediaPreview, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              />
              <View style={styles.mediaActions}>
                <Pressable
                  onPress={handleMediaAction}
                  style={[styles.mediaActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                >
                  <Camera color={colors.textMuted} size={14} />
                  <Text style={[styles.mediaActionBtnText, { color: colors.textMuted }]}>Change</Text>
                </Pressable>
                <Pressable
                  onPress={handleRemoveMedia}
                  style={[styles.mediaActionBtn, { backgroundColor: isDark ? 'rgba(232,86,74,0.12)' : 'rgba(224,85,69,0.08)' }]}
                >
                  <X color={colors.coral} size={14} />
                  <Text style={[styles.mediaActionBtnText, { color: colors.coral }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleMediaAction}
              style={({ pressed }) => [
                styles.mediaAddBtn,
                {
                  backgroundColor: isDark ? 'rgba(43,191,186,0.06)' : 'rgba(26,158,153,0.05)',
                  borderColor: isDark ? 'rgba(43,191,186,0.15)' : 'rgba(26,158,153,0.12)',
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.mediaAddIconWrap, { backgroundColor: `${colors.aqua}18` }]}>
                <ImagePlus color={colors.aqua} size={20} />
              </View>
              <Text style={[styles.mediaAddText, { color: colors.text }]}>Add a photo or video</Text>
              <Text style={[styles.mediaAddHint, { color: colors.textSoft }]}>Optional, but helps friends know what to expect</Text>
            </Pressable>
          )}

          <View style={[styles.commentDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />

          <View style={styles.commentSection}>
            <TextInput
              style={[styles.captionInput, { color: colors.text }]}
              placeholder="Add a note for friends…"
              placeholderTextColor={colors.textSoft}
              value={caption}
              onChangeText={(t) => setCaption(t.slice(0, 120))}
              maxLength={120}
              multiline
              returnKeyType="done"
              testID="caption-input"
            />
            <View style={styles.captionFooter}>
              <Text style={[styles.captionHelper, { color: colors.textSoft }]}>
                Let friends know what to expect
              </Text>
              <Text style={[styles.captionCount, { color: colors.textSoft }]}>
                {caption.length}/120
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? 'rgba(6,15,19,0.96)' : 'rgba(246,248,250,0.96)',
            paddingBottom: tabBarHeight + 8,
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomCount, { color: canSubmit ? colors.aqua : colors.textSoft }]}>
            {totalSelected}
          </Text>
          <Text style={[styles.bottomCountLabel, { color: colors.textMuted }]}>
            {totalSelected === 1 ? 'signal' : 'signals'}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: submitPulseAnim }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.postButton,
              {
                backgroundColor: canSubmit ? colors.aqua : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                opacity: isAddingVibe ? 0.6 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed && canSubmit ? 0.95 : 1 }],
              },
            ]}
            onPress={handlePostVibe}
            disabled={isAddingVibe || !canSubmit}
            testID="publish-vibe-button"
          >
            {canSubmit ? (
              <Animated.View
                style={[
                  styles.postButtonGlow,
                  {
                    opacity: submitGlowAnim,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                ]}
              />
            ) : null}
            <Send
              color={canSubmit ? (isDark ? colors.background : '#fff') : colors.textSoft}
              size={18}
            />
            <Text
              style={[
                styles.postButtonText,
                {
                  color: canSubmit ? (isDark ? colors.background : '#fff') : colors.textSoft,
                },
              ]}
            >
              {isAddingVibe ? 'Sending...' : canSubmit ? 'Let friends know' : 'Select tags first'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    gap: 18,
  },
  successScreen: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 32,
  },
  successRing: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  successCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center' as const,
    gap: 12,
    width: '100%',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 4,
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
    marginTop: 6,
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
  successScoreBadge: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  successScoreText: {
    fontSize: 14,
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
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
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
  venueChipDist: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  selectedLocationCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 4,
  },
  selectedLocationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  selectedLocationInfo: {
    flex: 1,
    gap: 1,
  },
  selectedLocationName: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  selectedLocationNeighborhood: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  changeLocationBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  changeLinkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginTop: 4,
    paddingVertical: 2,
  },
  changeLinkText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  realTimeNote: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  realTimeNoteText: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
    lineHeight: 17,
  },
  tagCard: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  tagCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  tagCardHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  tagCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagCardLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  nextBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  tagCardCount: {
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tagCardCountText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  tagRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    overflow: 'hidden' as const,
  },
  tagCheckIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tagText: {
    fontSize: 14,
  },
  vibeMeterCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  vibeMeterHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  vibeMeterLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  vibeMeterIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  vibeMeterLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  vibeMeterRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  vibeMeterScore: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  vibeMeterIntensityBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden' as const,
  },
  vibeMeterTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  vibeArcWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 4,
  },
  vibeArcCenter: {
    position: 'absolute' as const,
    top: 30,
    alignItems: 'center' as const,
    gap: 2,
  },
  vibeArcScore: {
    fontSize: 44,
    fontWeight: '900' as const,
    letterSpacing: -1.5,
  },
  vibeArcLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
  },
  vibeMeterFill: {
    height: '100%',
    borderRadius: 6,
  },
  vibeMeterTick: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 1,
  },
  vibeMeterLabelsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 2,
  },
  vibeMeterRangeLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  vibeMeterHint: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginTop: 2,
  },
  mediaCommentCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  mediaPreviewSection: {
    padding: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
  },
  mediaActions: {
    flex: 1,
    gap: 8,
  },
  mediaActionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaActionBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  mediaAddBtn: {
    alignItems: 'center' as const,
    gap: 8,
    padding: 22,
    margin: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
  },
  mediaAddIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mediaAddText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  mediaAddHint: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  commentDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  commentSection: {
    padding: 14,
    gap: 6,
  },
  captionInput: {
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 0,
    minHeight: 44,
  },
  captionFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  captionHelper: {
    fontSize: 11,
    fontWeight: '500' as const,
    flex: 1,
  },
  captionCount: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  livePreviewCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  livePreviewHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  livePreviewIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  livePreviewTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  livePreviewInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  livePreviewBody: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  livePreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  livePreviewContent: {
    flex: 1,
    gap: 6,
  },
  livePreviewLocRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  livePreviewLocation: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  livePreviewTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  livePreviewTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  livePreviewTagText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  livePreviewCaption: {
    fontSize: 13,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
  },
  livePreviewFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 2,
  },
  livePreviewScoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePreviewScoreLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
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
    paddingTop: 14,
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
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
    overflow: 'hidden' as const,
  },
  postButtonGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
