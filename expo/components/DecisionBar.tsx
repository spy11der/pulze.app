import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getDecision, parseEtaMinutes } from '@/utils/urgency';
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
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
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

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.sectionLabel}>SHOULD YOU GO?</Text>
      <View style={styles.barRow}>
        <DecisionButton decision={decision} pulseAnim={decision.action === 'GO_NOW' ? pulseAnim : undefined} onPress={handlePress} />
      </View>
      <Text style={styles.reason}>{decision.reason}</Text>
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
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
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
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    color: '#7BA3AD',
  },
  barRow: {
    flexDirection: 'row',
    gap: 8,
  },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  decisionLabel: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
  },
  reason: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7BA3AD',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
