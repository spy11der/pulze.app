import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { Compass, Radio, UserRound, Users } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();

  const tabIcon =
    (Icon: typeof Compass, focused: boolean, color: ColorValue) =>
    () => (
      <Icon
        color={color}
        size={24}
        strokeWidth={focused ? 2.2 : 1.6}
      />
    );

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => null}
    >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ focused, color }) =>
              tabIcon(Compass, focused, color)(),
          }}
        />
        <Tabs.Screen
          name="nearby"
          options={{
            title: 'Nearby',
            tabBarIcon: ({ focused, color }) =>
              tabIcon(Radio, focused, color)(),
          }}
        />
        <Tabs.Screen
          name="crew"
          options={{
            title: 'Crew',
            tabBarIcon: ({ focused, color }) =>
              tabIcon(Users, focused, color)(),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, color }) =>
              tabIcon(UserRound, focused, color)(),
          }}
        />
      </Tabs>
  );
}
