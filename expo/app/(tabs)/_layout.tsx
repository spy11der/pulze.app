import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Chrome as Home, CirclePlus, Map, Ticket, UserRound } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { isDark, colors } = useTheme();

  const activeColor = colors.aqua;
  const inactiveColor = isDark ? '#3D5C66' : '#94ACB6';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 0,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          zIndex: 50,
          overflow: 'hidden',
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <Home
              color={focused ? activeColor : inactiveColor}
              fill="none"
              size={24}
              strokeWidth={focused ? 2.2 : 1.6}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => (
            <Map
              color={focused ? activeColor : inactiveColor}
              fill="none"
              size={24}
              strokeWidth={focused ? 2.2 : 1.6}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Drop Vibe',
          tabBarIcon: ({ focused }) => (
            <CirclePlus
              color={focused ? activeColor : inactiveColor}
              fill="none"
              size={24}
              strokeWidth={focused ? 2.2 : 1.6}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ focused }) => (
            <Ticket
              color={focused ? activeColor : inactiveColor}
              fill="none"
              size={24}
              strokeWidth={focused ? 2.2 : 1.6}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <UserRound
              color={focused ? activeColor : inactiveColor}
              fill="none"
              size={24}
              strokeWidth={focused ? 2.2 : 1.6}
            />
          ),
        }}
      />
    </Tabs>
  );
}
