import { Tabs } from 'expo-router';
import React from 'react';
import { BlurView } from 'expo-blur';
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
          bottom: 18,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          zIndex: 50,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 28,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(4, 19, 24, 0.55)' : 'rgba(255, 255, 255, 0.45)',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(26, 107, 106, 0.5)' : 'rgba(0, 0, 0, 0.08)',
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
              fill={focused ? TEAL_ACTIVE : 'none'}
              size={22}
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
              fill={focused ? TEAL_ACTIVE + '30' : 'none'}
              size={22}
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
              fill={focused ? TEAL_ACTIVE : 'none'}
              size={28}
              strokeWidth={focused ? 2.2 : 1.5}
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
              fill={focused ? TEAL_ACTIVE + '30' : 'none'}
              size={22}
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
              fill={focused ? TEAL_ACTIVE + '30' : 'none'}
              size={22}
              strokeWidth={focused ? 2 : 1.5}
            />
          ),
        }}
      />
    </Tabs>
  );
}
