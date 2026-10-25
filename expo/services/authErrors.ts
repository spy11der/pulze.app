// Error mapping and input rules for the emailed-code auth flows
// (signup confirmation and password recovery).
//
// Supabase Auth answers a wrong, expired and already-used code with the same
// error (otp_expired, "Token has expired or is invalid"), so the app can't
// tell them apart and shows one message for all three.

import { isAuthApiError, isAuthWeakPasswordError } from '@supabase/supabase-js';

// Matches mailer_otp_length on both Supabase projects. If that setting
// changes, this must change with it or every code is rejected client-side.
export const CODE_LENGTH = 8;

// The consumer signup rule, and Supabase Auth's server-side password_min_length.
export const MIN_PASSWORD_LENGTH = 6;

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
