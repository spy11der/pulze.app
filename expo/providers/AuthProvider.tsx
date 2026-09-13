import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/services/supabase';
import { signedUrlFor } from '@/services/storageUrls';
import { clearLocalCachesForUser } from '@/services/localCleanup';
import type { Session, User } from '@supabase/supabase-js';


export interface AuthUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
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
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
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

  // Resolve the avatar path stored in auth metadata to a signed URL.
  // The `avatars` bucket is private, so a raw `/object/public/...` URL
  // would 403. We only sign when the current value looks like a path
  // or a legacy public URL, not when it's already a `/object/sign/...`
  // token URL — the guard prevents a re-sign loop after setUser lands.
  useEffect(() => {
    const raw = user?.avatarUrl;
    if (!raw) return;
    if (raw.includes('/object/sign/')) return;
    let cancelled = false;
    void signedUrlFor('avatars', raw).then((signed) => {
      if (cancelled || !signed || signed === raw) return;
      setUser((prev) => (prev ? { ...prev, avatarUrl: signed } : prev));
    });
    return () => { cancelled = true; };
  }, [user?.avatarUrl]);

  const login = useCallback(async (emailOrUsername: string, password: string): Promise<boolean> => {
    console.log('[Auth] Login attempt');

    const trimmed = emailOrUsername.trim();

    if (trimmed.includes('@')) {
      // Email path — Supabase Auth handles password verification. Nothing
      // custom on top; a matching email that fails auth returns a generic
      // "Invalid login credentials" upstream.
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error || !data.session) {
        console.log('[Auth] Email login failed');
        throw new Error('Invalid email/username or password');
      }
      console.log('[Auth] Email login successful');
      setSession(data.session);
      setUser(mapSessionUser(data.session));
      setIsAuthenticated(true);
      return true;
    }

    // Username path — the `resolve_login_email` SECURITY DEFINER RPC is
    // no longer callable by anon or authenticated (it was an enumeration
    // oracle: anyone with the publishable key could reverse username to
    // email). It's now reached only server-side through the
    // `login-with-username` Edge Function, which does its own rate
    // limiting and returns only session tokens — never the resolved
    // email. On any failure we install the same generic error so the
    // caller learns nothing about whether the username exists.
    const { data: fnData, error: fnError } = await supabase.functions.invoke<{
      session?: { access_token: string; refresh_token: string };
    }>('login-with-username', { body: { username: trimmed, password } });

    if (fnError || !fnData?.session?.access_token || !fnData?.session?.refresh_token) {
      console.log('[Auth] Username login failed');
      throw new Error('Invalid email/username or password');
    }

    const { data: setData, error: setErr } = await supabase.auth.setSession({
      access_token: fnData.session.access_token,
      refresh_token: fnData.session.refresh_token,
    });
    if (setErr || !setData?.session) {
      console.log('[Auth] setSession failed after username login');
      throw new Error('Invalid email/username or password');
    }

    console.log('[Auth] Username login successful');
    setSession(setData.session);
    setUser(mapSessionUser(setData.session));
    setIsAuthenticated(true);
    return true;
  }, []);

  const signup = useCallback(async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    console.log('[Auth] Signup attempt for', username);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, username } },
    });

    if (error) {
      console.log('[Auth] Signup failed:', error.message);
      throw new Error(error.message);
    }

    if (data.user && !data.session) {
      console.log('[Auth] Email confirmation required');
      // The DB trigger (on_auth_user_created) already created the profile row
      // at user insert, so confirmation does NOT delay profile creation. The
      // best-effort upsert below only succeeds if RLS allows anon inserts —
      // it's a fallback, not the guarantee.
      void createProfile(data.user, name, username);
      throw new Error('Check your email to confirm your account, then log in.');
    }

    if (!data.session) {
      throw new Error('Signup failed. Please try again.');
    }

    console.log('[Auth] Signup successful with session');
    setSession(data.session);
    setUser(mapSessionUser(data.session));
    setIsAuthenticated(true);
    void createProfile(data.user!, name, username);
    return true;
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    // Capture the current user id before signOut fires the SIGNED_OUT
    // event and setUser(null) races the cleanup.
    const departingUserId = user?.id ?? null;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[Auth] Logout error:', error.message);
    }
    // Wipe per-account AsyncStorage entries so the next account on
    // this device can't see the previous account's queued check-ins,
    // dedup state, saves cache, or legacy favorites.
    await clearLocalCachesForUser(departingUserId);
    setSession(null);
    setUser(null);
    setIsAuthenticated(false);
  }, [user?.id]);

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

async function createProfile(user: User, displayName: string, username: string) {
  try {
    console.log('[Auth] Ensuring profile exists for', user.id);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username,
      display_name: displayName,
    } as any);

    if (error) {
      console.log('[Auth] Profile upsert error:', error.message);
    } else {
      console.log('[Auth] Profile confirmed');
    }
  } catch (e) {
    console.log('[Auth] Profile creation exception:', e);
  }
}
