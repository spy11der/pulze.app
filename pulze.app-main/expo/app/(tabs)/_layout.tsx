import { Tabs } from 'expo-router';
import React from 'react';
import { BlurView } from 'expo-blur';
import { Chrome as Home, CirclePlus, Map, UserRound } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.aqua,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 18,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700' as const,
          marginTop: 4,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint={isDark ? 'dark' : 'light'}
            style={{
              flex: 1,
              borderRadius: 28,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(9, 30, 36, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(123, 220, 219, 0.12)' : 'rgba(0, 0, 0, 0.06)',
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <Home color={color} size={focused ? 22 : 20} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => <Map color={color} size={focused ? 22 : 20} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Drop Vibe',
          tabBarIcon: () => <CirclePlus color={isDark ? colors.background : '#fff'} fill={colors.aqua} size={28} />,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '800' as const,
            marginTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <UserRound color={color} size={focused ? 22 : 20} />,
        }}
      />
    </Tabs>
  );
}
