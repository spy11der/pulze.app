import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Shield, Users, Heart, Star } from 'lucide-react-native';

import type { FriendTier } from '@/mocks/friends';
import { getTierInfo } from '@/mocks/friends';

interface TierBadgeProps {
  tier: FriendTier;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const tierIcons = {
  public: Shield,
  friends: Users,
  close_friends: Heart,
  inner_circle: Star,
} as const;

export function TierBadge({ tier, size = 'small', showLabel = true }: TierBadgeProps) {
  const info = getTierInfo(tier);
  const Icon = tierIcons[tier];
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, { backgroundColor: info.color + '1A' }, isSmall ? styles.small : styles.medium]}>
      <Icon color={info.color} size={isSmall ? 11 : 14} />
      {showLabel && (
        <Text style={[styles.label, { color: info.color }, isSmall ? styles.labelSmall : styles.labelMedium]}>
          {info.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
  },
  small: {
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 11,
  },
  labelMedium: {
    fontSize: 13,
  },
});
