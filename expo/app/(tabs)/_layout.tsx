import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Chrome as Home, CirclePlus, Map, Ticket, UserRound } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

const TEAL_DARK = '#1A6B6A';
const TEAL_ACTIVE = '#35D4CF';

export default function TabLayout() {
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: TEAL_ACTIVE,
        tabBarInactiveTintColor: isDark ? TEAL_DARK : '#5B8792',
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 8,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          zIndex: 50,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarBackground: () => (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(0, 20, 25, 0.6)' : 'rgba(240, 245, 248, 0.7)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(26, 107, 106, 0.35)' : 'rgba(0, 0, 0, 0.06)',
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
              color={focused ? TEAL_ACTIVE : isDark ? TEAL_DARK : '#5B8792'}
              fill="none"
              size={30}
              strokeWidth={focused ? 2 : 1.5}
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
              color={focused ? TEAL_ACTIVE : isDark ? TEAL_DARK : '#5B8792'}
              fill="none"
              size={30}
              strokeWidth={focused ? 2 : 1.5}
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
              color={focused ? TEAL_ACTIVE : isDark ? TEAL_DARK : '#5B8792'}
              fill="none"
              size={30}
              strokeWidth={focused ? 2 : 1.5}
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
              color={focused ? TEAL_ACTIVE : isDark ? TEAL_DARK : '#5B8792'}
              fill="none"
              size={30}
              strokeWidth={focused ? 2 : 1.5}
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
              color={focused ? TEAL_ACTIVE : isDark ? TEAL_DARK : '#5B8792'}
              fill="none"
              size={30}
              strokeWidth={focused ? 2 : 1.5}
            />
          ),
        }}
      />
    </Tabs>
  );
}
