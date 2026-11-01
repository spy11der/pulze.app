import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { clearStoredSession, supabase } from '@/services/supabase';
import { signedUrlFor } from '@/services/storageUrls';
import { clearLocalCachesForUser } from '@/services/localCleanup';
import { unregisterThisDevice } from '@/services/pushTokens';
import { authFlowError, toAuthFlowError, toLoginError, toSignupError } from '@/services/authErrors';
import type { Session, User } from '@supabase/supabase-js';

export type SignupResult =
  | { status: 'signed_in' }
  | { status: 'confirmation_required'; email: string };

// Set before a recovery code is verified and cleared once the new password is
// saved. Verifying the code signs the user in; while this is set the session
// is held back from the app, so the only screen reachable is "choose a new
// password". It is persisted so that killing the app between the two steps
// can't be used to skip the second one.
const RECOVERY_PENDING_KEY = 'pulze.auth.recoveryPending';

// null when the marker can't be read; the caller treats that as pending
// whenever a session exists, so a storage fault can't open the gate.
async function readRecoveryPending(): Promise<boolean | null> {
  try {
    return (await AsyncStorage.getItem(RECOVERY_PENDING_KEY)) === '1';
  } catch (e) {
    console.log('[Auth] Could not read recovery marker:', e);
    return null;
  }
}

async function clearRecoveryPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
  } catch (e) {
    console.log('[Auth] Could not clear recovery marker:', e);
  }
}

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
  const [isRecoveringPassword, setIsRecoveringPassword] = useState<boolean>(false);
  const initialized = useRef(false);
  // The source of truth for the recovery gate. A ref, not state, because the
  // auth listener fires inside verifyOtp, before any re-render.
  const recoveryRef = useRef(false);

  // Every session change goes through here. During recovery the session is
  // kept (updateUser needs it) but the user is not treated as signed in.
  const applySession = useCallback((newSession: Session | null) => {
    setSession(newSession);
    if (recoveryRef.current && newSession) {
      setUser(null);
      setIsAuthenticated(false);
      setIsRecoveringPassword(true);
      return;
    }
    if (recoveryRef.current && !newSession) {
      // The recovery session ended underneath us (revoked or expired).
      recoveryRef.current = false;
      setIsRecoveringPassword(false);
      void clearRecoveryPending();
    }
    const mapped = mapSessionUser(newSession);
    setUser(mapped);
    setIsAuthenticated(!!mapped);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Events that arrive before the recovery marker has been read are
    // ignored; getSession below reports the same session once it has.
    let ready = false;

    const initAuth = async () => {
      try {
        console.log('[Auth] Checking existing session...');
        const recoveryPending = await readRecoveryPending();
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.log('[Auth] Error getting session:', error.message);
        }

        if (existingSession && recoveryPending !== false) {
          console.log('[Auth] Resuming an unfinished password reset');
          recoveryRef.current = true;
        } else if (recoveryPending) {
          await clearRecoveryPending();
        }

        if (existingSession) {
          if (__DEV__) console.log('[Auth] Restored session for', existingSession.user.email);
        } else {
          console.log('[Auth] No existing session found');
        }
        ready = true;
        applySession(existingSession);
      } catch (e) {
        console.log('[Auth] Error initializing auth:', e);
      } finally {
        ready = true;
        setIsLoading(false);
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[Auth] Auth state changed:', _event);
        if (!ready) return;
        applySession(newSession);
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
      // Supabase Auth checks the password before confirmation, so this is
      // only reached with the right password.
      if (error?.code === 'email_not_confirmed') {
        console.log('[Auth] Email login needs confirmation');
        throw authFlowError('email_not_confirmed', trimmed);
      }
      if (error || !data.session) {
        const mapped = toLoginError(error);
        console.log('[Auth] Email login failed:', mapped.kind, error?.code ?? error?.status ?? 'no session');
        throw mapped;
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
      const mapped = fnError ? toLoginError(fnError) : authFlowError('unknown');
      console.log('[Auth] Username login failed:', mapped.kind, fnError?.name ?? 'no session');
      throw mapped;
    }

    const { data: setData, error: setErr } = await supabase.auth.setSession({
      access_token: fnData.session.access_token,
      refresh_token: fnData.session.refresh_token,
    });
    if (setErr || !setData?.session) {
      // The password was right; installing the session failed (usually the network).
      console.log('[Auth] setSession failed after username login');
      throw authFlowError('unknown');
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
  ): Promise<SignupResult> => {
    console.log('[Auth] Signup attempt for', username);

    // Ask first, so a taken name gets a clear answer instead of a failed
    // signup. If the check itself can't run (offline, or a backend without
    // username_available), signUp below still refuses a taken name.
    // username_available isn't in the generated Supabase types yet, so cast.
    const { data: availability } = await (supabase.rpc as any)('username_available', { p_username: username });
    if (availability === 'taken') throw authFlowError('username_unavailable');
    if (availability === 'invalid') throw authFlowError('username_invalid');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, username } },
    });

    if (error) {
      const mapped = toSignupError(error);
      console.log('[Auth] Signup failed:', mapped.kind, error.code ?? error.status);
      throw mapped;
    }

    // Email confirmation is off, so signUp returns a session and the user is
    // signed in. The code step below is only a fallback for a project that
    // still requires confirmation.
    if (data.user && !data.session) {
      console.log('[Auth] Email confirmation required');
      // The DB trigger (on_auth_user_created) already created the profile row
      // at user insert, so confirmation does NOT delay profile creation. The
      // best-effort upsert below only succeeds if RLS allows anon inserts —
      // it's a fallback, not the guarantee.
      void createProfile(data.user, name, username);
      return { status: 'confirmation_required', email: email.trim() };
    }

    if (!data.session) {
      throw new Error('Signup failed. Please try again.');
    }

    console.log('[Auth] Signup successful with session');
    setSession(data.session);
    setUser(mapSessionUser(data.session));
    setIsAuthenticated(true);
    void createProfile(data.user!, name, username);
    return { status: 'signed_in' };
  }, []);

  // ---- emailed 8-digit codes ------------------------------------------
  // Consumer auth emails carry a code, never a link, so no token ever
  // appears in a URL. The emails are chosen by the shared Supabase
  // templates, which give the consumer branch to any request without a
  // Venue Portal redirect; none of these calls sends one.

  const verifySignupCode = useCallback(async (email: string, code: string): Promise<void> => {
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data.session) {
      console.log('[Auth] Signup code rejected:', error?.code ?? 'no session');
      throw toAuthFlowError(error);
    }
    console.log('[Auth] Email confirmed');
    applySession(data.session);
  }, [applySession]);

  const resendSignupCode = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (!error) return;
    const mapped = toAuthFlowError(error);
    // Anything other than a rate limit stays silent, so the response doesn't
    // reveal whether the address has an account.
    if (mapped.kind === 'send_limited' || mapped.kind === 'rate_limited') throw mapped;
    console.log('[Auth] Resend failed:', error.code ?? error.message);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (!error) return;
    const mapped = toAuthFlowError(error);
    if (mapped.kind === 'send_limited' || mapped.kind === 'rate_limited') throw mapped;
    console.log('[Auth] Reset request failed:', error.code ?? error.message);
  }, []);

  const verifyRecoveryCode = useCallback(async (email: string, code: string): Promise<void> => {
    // Fail closed: without the marker, a restart after this point would
    // drop the user into the app with a session but no new password.
    try {
      await AsyncStorage.setItem(RECOVERY_PENDING_KEY, '1');
    } catch (e) {
      console.log('[Auth] Could not write recovery marker:', e);
      throw authFlowError('unknown');
    }
    recoveryRef.current = true;

    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
    if (error || !data.session) {
      recoveryRef.current = false;
      await clearRecoveryPending();
      console.log('[Auth] Recovery code rejected:', error?.code ?? 'no session');
      throw toAuthFlowError(error);
    }
    console.log('[Auth] Recovery code accepted; waiting for a new password');
    applySession(data.session);
  }, [applySession]);

  const completePasswordReset = useCallback(async (newPassword: string): Promise<void> => {
    if (!recoveryRef.current) throw authFlowError('session_expired');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const mapped = toAuthFlowError(error);
      console.log('[Auth] New password rejected:', mapped.kind);
      if (mapped.kind === 'session_expired') {
        recoveryRef.current = false;
        await clearRecoveryPending();
        await supabase.auth.signOut({ scope: 'local' });
        setIsRecoveringPassword(false);
      }
      throw mapped;
    }

    recoveryRef.current = false;
    await clearRecoveryPending();
    // Whoever knew the old password is signed out everywhere else.
    const { error: othersError } = await supabase.auth.signOut({ scope: 'others' });
    if (othersError) console.log('[Auth] Could not revoke other sessions:', othersError.message);

    const { data: { session: current } } = await supabase.auth.getSession();
    setIsRecoveringPassword(false);
    console.log('[Auth] Password reset complete');
    applySession(current);
  }, [applySession]);

  const cancelPasswordReset = useCallback(async (): Promise<void> => {
    // 'local' revokes only this recovery session, not the user's others.
    // If it fails (offline, say), supabase-js keeps the session, so the gate
    // and the marker must stay; otherwise the next token refresh or launch
    // would let the recovery session into the app without a new password.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.log('[Auth] Recovery sign-out failed:', error.message);
      throw authFlowError('unknown');
    }
    recoveryRef.current = false;
    await clearRecoveryPending();
    setIsRecoveringPassword(false);
    applySession(null);
  }, [applySession]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    // Capture the current user id before signOut fires the SIGNED_OUT
    // event and setUser(null) races the cleanup.
    const departingUserId = user?.id ?? null;
    // Before the session ends: this phone stops receiving the departing
    // account's pushes (needs the session to call the server).
    await unregisterThisDevice();
    const { error } = await supabase.auth.signOut();
    if (error) {
      // The server couldn't be reached, and supabase-js kept the stored
      // session. Clear it on this device so the logout sticks.
      console.log('[Auth] Server sign-out failed, clearing the session on this device:', error.message);
      await clearStoredSession();
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
    isRecoveringPassword,
    user,
    session,
    login,
    signup,
    logout,
    verifySignupCode,
    resendSignupCode,
    requestPasswordReset,
    verifyRecoveryCode,
    completePasswordReset,
    cancelPasswordReset,
  }), [
    isAuthenticated, isLoading, isRecoveringPassword, user, session, login, signup, logout,
    verifySignupCode, resendSignupCode, requestPasswordReset, verifyRecoveryCode,
    completePasswordReset, cancelPasswordReset,
  ]);
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
