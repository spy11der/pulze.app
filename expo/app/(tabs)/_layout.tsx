import { Tabs } from 'expo-router';
import React from 'react';
import { Compass, Radio, UserRound, Users } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { TabScrollProvider } from '@/providers/TabScrollProvider';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const { colors } = useTheme();

  const tabIcon =
    (Icon: typeof Compass, focused: boolean, color: string) =>
    () => (
      <Icon
        color={color}
        size={24}
        strokeWidth={focused ? 2.2 : 1.6}
      />
    );

  return (
    <TabScrollProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} />}
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
    </TabScrollProvider>
  );
}
