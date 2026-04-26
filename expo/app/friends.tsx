import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Inbox, QrCode, Search, Share2, ShieldCheck, Users, UserPlus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { currentUser } from '@/constants/identity';

import { TierBadge } from '@/components/TierBadge';
import { useTheme } from '@/providers/ThemeProvider';
import { useAgeVerification } from '@/providers/AgeVerificationProvider';
import {
  type Friend,
  type FriendRequest,
  type FriendTier,
  mockFriendRequests,
  mockFriends,
  tierDefinitions,
} from '@/mocks/friends';

type FilterTier = 'all' | FriendTier;

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [requests, setRequests] = useState<FriendRequest[]>(mockFriendRequests);
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [showTierPicker, setShowTierPicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const { isVerified: currentUserVerified } = useAgeVerification();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const filteredFriends = useMemo(() => {
    let result = friends;
    if (filterTier !== 'all') {
      result = result.filter((f) => f.tier === filterTier);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.handle.toLowerCase().includes(q) ||
          `pz-${f.id}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [friends, filterTier, searchQuery]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: friends.length };
    for (const f of friends) {
      counts[f.tier] = (counts[f.tier] ?? 0) + 1;
    }
    return counts;
  }, [friends]);

  const handleAcceptRequest = useCallback((request: FriendRequest) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTierPicker(request.id);
  }, []);

  const handleAssignTier = useCallback((requestId: string, tier: FriendTier) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      const newFriend: Friend = {
        id: `f-${Date.now()}`,
        name: request.name,
        handle: request.handle,
        avatar: request.avatar,
        tier,
        mutualFriends: request.mutualFriends,
        lastActive: 'just now',
      };
      setFriends((prev) => [newFriend, ...prev]);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setShowTierPicker(null);
  }, [requests]);

  const handleDeclineRequest = useCallback((requestId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const handleChangeTier = useCallback((friendId: string, newTier: FriendTier) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, tier: newTier } : f))
    );
    setShowTierPicker(null);
  }, []);

  const handleFriendPress = useCallback((friendId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTierPicker((prev) => (prev === friendId ? null : friendId));
  }, []);

  const handleOpenQR = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/qr-code');
  }, [router]);

  const handleScanQR = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[Friends] Scan QR code pressed');
  }, []);

  const handleSharePulzeId = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Add me on Pulze! My ID: ${currentUser.pulzeId} — ${currentUser.profileUrl}`,
        url: Platform.OS === 'ios' ? currentUser.profileUrl : undefined,
      });
    } catch (e) {
      console.log('[Friends] Share error:', e);
    }
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
          headerRight: () => (
            <Pressable
              onPress={handleOpenQR}
              style={({ pressed }) => [styles.headerQrBtn, pressed && { opacity: 0.7 }]}
              testID="header-qr-btn"
            >
              <QrCode color={colors.aqua} size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: searchFocused ? colors.aqua : colors.border }]}>
          <Search color={searchFocused ? colors.aqua : colors.textSoft} size={18} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, handle, or Pulze ID..."
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            testID="friend-search-input"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          )}
        </View>

        <View style={styles.addMethodsRow}>
          <Pressable
            onPress={handleScanQR}
            style={({ pressed }) => [styles.addMethodCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
            testID="scan-qr-btn"
          >
            <View style={[styles.addMethodIcon, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
              <QrCode color={colors.aqua} size={20} />
            </View>
            <Text style={[styles.addMethodLabel, { color: colors.text }]}>Scan QR</Text>
            <Text style={[styles.addMethodSub, { color: colors.textSoft }]}>Add in person</Text>
          </Pressable>
          <Pressable
            onPress={handleOpenQR}
            style={({ pressed }) => [styles.addMethodCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
            testID="my-qr-btn"
          >
            <View style={[styles.addMethodIcon, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.12)' : 'rgba(92, 168, 48, 0.08)' }]}>
              <UserPlus color={colors.lime} size={20} />
            </View>
            <Text style={[styles.addMethodLabel, { color: colors.text }]}>My QR</Text>
            <Text style={[styles.addMethodSub, { color: colors.textSoft }]}>Share profile</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setFilterTier('all')}
            style={[styles.filterChip, { backgroundColor: filterTier === 'all' ? colors.aqua : colors.surface, borderColor: filterTier === 'all' ? colors.aqua : colors.border }]}
          >
            <Text style={[styles.filterChipText, { color: filterTier === 'all' ? (isDark ? colors.background : '#fff') : colors.text }]}>
              All ({tierCounts.all ?? 0})
            </Text>
          </Pressable>
          {tierDefinitions.map((td) => (
            <Pressable
              key={td.id}
              onPress={() => setFilterTier(td.id)}
              style={[
                styles.filterChip,
                { backgroundColor: filterTier === td.id ? td.color : colors.surface, borderColor: filterTier === td.id ? td.color : colors.border },
              ]}
            >
              <Text style={[styles.filterChipText, { color: filterTier === td.id ? (isDark ? colors.background : '#fff') : colors.text }]}>
                {td.label} ({tierCounts[td.id] ?? 0})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Animated.View style={{ opacity: requests.length > 0 ? pulseAnim : 1 }}>
              <UserPlus color={requests.length > 0 ? colors.coral : colors.textSoft} size={18} />
            </Animated.View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Friend Requests</Text>
            {requests.length > 0 && (
              <View style={[styles.requestCountBadge, { backgroundColor: colors.coral }]}>
                <Text style={styles.requestCountText}>{requests.length}</Text>
              </View>
            )}
          </View>
          {requests.length === 0 ? (
            <View style={styles.emptyStateCentered}>
              <Inbox color={colors.aqua} size={48} />
              <Text style={[styles.emptyHeading, { color: colors.text }]}>No pending requests</Text>
              <Text style={[styles.emptySub, { color: colors.textSoft }]}>
                Requests you receive will appear here
              </Text>
            </View>
          ) : null}
          {requests.length > 0 ? (
            <View>
            {requests.map((request) => (
              <View key={request.id} style={{ marginTop: 12 }}>
                <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255, 109, 94, 0.2)' : 'rgba(224, 85, 69, 0.15)' }]}>
                  <Image source={{ uri: request.avatar }} style={styles.avatar} />
                  <View style={styles.requestInfo}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{request.name}</Text>
                    <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{request.handle}</Text>
                    <Text style={[styles.mutualText, { color: colors.textSoft }]}>{request.mutualFriends} mutual · {request.requestedAt}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable
                      onPress={() => handleAcceptRequest(request)}
                      style={[styles.acceptButton, { backgroundColor: colors.aqua }]}
                      testID={`accept-${request.id}`}
                    >
                      <Text style={[styles.acceptButtonText, { color: isDark ? colors.background : '#fff' }]}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeclineRequest(request.id)}
                      style={[styles.declineButton, { backgroundColor: colors.card }]}
                      testID={`decline-${request.id}`}
                    >
                      <X color={colors.textMuted} size={16} />
                    </Pressable>
                  </View>
                </View>
                {showTierPicker === request.id && (
                  <TierPickerInline
                    onSelect={(tier) => handleAssignTier(request.id, tier)}
                    selectedTier={null}
                    label="Choose a tier for this friend"
                  />
                )}
              </View>
            ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {filterTier === 'all' ? 'All Friends' : tierDefinitions.find((t) => t.id === filterTier)?.label}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{filteredFriends.length}</Text>
          </View>

          {filteredFriends.length === 0 && searchQuery.trim() ? (
            <View style={styles.emptyStateCentered}>
              <Search color={colors.aqua} size={48} />
              <Text style={[styles.emptyHeading, { color: colors.text }]} numberOfLines={2}>
                No one found for &quot;{searchQuery.trim()}&quot;
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSoft }]}>
                Try searching by Pulze ID
              </Text>
            </View>
          ) : filteredFriends.length === 0 && friends.length === 0 ? (
            <View style={styles.emptyStateCentered}>
              <Users color={colors.aqua} size={48} />
              <Text style={[styles.emptyHeading, { color: colors.text }]}>No friends yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSoft }]}>
                Share your Pulze ID to connect
              </Text>
              <Pressable
                onPress={handleSharePulzeId}
                style={({ pressed }) => [styles.emptyCtaBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
                testID="share-pulze-id-btn"
              >
                <Share2 color={isDark ? colors.background : '#fff'} size={16} />
                <Text style={[styles.emptyCtaText, { color: isDark ? colors.background : '#fff' }]}>Share My ID</Text>
              </Pressable>
            </View>
          ) : (
            filteredFriends.map((friend) => (
              <View key={friend.id}>
                <Pressable
                  onPress={() => handleFriendPress(friend.id)}
                  style={({ pressed }) => [styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { backgroundColor: colors.card }]}
                  testID={`friend-${friend.id}`}
                >
                  <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                  <View style={styles.friendInfo}>
                    <View style={styles.friendNameRow}>
                      <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                      <TierBadge tier={friend.tier} size="small" />
                      {currentUserVerified && friend.tier === 'inner_circle' && (
                        <View style={[styles.friendVerifiedBadge, { backgroundColor: colors.lime + '18' }]}>
                          <ShieldCheck color={colors.lime} size={10} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.friendHandle, { color: colors.textMuted }]}>@{friend.handle}</Text>
                    <Text style={[styles.mutualText, { color: colors.textSoft }]}>{friend.mutualFriends} mutual · {friend.lastActive}</Text>
                  </View>
                  <ChevronRight color={colors.textSoft} size={18} />
                </Pressable>
                {showTierPicker === friend.id && (
                  <TierPickerInline
                    onSelect={(tier) => handleChangeTier(friend.id, tier)}
                    selectedTier={friend.tier}
                    label="Change tier"
                  />
                )}
              </View>
            ))
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>About Friend Tiers</Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Tiers control what each person can see about your activity. You can change tiers at any time by tapping a friend.
          </Text>
          {tierDefinitions.map((td) => (
            <View key={td.id} style={styles.infoTierRow}>
              <View style={[styles.infoTierDot, { backgroundColor: td.color }]} />
              <View style={styles.infoTierBody}>
                <Text style={[styles.infoTierLabel, { color: td.color }]}>{td.label}</Text>
                <Text style={[styles.infoTierDesc, { color: colors.textMuted }]}>{td.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function TierPickerInline({
  onSelect,
  selectedTier,
  label,
}: {
  onSelect: (tier: FriendTier) => void;
  selectedTier: FriendTier | null;
  label: string;
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.tierPicker, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
      <Text style={[styles.tierPickerLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.tierOptions}>
        {tierDefinitions.map((td) => {
          const isSelected = selectedTier === td.id;
          return (
            <Pressable
              key={td.id}
              onPress={() => onSelect(td.id)}
              style={[
                styles.tierOption,
                { backgroundColor: colors.surface, borderColor: isSelected ? td.color : td.color + '40' },
                isSelected && { backgroundColor: td.color + '1A' },
              ]}
              testID={`tier-option-${td.id}`}
            >
              <View style={[styles.tierOptionDot, { backgroundColor: td.color }]} />
              <View style={styles.tierOptionBody}>
                <Text style={[styles.tierOptionLabel, { color: td.color }]}>{td.label}</Text>
                <Text style={[styles.tierOptionDesc, { color: colors.textMuted }]} numberOfLines={1}>{td.description}</Text>
              </View>
              {isSelected && (
                <View style={[styles.tierSelectedIndicator, { backgroundColor: td.color }]}>
                  <Text style={[styles.tierSelectedText, { color: colors.background }]}>Current</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 18 },
  headerQrBtn: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    padding: 0,
  },
  addMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addMethodCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  addMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMethodLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  addMethodSub: {
    fontSize: 12,
  },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' as const },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800' as const, flex: 1 },
  sectionCount: { fontSize: 15, fontWeight: '700' as const },
  requestCountBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestCountText: { color: '#fff', fontSize: 12, fontWeight: '800' as const },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 18 },
  requestInfo: { flex: 1, gap: 2 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acceptButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  acceptButtonText: { fontSize: 13, fontWeight: '800' as const },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  friendInfo: { flex: 1, gap: 3 },
  friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendVerifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: { fontSize: 16, fontWeight: '700' as const },
  friendHandle: { fontSize: 13 },
  mutualText: { fontSize: 12 },
  emptyState: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateCentered: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    textAlign: 'center' as const,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '700' as const,
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
  tierPicker: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  tierPickerLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  tierOptions: { gap: 8 },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  tierOptionDot: { width: 10, height: 10, borderRadius: 5 },
  tierOptionBody: { flex: 1, gap: 2 },
  tierOptionLabel: { fontSize: 15, fontWeight: '700' as const },
  tierOptionDesc: { fontSize: 12 },
  tierSelectedIndicator: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tierSelectedText: { fontSize: 11, fontWeight: '800' as const },
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  infoTitle: { fontSize: 17, fontWeight: '800' as const },
  infoText: { fontSize: 14, lineHeight: 21 },
  infoTierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoTierDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  infoTierBody: { flex: 1, gap: 2 },
  infoTierLabel: { fontSize: 14, fontWeight: '700' as const },
  infoTierDesc: { fontSize: 13 },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
