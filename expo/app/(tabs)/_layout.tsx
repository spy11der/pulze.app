import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Compass, Radio, UserRound, Users } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { isDark, colors } = useTheme();

  const activeColor = colors.aqua;
  const inactiveColor = isDark ? '#3D5C66' : '#94ACB6';

  const sharedTabBarOptions = {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: activeColor,
    tabBarInactiveTintColor: inactiveColor,
    tabBarStyle: {
      position: 'absolute' as const,
      left: 16,
      right: 16,
      bottom: 0,
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      elevation: 0,
      zIndex: 50,
      overflow: 'hidden' as const,
    },
    tabBarItemStyle: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    tabBarBackground: () => (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(6, 15, 19, 0.92)' : 'rgba(246, 248, 250, 0.92)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(100, 180, 180, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        }}
      />
    ),
  };

  const tabIcon = (
    Icon: typeof Compass,
    focused: boolean,
  ) => (
    <Icon
      color={focused ? activeColor : inactiveColor}
      size={24}
      strokeWidth={focused ? 2.2 : 1.6}
    />
  );

  return (
    <Tabs screenOptions={sharedTabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => tabIcon(Compass, focused),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ focused }) => tabIcon(Radio, focused),
        }}
      />
      <Tabs.Screen
        name="crew"
        options={{
          title: 'Crew',
          tabBarIcon: ({ focused }) => tabIcon(Users, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon(UserRound, focused),
        }}
      />
    </Tabs>
  );
}
