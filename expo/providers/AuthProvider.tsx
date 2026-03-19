import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/services/supabase';
import type { Session, User } from '@supabase/supabase-js';


export interface AuthUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
  phone: string;
}

function mapSessionUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    displayName: meta.display_name ?? meta.username ?? u.email?.split('@')[0] ?? '',
    username: meta.username ?? u.email?.split('@')[0] ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      try {
        console.log('[Auth] Checking existing session...');
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.log('[Auth] Error getting session:', error.message);
        }

        if (existingSession) {
          console.log('[Auth] Restored session for', existingSession.user.email);
          setSession(existingSession);
          setUser(mapSessionUser(existingSession));
          setIsAuthenticated(true);
        } else {
          console.log('[Auth] No existing session found');
        }
      } catch (e) {
        console.log('[Auth] Error initializing auth:', e);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[Auth] Auth state changed:', _event);
        setSession(newSession);
        const mapped = mapSessionUser(newSession);
        setUser(mapped);
        setIsAuthenticated(!!mapped);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (emailOrUsername: string, password: string): Promise<boolean> => {
    console.log('[Auth] Login attempt for', emailOrUsername);

    const email = emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@pulze.app`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[Auth] Login error:', error.message);
      throw new Error(error.message);
    }

    if (data.session) {
      console.log('[Auth] Login successful');
      setSession(data.session);
      setUser(mapSessionUser(data.session));
      setIsAuthenticated(true);
      return true;
    }

    return false;
  }, []);

  const signup = useCallback(async (
    name: string,
    username: string,
    email: string,
    phone: string,
    password: string
  ): Promise<boolean> => {
    console.log('[Auth] Signup attempt for', username);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          username,
          phone,
        },
      },
    });

    if (error) {
      console.log('[Auth] Signup error:', error.message);
      throw new Error(error.message);
    }

    if (data.session) {
      console.log('[Auth] Signup successful with session');
      setSession(data.session);
      setUser(mapSessionUser(data.session));
      setIsAuthenticated(true);

      void createProfile(data.user!, name, username, phone);
      return true;
    }

    if (data.user && !data.session) {
      console.log('[Auth] Signup successful - email confirmation required');
      throw new Error('Please check your email to confirm your account.');
    }

    return false;
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[Auth] Logout error:', error.message);
    }
    setSession(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    user,
    session,
    login,
    signup,
    logout,
  }), [isAuthenticated, isLoading, user, session, login, signup, logout]);
});

async function createProfile(user: User, displayName: string, username: string, phone: string) {
  try {
    console.log('[Auth] Creating profile for', user.id);
    const profileData = {
      id: user.id,
      username,
      display_name: displayName,
      email: user.email ?? '',
      phone,
    };
    const { error } = await supabase.from('profiles').upsert(profileData as any);

    if (error) {
      console.log('[Auth] Profile creation error:', error.message);
    } else {
      console.log('[Auth] Profile created successfully');
    }
  } catch (e) {
    console.log('[Auth] Profile creation exception:', e);
  }
}
