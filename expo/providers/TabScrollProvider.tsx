import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface TabScrollContextValue {
  scrollAnim: Animated.Value;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const TabScrollContext = createContext<TabScrollContextValue | null>(null);

export function TabScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDir = useRef<'up' | 'down'>('up');

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;

      // Always show full bar near the top
      if (y < 60) {
        if (scrollDir.current !== 'up') {
          scrollDir.current = 'up';
          Animated.spring(scrollAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 10,
            tension: 80,
          }).start();
        }
        lastScrollY.current = y;
        return;
      }

      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      // Threshold to avoid jitter on tiny scrolls
      if (Math.abs(delta) < 8) return;

      if (delta > 0 && scrollDir.current !== 'down') {
        // Scrolling down — content moving up → shrink & fade slightly
        scrollDir.current = 'down';
        Animated.spring(scrollAnim, {
          toValue: 0.82,
          useNativeDriver: true,
          friction: 10,
          tension: 80,
        }).start();
      } else if (delta < 0 && scrollDir.current !== 'up') {
        // Scrolling up — content moving down → restore full size & opacity
        scrollDir.current = 'up';
        Animated.spring(scrollAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 10,
          tension: 80,
        }).start();
      }
    },
    [scrollAnim],
  );

  return (
    <TabScrollContext.Provider value={{ scrollAnim, onScroll }}>
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll(): TabScrollContextValue {
  const ctx = useContext(TabScrollContext);
  if (!ctx) {
    throw new Error('useTabScroll must be used within a TabScrollProvider');
  }
  return ctx;
}
