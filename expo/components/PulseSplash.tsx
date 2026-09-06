import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Text, Dimensions, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PulseSplashProps {
  onComplete: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOTAL_DURATION = 2800;

export function PulseSplash({ onComplete }: PulseSplashProps) {
  const [visible, setVisible] = useState<boolean>(true);

  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.8)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  const logoScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const buildRingAnim = (scale: Animated.Value, opacity: Animated.Value) =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 2.0,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1100,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

    const ring1Anim = buildRingAnim(ring1Scale, ring1Opacity);
    const ring2Anim = buildRingAnim(ring2Scale, ring2Opacity);
    const ring3Anim = buildRingAnim(ring3Scale, ring3Opacity);

    ring1Anim.start();
    const t2 = setTimeout(() => ring2Anim.start(), 200);
    const t3 = setTimeout(() => ring3Anim.start(), 400);

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.04,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.timing(wordmarkOpacity, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressWidth, {
      toValue: SCREEN_WIDTH,
      duration: TOTAL_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const hapticTimer = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 1400);

    const completeTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        ring1Anim.stop();
        ring2Anim.stop();
        ring3Anim.stop();
        setVisible(false);
        onComplete();
      });
    }, TOTAL_DURATION);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(hapticTimer);
      clearTimeout(completeTimer);
      ring1Anim.stop();
      ring2Anim.stop();
      ring3Anim.stop();
    };
  }, [
    ring1Scale,
    ring1Opacity,
    ring2Scale,
    ring2Opacity,
    ring3Scale,
    ring3Opacity,
    logoScale,
    containerOpacity,
    progressWidth,
    wordmarkOpacity,
    onComplete,
  ]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} testID="pulse-splash">
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ring3Scale }], opacity: ring3Opacity }]}
        />
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]}
        />
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]}
        />
        <Animated.View style={[styles.logoTextWrap, { transform: [{ scale: logoScale }] }]}>
          <Text style={styles.logoText}>P.</Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]} testID="pulse-splash-wordmark">
        PULZE
      </Animated.Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#041318',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  center: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(43, 191, 186, 0.7)',
  },
  logoTextWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: '#2BBFBA',
    letterSpacing: -2,
  },
  wordmark: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 8,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#2BBFBA',
  },
});
