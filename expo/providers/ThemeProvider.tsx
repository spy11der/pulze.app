import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { DarkColors, LightColors, type AppColors } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'pulze_theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setMode(stored);
        }
      } catch (e) {
        console.log('[Theme] Error loading theme:', e);
      }
      setLoaded(true);
    };
    void load();
  }, []);

  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    console.log('[Theme] Setting theme mode:', newMode);
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch (e) {
      console.log('[Theme] Error saving theme:', e);
    }
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme !== 'light';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors: AppColors = useMemo(() => {
    return isDark ? DarkColors : LightColors;
  }, [isDark]);

  return useMemo(() => ({
    mode,
    isDark,
    colors,
    setThemeMode,
    loaded,
  }), [mode, isDark, colors, setThemeMode, loaded]);
});
