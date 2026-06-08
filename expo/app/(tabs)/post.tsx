import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  ImagePlus,
  Lock,
  MapPin,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';

import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue } from '@/types/venue';

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

const nearbyVenues = pulzeVenues.slice(0, 6);

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { addVibe, isAddingVibe, preferences } = useData();

  const [selectedVenue, setSelectedVenue] = useState<PulzeVenue | null>(nearbyVenues[0] ?? null);
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption['id']>(preferences.defaultPrivacy);
  const [caption, setCaption] = useState<string>('');
  const [mediaUri, setMediaUri] = useState<string>('');
  const [posted, setPosted] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);

  const handleSelectVenue = useCallback((venue: PulzeVenue) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVenue(venue);
  }, []);

  const handlePickMedia = useCallback(async () => {
    if (Platform.OS === 'web') {
      void handleTakePhoto();
      return;
    }
    Alert.alert('Add a photo', '', [
      { text: 'Take photo', onPress: () => void handleTakePhoto() },
      { text: 'Pick from library', onPress: () => void handlePickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[CheckIn] Error taking photo:', err);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to your photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[CheckIn] Error picking photo:', err);
    }
  }, []);

  const handleRemoveMedia = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaUri('');
  }, []);

  const handlePrivacyPress = useCallback((privacyId: PrivacyOption['id']) => {
    void Haptics.selectionAsync();
    setSelectedPrivacy(privacyId);
    setShowPrivacy(false);
  }, []);

  const handleCheckIn = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!selectedVenue) {
      Alert.alert('Pick a spot', 'Select a venue you made it to.');
      return;
    }

    const venueName = selectedVenue.name;
    const neighborhood = selectedVenue.neighborhood;

    addVibe(
      {
        privacy: selectedPrivacy,
        energy: 75,
        caption,
        venue: venueName,
        neighborhood,
        vibeLabel: `I made it to ${venueName}`,
        tags: {
          energy: [],
          crowd: [],
          mood: [],
          music: [],
          type: [],
          wait: [],
        },
        mediaUri,
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPosted(true);
          setTimeout(() => {
            setPosted(false);
            setCaption('');
            setMediaUri('');
            setSelectedVenue(nearbyVenues[0] ?? null);
            setSelectedPrivacy(preferences.defaultPrivacy);
          }, 2800);
        },
        onError: (err) => {
          console.log('[CheckIn] Error saving:', err);
          Alert.alert('Error', 'Could not save your check-in. Please try again.');
        },
      }
    );
  }, [selectedVenue, selectedPrivacy, caption, mediaUri, addVibe, preferences.defaultPrivacy]);

  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (posted) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      successScale.setValue(0.7);
      successOpacity.setValue(0);
    }
  }, [posted, successScale, successOpacity]);

  if (posted) {
    return (
      <View
        style={[styles.screen, styles.successScreen, { backgroundColor: colors.background, paddingTop: insets.top + 14 }]}
      >
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
            I made it!
          </Text>
          <Text style={[styles.successSub, { color: colors.textMuted }]}>
            {selectedVenue?.name ?? 'Unknown'} · {selectedVenue?.neighborhood ?? ''}
          </Text>
        </Animated.View>
      </View>
    );
  }

  const currentPrivacy = privacyOptions.find((p) => p.id === selectedPrivacy);
  const PrivacyIcon = currentPrivacy?.icon ?? Globe2;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="checkin-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${colors.aqua}18` }]}>
              <Sparkles color={colors.aqua} size={18} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>I made it</Text>
              <Text style={[styles.headerSub, { color: colors.textSoft }]}>Snap a pic to show you're out</Text>
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
            <Text style={[styles.privacyLabel, { color: colors.textMuted }]}>
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
                >
                  <Icon color={active ? colors.aqua : colors.textSoft} size={14} />
                  <Text style={[styles.privacyChipText, { color: active ? colors.aqua : colors.textMuted }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Photo picker */}
        <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {mediaUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: mediaUri }} style={styles.photoPreview} />
              <View style={styles.photoActions}>
                <Pressable
                  onPress={handlePickMedia}
                  style={[styles.photoActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                >
                  <Camera color={colors.textMuted} size={14} />
                  <Text style={[styles.photoActionText, { color: colors.textMuted }]}>Change</Text>
                </Pressable>
                <Pressable
                  onPress={handleRemoveMedia}
                  style={[styles.photoActionBtn, { backgroundColor: colors.dangerBg }]}
                >
                  <X color={colors.danger} size={14} />
                  <Text style={[styles.photoActionText, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handlePickMedia}
              style={({ pressed }) => [
                styles.photoAddBtn,
                {
                  backgroundColor: isDark ? 'rgba(43,191,186,0.05)' : 'rgba(26,158,153,0.04)',
                  borderColor: isDark ? 'rgba(43,191,186,0.12)' : 'rgba(26,158,153,0.10)',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.photoAddIcon, { backgroundColor: `${colors.aqua}18` }]}>
                <Camera color={colors.aqua} size={28} />
              </View>
              <Text style={[styles.photoAddTitle, { color: colors.text }]}>Snap a photo</Text>
              <Text style={[styles.photoAddHint, { color: colors.textSoft }]}>Show everyone you made it</Text>
            </Pressable>
          )}
        </View>

        {/* Venue picker */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <MapPin color={colors.textSoft} size={14} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Where are you?</Text>
          </View>
          <View style={styles.venueGrid}>
            {nearbyVenues.map((v) => {
              const active = selectedVenue?.id === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => handleSelectVenue(v)}
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
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Caption */}
        <View style={[styles.captionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.captionInput, { color: colors.text }]}
            placeholder="Add a note... (optional)"
            placeholderTextColor={colors.textSoft}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, 120))}
            maxLength={120}
            multiline
            returnKeyType="done"
            testID="checkin-caption"
          />
          <Text style={[styles.captionCount, { color: colors.textSoft }]}>
            {caption.length}/120
          </Text>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? 'rgba(6,12,16,0.96)' : 'rgba(246,248,250,0.96)',
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            paddingBottom: 80,
          },
        ]}
      >
        <Pressable
          onPress={handleCheckIn}
          disabled={isAddingVibe}
          style={({ pressed }) => [
            styles.checkInBtn,
            {
              backgroundColor: colors.aqua,
              opacity: isAddingVibe ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          testID="checkin-submit"
        >
          <Send color={isDark ? colors.background : '#fff'} size={18} />
          <Text style={[styles.checkInBtnText, { color: isDark ? colors.background : '#fff' }]}>
            {isAddingVibe ? 'Posting...' : 'I made it'}
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
    gap: 18,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  headerSub: {
    fontSize: 12,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  privacyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  privacyChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  photoCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  photoPreviewWrap: {},
  photoPreview: {
    width: '100%',
    height: 280,
    resizeMode: 'cover' as const,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  photoAddBtn: {
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    gap: 10,
  },
  photoAddIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  photoAddTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  photoAddHint: {
    fontSize: 13,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  venueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  venueChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  venueChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  captionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  captionInput: {
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  captionCount: {
    fontSize: 11,
    textAlign: 'right' as const,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkInBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
