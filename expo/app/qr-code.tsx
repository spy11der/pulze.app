import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Copy,
  Download,
  Link,
  QrCode,
  Share2,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import {
  currentUser,
  generateQRCodeUrl,
  generateQRCodeUrlLight,
} from '@/constants/identity';

export default function QRCodeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  const qrUrl = isDark
    ? generateQRCodeUrl(currentUser.profileUrl, 600)
    : generateQRCodeUrlLight(currentUser.profileUrl, 600);

  const handleCopyId = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'web') {
      await Clipboard.setStringAsync(currentUser.pulzeId);
    }
    console.log('[QR] Copied Pulze ID:', currentUser.pulzeId);
  }, []);

  const handleCopyLink = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'web') {
      await Clipboard.setStringAsync(currentUser.profileUrl);
    }
    console.log('[QR] Copied profile link:', currentUser.profileUrl);
  }, []);

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Add me on Pulze! ${currentUser.profileUrl}`,
        url: currentUser.profileUrl,
      });
    } catch (e) {
      console.log('[QR] Share error:', e);
    }
  }, []);

  const handleDownload = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[QR] Download QR code requested');
  }, []);

  const handleClose = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="qr-code-screen">
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.topBar}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>My QR Code</Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.surface }, pressed && styles.pressed]}
            testID="qr-close-btn"
          >
            <X color={colors.textMuted} size={20} />
          </Pressable>
        </View>

        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: glowOpacity,
                borderColor: colors.aqua,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.18)' : 'rgba(92, 168, 48, 0.12)' }]}>
                <Text style={[styles.avatarText, { color: colors.lime }]}>{currentUser.avatarInitials}</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardName, { color: colors.text }]}>{currentUser.displayName}</Text>
                <Text style={[styles.cardHandle, { color: colors.aqua }]}>@{currentUser.username}</Text>
              </View>
            </View>

            <View style={[styles.qrWrapper, { backgroundColor: isDark ? '#0D2831' : '#F0F4F6' }]}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
                testID="qr-image"
              />
            </View>

            <View style={styles.cardFooter}>
              <Pressable
                onPress={handleCopyId}
                style={({ pressed }) => [styles.idBadge, { backgroundColor: colors.aqua + '18' }, pressed && styles.pressed]}
                testID="qr-id-badge"
              >
                <QrCode color={colors.aqua} size={14} />
                <Text style={[styles.idText, { color: colors.aqua }]}>{currentUser.pulzeId}</Text>
                <Copy color={colors.aqua} size={11} />
              </Pressable>
              <Text style={[styles.scanLabel, { color: colors.textSoft }]}>Scan to add on Pulze</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            icon={Copy}
            label="Copy ID"
            onPress={handleCopyId}
          />
          <ActionButton
            icon={Link}
            label="Copy Link"
            onPress={handleCopyLink}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            onPress={handleShare}
          />
          <ActionButton
            icon={Download}
            label="Download"
            onPress={handleDownload}
          />
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Copy;
  label: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
        <Icon color={colors.aqua} size={18} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 340,
    height: 480,
    borderRadius: 36,
    borderWidth: 2,
  },
  card: {
    width: 320,
    borderRadius: 32,
    borderWidth: 1,
    padding: 28,
    gap: 24,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  cardHeaderText: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  cardHandle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  qrWrapper: {
    width: 240,
    height: 240,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrImage: {
    width: 208,
    height: 208,
    borderRadius: 8,
  },
  cardFooter: {
    alignItems: 'center',
    gap: 10,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  idText: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  scanLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
