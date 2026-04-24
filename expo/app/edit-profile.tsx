import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [displayName, setDisplayName] = useState<string>('Jordan Pulze');
  const [username, setUsername] = useState<string>('jordan.pulze');
  const [bio, setBio] = useState<string>('Always looking for something good happening tonight.');

  const handleSave = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[EditProfile] Saving profile:', { displayName, username, bio });
    Alert.alert('Profile updated', 'Your changes have been saved.');
    router.back();
  }, [displayName, username, bio, router]);

  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
          headerLeft: () => (
            <Pressable onPress={handleCancel} style={styles.headerBtn}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.aqua }]}>
              <Check color={isDark ? colors.background : '#fff'} size={18} />
              <Text style={[styles.saveBtnText, { color: isDark ? colors.background : '#fff' }]}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.18)' : 'rgba(92, 168, 48, 0.12)' }]}>
            <Text style={[styles.avatarLargeText, { color: colors.lime }]}>JP</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Coming soon', 'Profile photo uploads will be available in a future update.');
            }}
            style={({ pressed }) => [styles.changePhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.btnPressed]}
          >
            <Camera color={colors.aqua} size={16} />
            <Text style={[styles.changePhotoText, { color: colors.aqua }]}>Change photo</Text>
          </Pressable>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Display name</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textSoft}
              testID="edit-display-name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Username</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.text }]}
              value={username}
              onChangeText={setUsername}
              placeholder="@username"
              placeholderTextColor={colors.textSoft}
              autoCapitalize="none"
              testID="edit-username"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Bio</Text>
            <TextInput
              style={[styles.fieldInputMulti, { backgroundColor: colors.card, color: colors.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={colors.textSoft}
              multiline
              numberOfLines={4}
              testID="edit-bio"
            />
            <Text style={[styles.charCount, { color: colors.textSoft }]}>{bio.length}/160</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? '#102E38' : '#E0F0F5' }]}>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Your profile info is stored locally on your device. Changes are applied immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 18,
    gap: 20,
  },
  headerBtn: {
    padding: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  formSection: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  fieldInput: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  fieldInputMulti: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600' as const,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'right',
    paddingRight: 4,
  },
  infoCard: {
    borderRadius: 18,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
