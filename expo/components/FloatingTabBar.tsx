import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments, useRouter } from 'expo-router';
import { Compass, Radio, UserRound, Users } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useTabScroll } from '@/providers/TabScrollProvider';
import { useTheme } from '@/providers/ThemeProvider';

const TABS = [
  { route: '/(tabs)', Icon: Compass },
  { route: '/(tabs)/nearby', Icon: Radio },
  { route: '/(tabs)/crew', Icon: Users },
  { route: '/(tabs)/profile', Icon: UserRound },
] as const;

const HIDDEN_SEGMENTS = new Set(['settings', 'check-in-capture', 'venue-detail']);

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { scrollAnim } = useTabScroll();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeColor = colors.aqua;
  const inactiveColor = isDark ? '#3D5C66' : '#94ACB6';
  const pillBg = isDark ? 'rgba(8, 20, 26, 0.94)' : 'rgba(250, 252, 254, 0.94)';
  const pillBorder = isDark ? 'rgba(100, 180, 180, 0.12)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          bottom: insets.bottom + 12,
          opacity: scrollAnim,
          transform: [{ scale: scrollAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icon =
            options.tabBarIcon !== undefined
              ? options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? activeColor : inactiveColor,
                  size: 24,
                })
              : null;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.6 },
              ]}
            >
              {icon}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export function PersistentFloatingTabBar() {
  const segments = useSegments();
  const router = useRouter();
  const { scrollAnim } = useTabScroll();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeColor = colors.aqua;
  const inactiveColor = isDark ? '#3D5C66' : '#94ACB6';
  const pillBg = isDark ? 'rgba(8, 20, 26, 0.94)' : 'rgba(250, 252, 254, 0.94)';
  const pillBorder = isDark ? 'rgba(100, 180, 180, 0.12)' : 'rgba(0, 0, 0, 0.06)';

  const segArr: string[] = [...segments];
  const firstSegment = segArr[0] ?? '';
  if (HIDDEN_SEGMENTS.has(firstSegment)) return null;

  const activeTab = segArr[1] || 'index';
  const tabNames = ['index', 'nearby', 'crew', 'profile'] as const;

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          bottom: insets.bottom + 12,
          opacity: scrollAnim,
          transform: [{ scale: scrollAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
        {TABS.map(({ route, Icon }, i) => {
          const tabName = tabNames[i];
          const isFocused = activeTab === tabName;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <Pressable
              key={route}
              onPress={() => {
                if (!isFocused) {
                  router.navigate(route as any);
                }
              }}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon
                color={color}
                size={24}
                strokeWidth={isFocused ? 2.2 : 1.6}
              />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    width: 52,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
