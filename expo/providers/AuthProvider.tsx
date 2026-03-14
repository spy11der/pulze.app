import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import createContextHook from '@nkzw/create-context-hook';

const AUTH_KEY = 'pulze_auth_state';

export interface AuthUser {
  displayName: string;
  username: string;
  email: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await SecureStore.getItemAsync(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser;
          setUser(parsed);
          setIsAuthenticated(true);
          console.log('[Auth] Restored session for', parsed.username);
        }
      } catch (e) {
        console.log('[Auth] Error loading auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadAuth();
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    console.log('[Auth] Login attempt for', email);
    await new Promise((r) => setTimeout(r, 1200));

    const authUser: AuthUser = {
      displayName: 'Jordan Pulse',
      username: 'jordan.pulse',
      email,
    };

    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
    setIsAuthenticated(true);
    console.log('[Auth] Login successful');
    return true;
  }, []);

  const signup = useCallback(async (name: string, email: string, _password: string): Promise<boolean> => {
    console.log('[Auth] Signup attempt for', email);
    await new Promise((r) => setTimeout(r, 1500));

    const username = name.toLowerCase().replace(/\s+/g, '.').slice(0, 20);
    const authUser: AuthUser = {
      displayName: name,
      username,
      email,
    };

    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
    setIsAuthenticated(true);
    console.log('[Auth] Signup successful');
    return true;
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    await SecureStore.deleteItemAsync(AUTH_KEY);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    user,
    login,
    signup,
    logout,
  }), [isAuthenticated, isLoading, user, login, signup, logout]);
});
