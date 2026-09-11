import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/services/supabase';
import { signedUrlFor } from '@/services/storageUrls';
import type { Session, User } from '@supabase/supabase-js';


export interface AuthUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
  phone: string;
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
    phone: u.phone ?? '',
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
    console.log('[Auth] Login attempt for', emailOrUsername);

    let email = emailOrUsername.trim();

    if (!email.includes('@')) {
      // Username login — resolve the username to the user's REAL auth email
      // via the secure SECURITY DEFINER RPC. Never guess an email pattern
      // (e.g. username@domain) client-side. A null/failed resolution answers
      // with a generic error so username probing isn't surfaced.
      // `resolve_login_email` isn't in the generated Supabase types — cast the rpc call.
      const { data: resolved, error: resolveError } = await (supabase.rpc as any)('resolve_login_email', { p_username: email });

      if (resolveError) {
        console.log('[Auth] Username resolution failed:', resolveError.message);
        throw new Error('Invalid username or password');
      }
      if (!resolved) {
        console.log('[Auth] Unknown username');
        throw new Error('Invalid username or password');
      }
      email = resolved;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      console.log('[Auth] Login failed:', error?.message);
      throw new Error(error?.message ?? 'Invalid email/username or password');
    }

    console.log('[Auth] Login successful');
    setSession(data.session);
    setUser(mapSessionUser(data.session));
    setIsAuthenticated(true);
    return true;
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
      options: { data: { display_name: name, username, phone } },
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
