import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import {
  Camera,
  Check,
  ChevronRight,
  Globe2,
  Lock,
  MapPin,
  Navigation,
  Pencil,
  Send,
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
  tags: string[];
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    key: 'energy',
    label: 'Energy',
    color: '#A5F05C',
    tags: ['chill', 'steady', 'turnt', 'packed'],
  },
  {
    key: 'crowd',
    label: 'Crowd',
    color: '#35D4CF',
    tags: ['empty', 'light', 'medium', 'full'],
  },
  {
    key: 'mood',
    label: 'Mood',
    color: '#FF6D5E',
    tags: ['good vibes', 'lit', 'relaxed', 'upscale'],
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
    ...tags.mood,
  ];
  if (allTags.length === 0) return 'No vibe yet';
  return allTags.slice(0, 3).join(' · ');
}

function deriveEnergyScore(tags: VibeTags): number {
  const energyMap: Record<string, number> = {
    chill: 25,
    steady: 50,
    turnt: 78,
    packed: 95,
  };
  const crowdMap: Record<string, number> = {
    empty: 10,
    light: 30,
    medium: 55,
    full: 80,
  };
  const moodMap: Record<string, number> = {
    relaxed: 25,
    'good vibes': 55,
    upscale: 60,
    lit: 85,
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
    energy: [],
    crowd: [],
    mood: [],
    music: [],
    type: [],
    wait: [],
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

  const handleMediaAction = useCallback(() => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'web') {
      void handlePickMedia();
      return;
    }
    Alert.alert('Add media', '', [
      { text: 'Take photo', onPress: () => void handleTakePhoto() },
      { text: 'Choose from gallery', onPress: () => void handlePickMedia() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handlePickMedia, handleTakePhoto]);

  const handleRemoveMedia = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaUri('');
  }, []);

  const locationName = selectedLocation?.name ?? 'Unknown';
  const locationNeighborhood = selectedLocation?.neighborhood ?? '';

  const handlePostVibe = useCallback(() => {
    if (totalSelected === 0) {
      Alert.alert('Tap some vibes', 'Select at least one tag before posting.');
      return;
    }

    console.log('[Post] Saving vibe...', { selectedPrivacy, selectedTags, energyScore, caption, mediaUri, selectedLocation });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
          setPosted(true);
          setTimeout(() => {
            setPosted(false);
            setSelectedTags({
              energy: [],
              crowd: [],
              mood: [],
              music: [],
              type: [],
              wait: [],
            });
            setCaption('');
            setMediaUri('');
            setSelectedLocation(null);
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
    selectedLocation,
    locationName,
    locationNeighborhood,
    energyScore,
    vibeLabel,
    caption,
    mediaUri,
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
            {totalSelected} tags · {locationNeighborhood || 'Nearby'}
          </Text>
          <View style={styles.successTagRow}>
            {[...selectedTags.energy, ...selectedTags.crowd, ...selectedTags.mood]
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

  const bottomBarHeight = 60 + insets.bottom + 12;
  const tabBarHeight = 70 + 18;

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID="post-screen"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: bottomBarHeight + tabBarHeight + 16,
          },
        ]}
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
            {isLocating && (
              <ActivityIndicator size="small" color={colors.aqua} style={{ marginLeft: 6 }} />
            )}
          </View>

          {selectedLocation && (
            <View style={[styles.selectedLocationCard, { backgroundColor: colors.surface, borderColor: colors.aqua }]}>
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
                    numberOfLines={1}
                  >
                    {v.name}
                  </Text>
                  {v.distanceLabel && v.distanceLabel !== 'Here' ? (
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
              Wrong location? Change it
            </Text>
          </Pressable>
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

        <View style={styles.mediaSection}>
          {mediaUri ? (
            <View style={styles.mediaPreviewWrap}>
              <Image
                source={{ uri: mediaUri }}
                style={[styles.mediaPreview, { borderColor: colors.border }]}
              />
              <Pressable
                onPress={handleRemoveMedia}
                style={[styles.mediaRemoveBtn, { backgroundColor: colors.coral }]}
              >
                <X color="#fff" size={14} />
              </Pressable>
              <Pressable
                onPress={handleMediaAction}
                style={[styles.mediaChangeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Camera color={colors.textMuted} size={14} />
                <Text style={[styles.mediaChangeBtnText, { color: colors.textMuted }]}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.mediaButtonRow}>
              <Pressable
                onPress={handleMediaAction}
                style={[styles.mediaAddBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Camera color={colors.aqua} size={18} />
                <Text style={[styles.mediaAddText, { color: colors.textMuted }]}>Add photo or video</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.captionWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.captionInput, { color: colors.text }]}
            placeholder="what's the vibe?"
            placeholderTextColor={colors.textSoft}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, 80))}
            maxLength={80}
            returnKeyType="done"
            testID="caption-input"
          />
          <Text style={[styles.captionCount, { color: colors.textSoft }]}>
            {caption.length}/80
          </Text>
        </View>

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
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSoft }]}>
                VIBE PREVIEW
              </Text>
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
            </View>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {vibeLabel}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: tabBarHeight + 8,
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
  mediaSection: {
    marginTop: 2,
  },
  mediaButtonRow: {
    flexDirection: 'row' as const,
  },
  mediaAddBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
  },
  mediaAddText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  mediaPreviewWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  mediaPreview: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
  },
  mediaRemoveBtn: {
    position: 'absolute' as const,
    top: -6,
    left: 62,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mediaChangeBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  mediaChangeBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  captionWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  captionInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 0,
  },
  captionCount: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  previewStrip: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  previewRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700' as const,
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
