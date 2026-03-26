import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, TrendingUp, Users, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getDecision, parseEtaMinutes, generateLiveActivity } from '@/utils/urgency';
import type { DecisionInfo } from '@/utils/urgency';

interface DecisionBarProps {
  vibeScore: number;
  peopleCount: number;
  eta: string;
  onGoNow?: () => void;
}

export const DecisionBar = React.memo(function DecisionBar({
  vibeScore,
  peopleCount,
  eta,
  onGoNow,
}: DecisionBarProps) {
  const etaMinutes = parseEtaMinutes(eta);
  const decision = useMemo(() => getDecision(vibeScore, peopleCount, etaMinutes), [vibeScore, peopleCount, etaMinutes]);
  const activity = useMemo(() => generateLiveActivity(vibeScore, peopleCount), [vibeScore, peopleCount]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    if (decision.action === 'GO_NOW') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  }, [decision.action, pulseAnim, slideAnim, fadeAnim]);

  const handlePress = () => {
    if (decision.action === 'GO_NOW' && onGoNow) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onGoNow();
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const cardBg = decision.action === 'GO_NOW'
    ? 'rgba(46,173,106,0.08)'
    : decision.action === 'WAIT'
      ? 'rgba(240,192,48,0.06)'
      : 'rgba(208,64,64,0.06)';

  const cardBorder = decision.action === 'GO_NOW'
    ? 'rgba(46,173,106,0.18)'
    : decision.action === 'WAIT'
      ? 'rgba(240,192,48,0.14)'
      : 'rgba(208,64,64,0.14)';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.sectionLabel}>SHOULD YOU GO?</Text>

      <View style={[styles.decisionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Zap color={vibeScore >= 70 ? '#E8A830' : '#7BA3AD'} size={14} />
            <Text style={[styles.statValue, { color: vibeScore >= 70 ? '#E8A830' : '#B0C8D0' }]}>{vibeScore}</Text>
            <Text style={styles.statMeta}>energy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingUp color="#2BBFBA" size={14} />
            <Text style={[styles.statValue, { color: '#B0C8D0' }]}>+{activity.recentPeople}</Text>
            <Text style={styles.statMeta}>recently</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users color={activity.friendsNearby > 0 ? '#2BBFBA' : '#7BA3AD'} size={14} />
            <Text style={[styles.statValue, { color: activity.friendsNearby > 0 ? '#2BBFBA' : '#B0C8D0' }]}>
              {activity.friendsNearby}
            </Text>
            <Text style={styles.statMeta}>friends</Text>
          </View>
        </View>

        <Text style={[styles.reasonText, { color: decision.action === 'GO_NOW' ? '#8DD4A0' : decision.action === 'WAIT' ? '#D4C080' : '#D09090' }]}>
          {decision.action === 'GO_NOW' ? 'This is the move right now' : decision.reason}
        </Text>

        <DecisionButton decision={decision} pulseAnim={decision.action === 'GO_NOW' ? pulseAnim : undefined} onPress={handlePress} />
      </View>
    </Animated.View>
  );
});

function DecisionButton({
  decision,
  pulseAnim,
  onPress,
}: {
  decision: DecisionInfo;
  pulseAnim?: Animated.Value;
  onPress: () => void;
}) {
  const scale = pulseAnim ?? new Animated.Value(1);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.decisionBtn,
          { backgroundColor: decision.bgColor },
          pressed && styles.pressed,
        ]}
        testID={`decision-${decision.action}`}
      >
        <Text style={[styles.decisionLabel, { color: decision.color }]}>{decision.label}</Text>
        {decision.action === 'GO_NOW' && <ArrowRight color={decision.color} size={18} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    color: '#7BA3AD',
  },
  decisionCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    alignItems: 'center' as const,
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  statMeta: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#7BA3AD',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(123,163,173,0.15)',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  decisionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  decisionLabel: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
