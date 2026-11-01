// Error mapping and input rules for the emailed-code auth flows
// (signup confirmation and password recovery).
//
// Supabase Auth answers a wrong, expired and already-used code with the same
// error (otp_expired, "Token has expired or is invalid"), so the app can't
// tell them apart and shows one message for all three.

import { FunctionsHttpError, isAuthApiError, isAuthWeakPasswordError } from '@supabase/supabase-js';

// Matches mailer_otp_length on both Supabase projects. If that setting
// changes, this must change with it or every code is rejected client-side.
export const CODE_LENGTH = 8;

// For new passwords (signup and reset), matching the Venue Portal and
// Supabase Auth's server-side password_min_length. Not applied at login:
// accounts created under the old 6-character rule must still sign in.
export const MIN_PASSWORD_LENGTH = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Keeps digits only, so a pasted "1234 5678" or "1234-5678" still works. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && /^\d+$/.test(code);
}

export type AuthFlowErrorKind =
  | 'invalid_code'
  | 'rate_limited'
  | 'send_limited'
  | 'weak_password'
  | 'leaked_password'
  | 'same_password'
  | 'session_expired'
  | 'email_not_confirmed'
  | 'invalid_credentials'
  | 'email_taken'
  | 'username_unavailable'
  | 'username_invalid'
  | 'unknown';

export class AuthFlowError extends Error {
  readonly kind: AuthFlowErrorKind;
  /** Set for email_not_confirmed, so the screen can offer the code step. */
  readonly email?: string;

  constructor(kind: AuthFlowErrorKind, message: string, email?: string) {
    super(message);
    this.name = 'AuthFlowError';
    this.kind = kind;
    this.email = email;
  }
}

export const AUTH_FLOW_MESSAGES: Record<AuthFlowErrorKind, string> = {
  invalid_code: 'That code is incorrect or has expired. Check your latest email, or request a new code.',
  rate_limited: 'Too many attempts. Wait a few minutes, then try again.',
  send_limited: 'A code was sent recently. Wait a minute before requesting another.',
  weak_password: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
  leaked_password: 'This password has appeared in a data breach. Choose a different one.',
  same_password: 'Choose a password different from your current one.',
  session_expired: 'Your reset has expired. Request a new code.',
  email_not_confirmed: 'Confirm your email to log in. Enter the code from your email, or request a new one.',
  invalid_credentials: 'Invalid email/username or password',
  email_taken: 'An account with this email already exists. Log in, or use Forgot password.',
  username_unavailable: 'That username is taken. Choose a different one.',
  username_invalid: 'Usernames are 3 to 30 characters, with no spaces, @ or /.',
  unknown: 'Something went wrong. Check your connection and try again.',
};

export function authFlowError(kind: AuthFlowErrorKind, email?: string): AuthFlowError {
  return new AuthFlowError(kind, AUTH_FLOW_MESSAGES[kind], email);
}

/** Maps a Supabase Auth error from verifyOtp, resend, resetPasswordForEmail or updateUser. */
export function toAuthFlowError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  if (isAuthWeakPasswordError(error)) {
    return authFlowError(error.reasons.includes('pwned') ? 'leaked_password' : 'weak_password');
  }

  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'otp_expired':
        return authFlowError('invalid_code');
      case 'over_email_send_rate_limit':
        return authFlowError('send_limited');
      case 'over_request_rate_limit':
        return authFlowError('rate_limited');
      case 'same_password':
        return authFlowError('same_password');
      case 'weak_password':
        return authFlowError('weak_password');
      case 'session_not_found':
      case 'session_expired':
      case 'refresh_token_not_found':
      case 'refresh_token_already_used':
        return authFlowError('session_expired');
      case 'email_not_confirmed':
        return authFlowError('email_not_confirmed');
    }
    if (error.status === 429) return authFlowError('rate_limited');
    if (error.status === 403 && /expired or is invalid/i.test(error.message)) {
      return authFlowError('invalid_code');
    }
  }

  // Signing out and back in is the only way out of a session the server no
  // longer recognises, so treat a missing session like an expired one.
  if (error && typeof error === 'object' && (error as { name?: string }).name === 'AuthSessionMissingError') {
    return authFlowError('session_expired');
  }

  return authFlowError('unknown');
}

/**
 * Maps a failed login, from signInWithPassword (email) or the
 * login-with-username Edge Function. Wrong password, unknown account and
 * unknown username share one message, so the screen reveals nothing about
 * which accounts exist. Everything else (offline, rate limit, server error)
 * gets its own message instead of looking like a wrong password.
 */
export function toLoginError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  if (error instanceof FunctionsHttpError) {
    const status = (error.context as { status?: number } | undefined)?.status;
    if (status === 400 || status === 401) return authFlowError('invalid_credentials');
    if (status === 429) return authFlowError('rate_limited');
    return authFlowError('unknown');
  }

  if (isAuthApiError(error)) {
    if (error.code === 'invalid_credentials') return authFlowError('invalid_credentials');
    if (error.status === 400 && /invalid login credentials/i.test(error.message)) {
      return authFlowError('invalid_credentials');
    }
  }

  const mapped = toAuthFlowError(error);
  // Only the login-relevant kinds pass through; anything else is reported as
  // a problem reaching the server, not as a wrong password.
  return mapped.kind === 'rate_limited' || mapped.kind === 'email_not_confirmed'
    ? mapped
    : authFlowError('unknown');
}

/**
 * Maps a failed signUp. With email confirmation off, Supabase reports a
 * registered email directly (user_already_exists). A taken username fails
 * inside the profile trigger, which Supabase reports only as
 * "Database error saving new user"; that trigger has no other failure a
 * signup can cause, so it is reported as a taken username.
 */
export function toSignupError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  if (isAuthApiError(error) && (error.code === 'user_already_exists' || error.code === 'email_exists')) {
    return authFlowError('email_taken');
  }
  // supabase-js 2.110+ reports any 5xx as AuthRetryableFetchError, not
  // AuthApiError, so match the trigger failure by status and message.
  const e = error as { status?: number; code?: string; message?: string } | null;
  if (e && e.status === 500
      && (e.code === 'unexpected_failure' || /database error saving new user/i.test(e.message ?? ''))) {
    return authFlowError('username_unavailable');
  }

  const mapped = toAuthFlowError(error);
  return mapped.kind === 'rate_limited' || mapped.kind === 'weak_password' || mapped.kind === 'leaked_password'
    ? mapped
    : authFlowError('unknown');
}
