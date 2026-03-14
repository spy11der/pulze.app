import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, Globe2, Lock, Users } from 'lucide-react-native';

import { useData } from '@/providers/DataProvider';
import { useTheme } from '@/providers/ThemeProvider';

interface PrivacyOption {
  id: 'public' | 'friends' | 'private';
  label: string;
  icon: typeof Globe2;
}

const privacyOptions: PrivacyOption[] = [
  { id: 'public', label: 'Public vibe only', icon: Globe2 },
  { id: 'friends', label: 'Friends can see the post', icon: Users },
  { id: 'private', label: 'Save just for me', icon: Lock },
];

const energyOptions: number[] = [12, 28, 46, 67, 88];

const venues = [
  { name: 'Mica Rooftop', neighborhood: 'Warehouse District' },
  { name: 'Paper Moon Cafe', neighborhood: 'East Garden' },
  { name: 'Juniper Square', neighborhood: 'North Loop' },
  { name: 'Harbor Reading Lawn', neighborhood: 'Seaport Edge' },
  { name: 'Neon Alley', neighborhood: 'Lower East' },
];

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { addVibe, isAddingVibe, preferences } = useData();

  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption['id']>(preferences.defaultPrivacy);
  const [selectedEnergy, setSelectedEnergy] = useState<number>(67);
  const [caption, setCaption] = useState<string>('');
  const [selectedVenueIdx, setSelectedVenueIdx] = useState<number>(0);
  const [posted, setPosted] = useState<boolean>(false);

  const vibePreview = useMemo(() => {
    if (selectedEnergy < 25) return 'Quiet enough to stay for a while';
    if (selectedEnergy < 55) return 'Easy social energy';
    if (selectedEnergy < 80) return 'Busy and alive';
    return 'Packed and peaking';
  }, [selectedEnergy]);

  const handlePrivacyPress = useCallback((privacyId: PrivacyOption['id']) => {
    console.log('Updating post privacy', privacyId);
    void Haptics.selectionAsync();
    setSelectedPrivacy(privacyId);
  }, []);

  const handleEnergyPress = useCallback((energy: number) => {
    console.log('Updating vibe energy', energy);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEnergy(energy);
  }, []);

  const handlePostVibe = useCallback(() => {
    const venue = venues[selectedVenueIdx];
    console.log('[Post] Saving vibe to SQLite...', { selectedPrivacy, selectedEnergy, caption });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    addVibe(
      {
        privacy: selectedPrivacy,
        energy: selectedEnergy,
        caption: caption || 'No note added',
        venue: venue.name,
        neighborhood: venue.neighborhood,
        vibeLabel: vibePreview,
      },
      {
        onSuccess: () => {
          console.log('[Post] Vibe saved successfully');
          setPosted(true);
          setTimeout(() => {
            setPosted(false);
            setCaption('');
            setSelectedEnergy(67);
            setSelectedPrivacy(preferences.defaultPrivacy);
          }, 2200);
        },
        onError: (err) => {
          console.log('[Post] Error saving vibe:', err);
          Alert.alert('Error', 'Could not save your vibe. Please try again.');
        },
      }
    );
  }, [selectedPrivacy, selectedEnergy, caption, selectedVenueIdx, vibePreview, addVibe, preferences.defaultPrivacy]);

  if (posted) {
    return (
      <View style={[styles.screen, styles.successScreen, { backgroundColor: colors.background, paddingTop: insets.top + 14 }]} testID="post-success">
        <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.aqua }]}>
            <Check color={isDark ? colors.background : '#fff'} size={32} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Vibe dropped</Text>
          <Text style={[styles.successSub, { color: colors.textMuted }]}>Saved locally to your device</Text>
          <View style={[styles.successMeta, { backgroundColor: colors.card }]}>
            <Text style={[styles.successMetaText, { color: colors.aqua }]}>{vibePreview} · {venues[selectedVenueIdx].neighborhood}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="post-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kicker, { color: colors.aqua }]}>Drop vibe</Text>
          <Text style={[styles.title, { color: colors.text }]}>Share the feeling, not more than you want.</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your vibes are stored securely on your device using SQLite.</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueRow}>
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
                    { backgroundColor: active ? (isDark ? 'rgba(53, 212, 207, 0.15)' : 'rgba(26, 168, 163, 0.1)') : colors.card, borderColor: active ? colors.aqua : colors.border },
                  ]}
                >
                  <Text style={[styles.venueChipText, { color: active ? colors.aqua : colors.textMuted }]}>{v.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
          {privacyOptions.map((option) => {
            const Icon = option.icon;
            const active = option.id === selectedPrivacy;
            return (
              <Pressable
                key={option.id}
                onPress={() => handlePrivacyPress(option.id)}
                style={[
                  styles.optionRow,
                  { backgroundColor: active ? (isDark ? 'rgba(103, 242, 229, 0.16)' : 'rgba(26, 168, 163, 0.08)') : colors.card },
                  active ? { borderWidth: 1, borderColor: colors.borderStrong } : null,
                ]}
                testID={`privacy-option-${option.id}`}
              >
                <View style={[styles.optionIcon, active ? { backgroundColor: colors.aqua } : { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
                  <Icon color={active ? (isDark ? colors.background : '#fff') : colors.aqua} size={18} />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How does it feel right now?</Text>
          <View style={styles.energyRow}>
            {energyOptions.map((energy) => {
              const active = energy === selectedEnergy;
              return (
                <Pressable
                  key={energy}
                  onPress={() => handleEnergyPress(energy)}
                  style={[styles.energyButton, { backgroundColor: active ? colors.aqua : colors.card }]}
                  testID={`energy-${energy}`}
                >
                  <Text style={[styles.energyText, { color: active ? (isDark ? colors.background : '#fff') : colors.text }]}>{energy}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.energyLabel, { color: colors.lime }]}>{vibePreview}</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Private note</Text>
          <TextInput
            multiline
            numberOfLines={5}
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write what you noticed. Only the vibe summary can be public."
            placeholderTextColor={colors.textSoft}
            testID="post-caption-input"
          />
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Coming soon', 'Photo and video attachments will be available in a future update.');
            }}
            style={({ pressed }) => [styles.mediaButton, { borderColor: colors.borderStrong }, pressed && styles.mediaButtonPressed]}
            testID="add-media-button"
          >
            <Camera color={colors.aqua} size={18} />
            <Text style={[styles.mediaButtonText, { color: colors.aqua }]}>Add photo or short video</Text>
          </Pressable>
        </View>

        <View style={[styles.previewCard, { backgroundColor: isDark ? '#122D39' : '#E0F0F5' }]} testID="post-preview-card">
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>What others see</Text>
          <Text style={[styles.previewTitle, { color: colors.text }]}>{vibePreview}</Text>
          <Text style={[styles.previewBody, { color: colors.textMuted }]}>{venues[selectedVenueIdx].neighborhood} · posted now · {selectedPrivacy === 'public' ? 'Vibe only' : selectedPrivacy === 'friends' ? 'Friends get details' : 'Private save'}</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.aqua }, isAddingVibe && styles.primaryButtonDisabled]}
          onPress={handlePostVibe}
          disabled={isAddingVibe}
          testID="publish-vibe-button"
        >
          <Text style={[styles.primaryButtonText, { color: isDark ? colors.background : '#fff' }]}>{isAddingVibe ? 'Saving...' : 'Post vibe'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  successScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
  },
  successSub: {
    fontSize: 15,
  },
  successMeta: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  successMetaText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    gap: 10,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  venueRow: { gap: 8 },
  venueChip: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  venueChipText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  optionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderRadius: 18,
    padding: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  energyRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
  },
  energyButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  energyText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  input: {
    minHeight: 110,
    borderRadius: 18,
    fontSize: 15,
    textAlignVertical: 'top' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mediaButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
  },
  mediaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  previewCard: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
});
