import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ban, Flag, MoreHorizontal, ShieldCheck, Trash2, UserX } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { type FriendCheckInFeedItem } from '@/mocks/friends';
import { getCheckInById } from '@/services/crewFeed';
import { resolveVenueById } from '@/services/venues';
import { hasReliableBusyness, type PulzeVenue } from '@/types/venue';
import { useAuth } from '@/providers/AuthProvider';
import {
  blockUser,
  deleteMyCheckIn,
  getMyCheckInVerification,
  verificationLabel,
  type VerificationOutcome,
} from '@/services/safety';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { ReportSheet } from '@/components/ReportSheet';

export default function CheckinDetailScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ checkInId: string }>();

  const [checkIn, setCheckIn] = useState<FriendCheckInFeedItem | null>(null);
  const [venue, setVenue] = useState<PulzeVenue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const myId = user?.id;
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [report, setReport] = useState<{ kind: 'user' | 'check_in'; id: string; label: string } | null>(null);
  const [verification, setVerification] = useState<VerificationOutcome | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const isMine = !!checkIn && !!myId && checkIn.friendId === myId;

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const item = await getCheckInById(params.checkInId);
      if (!cancelled) {
        setCheckIn(item);
        setLoading(false);
      }
    };
    void resolve();
    return () => { cancelled = true; };
  }, [params.checkInId]);

  useEffect(() => {
    if (!checkIn) return;
    let cancelled = false;
    resolveVenueById(checkIn.venueId).then((v) => { if (!cancelled) setVenue(v); });
    return () => { cancelled = true; };
  }, [checkIn]);

  useEffect(() => {
    if (!isMine || !checkIn) return;
    let cancelled = false;
    getMyCheckInVerification(checkIn.id).then((v) => { if (!cancelled) setVerification(v); });
    return () => { cancelled = true; };
  }, [isMine, checkIn]);

  const confirmDelete = useCallback(() => {
    if (!checkIn) return;
    Alert.alert('Delete check-in?', "It will be removed for everyone, along with its photo. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const result = await deleteMyCheckIn(checkIn.id);
          setDeleting(false);
          if (!result.ok) {
            Alert.alert('Could not delete', result.error);
            return;
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // The feed and history refresh when they regain focus.
          router.back();
        },
      },
    ]);
  }, [checkIn, router]);

  const confirmBlock = useCallback(() => {
    if (!checkIn || !myId) return;
    Alert.alert(
      `Block ${checkIn.friendName}?`,
      "You won't see each other's check-ins or be able to send friend requests. Any friendship between you ends. They aren't notified.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockUser(myId, checkIn.friendId);
            if (!result.ok) {
              Alert.alert('Could not block', result.error);
              return;
            }
            // This check-in is no longer visible to us: leave the screen.
            router.back();
          },
        },
      ],
    );
  }, [checkIn, myId, router]);

  const menuActions: SheetAction[] = !checkIn ? [] : isMine
    ? [{ id: 'delete', label: 'Delete check-in', subtitle: 'Removes it and its photo for everyone', icon: Trash2, destructive: true, onPress: confirmDelete }]
    : [
        { id: 'report-checkin', label: 'Report check-in', icon: Flag, destructive: true,
          onPress: () => setReport({ kind: 'check_in', id: checkIn.id, label: `${checkIn.friendName} at ${checkIn.venueName}` }) },
        { id: 'report-user', label: 'Report profile', icon: UserX, destructive: true,
          onPress: () => setReport({ kind: 'user', id: checkIn.friendId, label: `@${checkIn.friendHandle}` }) },
        { id: 'block', label: `Block ${checkIn.friendName}`, icon: Ban, destructive: true, onPress: confirmBlock },
      ];

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // Tight to the header content — vertically-centered avatar + name +
  // sub-row is ~60px, so ~13% of the viewport gives just enough breathing
  // room around it. The old 0.23 left ~140px of dark surface staring at
  // the user before the photo.
  const topPanelHeight = Math.round(screenHeight * 0.13);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notFound, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!checkIn) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notFound, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Check-in not found</Text>
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.aqua }]}>
            <Text style={[styles.backBtnText, { color: isDark ? colors.background : '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Only a figure backed by live signal; otherwise nothing (see hasReliableBusyness).
  const busynessPercent = venue && hasReliableBusyness(venue) ? `${venue.busynessPercent}%` : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topPanel, { backgroundColor: colors.surface, height: topPanelHeight, paddingTop: insets.top }]}>
        <View style={styles.panelContent}>
          <View style={styles.nameRow}>
            {checkIn.friendAvatar ? (
              <Image source={{ uri: checkIn.friendAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.aqua + '1A' }]}>
                <Text style={[styles.avatarInitial, { color: colors.aqua }]}>
                  {checkIn.friendName?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{checkIn.friendName}</Text>
            <View style={styles.spacer} />
            {busynessPercent ? <Text style={styles.busynessPercent}>{busynessPercent}</Text> : null}
            <Pressable
              onPress={() => setMenuOpen(true)}
              disabled={deleting}
              hitSlop={10}
              accessibilityLabel="Check-in options"
              style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
              testID="checkin-menu"
            >
              <MoreHorizontal color={colors.textMuted} size={18} />
            </Pressable>
          </View>

          <View style={styles.subRow}>
            <Text style={[styles.venueName, { color: colors.textMuted }]}>{checkIn.venueName}</Text>
            <Text style={[styles.subDot, { color: colors.textMuted }]}>·</Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{checkIn.timeAgo}</Text>
          </View>
          {isMine ? (
            <View style={styles.subRow}>
              <ShieldCheck color={verification === 'verified' ? colors.aqua : colors.textSoft} size={12} />
              <Text style={[styles.timeAgo, { color: verification === 'verified' ? colors.aqua : colors.textSoft }]} testID="checkin-verification">
                {verificationLabel(verification)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.photoContainer}>
        {/* Caption is already burned into the photo at capture time. */}
        {checkIn.photoUri ? <Image source={{ uri: checkIn.photoUri }} style={styles.photo} resizeMode="cover" /> : null}
      </View>
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={isMine ? 'Your check-in' : checkIn.friendName}
        subtitle={checkIn.venueName}
        actions={menuActions}
        testID="checkin-actions"
      />
      <ReportSheet
        visible={report !== null}
        onClose={() => setReport(null)}
        kind={report?.kind ?? 'check_in'}
        targetId={report?.id ?? ''}
        targetLabel={report?.label ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topPanel: { width: '100%' },
  panelContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700' as const },
  friendName: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, flexShrink: 1 },
  spacer: { flex: 1 },
  menuBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  busynessPercent: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.5 },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 },
  venueName: { fontSize: 13, fontWeight: '600' as const },
  subDot: { fontSize: 13, fontWeight: '500' as const },
  timeAgo: { fontSize: 13, fontWeight: '500' as const },
  photoContainer: { flex: 1, width: '100%' },
  photo: { width: '100%', height: '100%' },
  notFound: { flex: 1, alignItems: 'center', gap: 20 },
  notFoundText: { fontSize: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { fontSize: 14, fontWeight: '700' as const },
});
