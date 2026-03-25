import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Clock, TrendingUp, Users } from 'lucide-react-native';
import { generateLiveActivity } from '@/utils/urgency';

interface LiveActivityBadgeProps {
  vibeScore: number;
  peopleCount: number;
  isDark: boolean;
}

export const LiveActivityBadge = React.memo(function LiveActivityBadge({
  vibeScore,
  peopleCount,
  isDark,
}: LiveActivityBadgeProps) {
  const activity = useMemo(() => generateLiveActivity(vibeScore, peopleCount), [vibeScore, peopleCount]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const bg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const textColor = isDark ? '#7BA3AD' : '#4A6872';
  const accentColor = isDark ? '#2BBFBA' : '#1A9E99';
  const highlightColor = vibeScore >= 70 ? '#E8A830' : accentColor;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.row, { backgroundColor: bg }]}>
        <TrendingUp color={highlightColor} size={12} />
        <Text style={[styles.text, { color: textColor }]}>
          <Text style={{ color: highlightColor, fontWeight: '700' as const }}>+{activity.recentPeople} people</Text> in last 10 min
        </Text>
      </View>
      <View style={[styles.row, { backgroundColor: bg }]}>
        <Clock color={textColor} size={12} />
        <Text style={[styles.text, { color: textColor }]}>Updated {activity.updatedMinutesAgo}m ago</Text>
      </View>
      {activity.friendsNearby > 0 && (
        <View style={[styles.row, { backgroundColor: isDark ? 'rgba(43,191,186,0.08)' : 'rgba(26,158,153,0.06)' }]}>
          <Users color={accentColor} size={12} />
          <Text style={[styles.text, { color: accentColor, fontWeight: '600' as const }]}>
            {activity.friendsNearby} friend{activity.friendsNearby > 1 ? 's' : ''} nearby
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
