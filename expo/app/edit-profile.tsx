import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { uploadAvatar, deletePreviousAvatar } from '@/services/avatar';

import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState<string>(user?.displayName ?? '');
  const [username, setUsername] = useState<string>(user?.username ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) {
      setIsLoadingProfile(false);
      return;
    }
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.log('[EditProfile] Load error:', error.message);
          return;
        }
        const profile = data as
          | { display_name: string | null; username: string | null }
          | null;
        if (profile) {
          if (profile.display_name) setDisplayName(profile.display_name);
          if (profile.username) setUsername(profile.username);
        }
      } catch (e) {
        console.log('[EditProfile] Load exception:', e);
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user?.id) {
      Alert.alert('Not signed in', 'You must be signed in to update your profile.');
      return;
    }
    setIsSaving(true);
    console.log('[EditProfile] Saving profile:', { displayName, username });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, username })
        .eq('id', user.id);

      if (error) {
        console.log('[EditProfile] Save error:', error.message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Could not save', error.message);
        setIsSaving(false);
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          username,
        },
      });

      if (authError) {
        console.log('[EditProfile] Auth update error:', authError.message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Could not save', authError.message);
        setIsSaving(false);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile updated', 'Your changes have been saved.');
      setIsSaving(false);
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[EditProfile] Save exception:', message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not save', message);
      setIsSaving(false);
    }
  }, [displayName, username, router, user, isSaving]);

  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    const computed = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    return computed || displayName[0] || 'P';
  }, [displayName]);

  const handleChangePhoto = useCallback(async () => {
    if (isUploadingAvatar) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user?.id) {
      Alert.alert('Not signed in', 'You must be signed in to update your profile photo.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    setIsUploadingAvatar(true);
    try {
      // Store the raw object path in the DB / auth metadata (bucket is
      // private now) and use the freshly-issued signed URL only for the
      // in-screen preview.
      const { path, signedUrl } = await uploadAvatar(user.id, asset.uri);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', user.id);
      if (profileError) {
        console.log('[EditProfile] Avatar profile update error:', profileError.message);
        void deletePreviousAvatar(user.id, path);
        Alert.alert('Could not save', profileError.message);
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: path },
      });
      if (authError) {
        console.log('[EditProfile] Avatar auth update error:', authError.message);
        Alert.alert('Could not save', authError.message);
        return;
      }

      const previous = avatarUrl;
      setAvatarUrl(signedUrl);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (previous && previous !== signedUrl) {
        void deletePreviousAvatar(user.id, previous);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      console.log('[EditProfile] Avatar upload exception:', message);
      Alert.alert('Could not save', message);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [avatarUrl, isUploadingAvatar, user]);

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
            <Pressable
              onPress={handleSave}
              disabled={isSaving || isLoadingProfile}
              style={[styles.saveBtn, { backgroundColor: colors.aqua, opacity: (isSaving || isLoadingProfile) ? 0.7 : 1 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={isDark ? colors.background : '#fff'} />
              ) : (
                <Check color={isDark ? colors.background : '#fff'} size={18} />
              )}
              <Text style={[styles.saveBtnText, { color: isDark ? colors.background : '#fff' }]}>
                {isSaving ? 'Saving…' : 'Save'}
              </Text>
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
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarLargeText, { color: colors.lime }]}>{initials.toUpperCase()}</Text>
            )}
          </View>
          <Pressable
            onPress={() => { void handleChangePhoto(); }}
            disabled={isUploadingAvatar}
            style={({ pressed }) => [styles.changePhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.btnPressed]}
          >
            <Camera color={colors.aqua} size={16} />
            <Text style={[styles.changePhotoText, { color: colors.aqua }]}>
              {isUploadingAvatar ? 'Uploading…' : 'Change photo'}
            </Text>
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

        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? '#102E38' : '#E0F0F5' }]}>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Your profile info is saved to your Pulze account. Changes are applied immediately.
          </Text>
        </View>
      </ScrollView>
      {isLoadingProfile && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.aqua} />
        </View>
      )}
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
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 32,
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
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  fieldInput: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600' as const,
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
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
