import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Image } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PulseSplashProps {
  onComplete: () => void;
}

export function PulseSplash({ onComplete }: PulseSplashProps) {
  const [visible, setVisible] = useState<boolean>(true);
  const pulseScale = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const singlePulse = Animated.sequence([
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 1.15, duration: 280, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(ring1Scale, { toValue: 1.6, duration: 400, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 0.95, duration: 220, useNativeDriver: true }),
        Animated.timing(ring1Scale, { toValue: 2.2, duration: 300, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ring2Scale, { toValue: 1.8, duration: 300, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 0.8, duration: 180, useNativeDriver: true }),
        Animated.timing(ring2Scale, { toValue: 2.4, duration: 250, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]);

    const triggerHaptic = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    Animated.timing(pulseOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      triggerHaptic();
      singlePulse.start(() => {
        setTimeout(() => {
          triggerHaptic();
          singlePulse.start(() => {
            setTimeout(() => {
              triggerHaptic();
              singlePulse.start(() => {
                setTimeout(() => {
                  Animated.timing(containerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
                    setVisible(false);
                    onComplete();
                  });
                }, 200);
              });
            }, 120);
          });
        }, 120);
      });
    });
  }, [pulseScale, pulseOpacity, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, containerOpacity, onComplete]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} testID="pulse-splash">
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoImageWrap,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        >
          <Image
            source={require('@/assets/images/pulze-splash.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
    borderColor: 'rgba(53, 212, 207, 0.6)',
  },
  logoImageWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: 120,
    height: 120,
  },
});
