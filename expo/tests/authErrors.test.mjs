// node --test tests/authErrors.test.mjs   (Node 22.18+ strips the types from the imported .ts module)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthWeakPasswordError,
  FunctionsFetchError,
  FunctionsHttpError,
} from '@supabase/supabase-js';
import {
  AuthFlowError,
  CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  isCompleteCode,
  isValidEmail,
  normalizeCode,
  toAuthFlowError,
  toLoginError,
  toSignupError,
} from '../services/authErrors.ts';

const kind = (e) => toAuthFlowError(e).kind;

test('wrong, expired and reused codes share one message', () => {
  // Supabase Auth's single answer for all three.
  assert.equal(kind(new AuthApiError('Token has expired or is invalid', 403, 'otp_expired')), 'invalid_code');
  assert.equal(kind(new AuthApiError('Token has expired or is invalid', 403, undefined)), 'invalid_code');
});

test('rate limits', () => {
  assert.equal(kind(new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit')), 'rate_limited');
  assert.equal(
    kind(new AuthApiError('For security purposes, you can only request this after 52 seconds.', 429, 'over_email_send_rate_limit')),
    'send_limited',
  );
  assert.equal(kind(new AuthApiError('slow down', 429, undefined)), 'rate_limited');
});

test('password rejections', () => {
  assert.equal(kind(new AuthWeakPasswordError('Password is known to be weak', 422, ['pwned'])), 'leaked_password');
  assert.equal(kind(new AuthWeakPasswordError('Password should be at least 6 characters.', 422, ['length'])), 'weak_password');
  assert.equal(kind(new AuthApiError('New password should be different from the old password.', 422, 'same_password')), 'same_password');
});

test('a lost recovery session asks for a new code', () => {
  assert.equal(kind(new AuthSessionMissingError()), 'session_expired');
  assert.equal(kind(new AuthApiError('Session not found', 403, 'session_not_found')), 'session_expired');
});

test('anything else is generic and leaks nothing', () => {
  assert.equal(kind(new AuthApiError('User not found', 400, 'user_not_found')), 'unknown');
  assert.equal(kind(new TypeError('Network request failed')), 'unknown');
  assert.equal(kind(undefined), 'unknown');
  assert.ok(!toAuthFlowError(new AuthApiError('User not found', 400, 'user_not_found')).message.includes('User'));
});

test('an AuthFlowError passes through unchanged', () => {
  const e = new AuthFlowError('email_not_confirmed', 'x', 'a@b.co');
  assert.equal(toAuthFlowError(e), e);
});

test('new passwords need 10 characters, matching the Portal and the server', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 10);
  assert.match(toAuthFlowError(new AuthWeakPasswordError('Password should be at least 10 characters.', 422, ['length'])).message, /at least 10 characters/);
});

test('code input', () => {
  assert.equal(CODE_LENGTH, 8);
  assert.equal(normalizeCode('1234 5678'), '12345678');
  assert.equal(normalizeCode('1234-5678-99'), '12345678');
  assert.equal(normalizeCode('ab12'), '12');
  assert.ok(isCompleteCode('12345678'));
  assert.ok(!isCompleteCode('1234567'));
  assert.ok(!isCompleteCode(''));
});

test('email shape', () => {
  assert.ok(isValidEmail(' someone@example.com '));
  assert.ok(!isValidEmail('someone'));
  assert.ok(!isValidEmail('a@b'));
});

const loginKind = (e) => toLoginError(e).kind;

test('a wrong password, unknown email or unknown username share one message', () => {
  assert.equal(loginKind(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')), 'invalid_credentials');
  assert.equal(loginKind(new AuthApiError('Invalid login credentials', 400, undefined)), 'invalid_credentials');
  assert.equal(loginKind(new FunctionsHttpError(new Response('{}', { status: 401 }))), 'invalid_credentials');
  assert.equal(toLoginError(new FunctionsHttpError(new Response('{}', { status: 401 }))).message, 'Invalid email/username or password');
});

test('login problems that are not a wrong password say so', () => {
  assert.equal(loginKind(new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit')), 'rate_limited');
  assert.equal(loginKind(new FunctionsHttpError(new Response('{}', { status: 429 }))), 'rate_limited');
  assert.equal(loginKind(new FunctionsHttpError(new Response('{}', { status: 500 }))), 'unknown');
  assert.equal(loginKind(new FunctionsFetchError(new Error('Network request failed'))), 'unknown');
  assert.equal(loginKind(new AuthRetryableFetchError('Network request failed', 0)), 'unknown');
  assert.equal(loginKind(new AuthApiError('Database error', 500, 'unexpected_failure')), 'unknown');
  assert.equal(loginKind(null), 'unknown');
  assert.equal(loginKind(new AuthApiError('Email not confirmed', 400, 'email_not_confirmed')), 'email_not_confirmed');
});

const signupKind = (e) => toSignupError(e).kind;

test('signup explains a registered email or a taken username', () => {
  assert.equal(signupKind(new AuthApiError('User already registered', 422, 'user_already_exists')), 'email_taken');
  assert.equal(signupKind(new AuthApiError('Database error saving new user', 500, 'unexpected_failure')), 'username_unavailable');
  assert.equal(signupKind(new AuthApiError('Database error saving new user', 500, undefined)), 'username_unavailable');
  // supabase-js 2.110+: a 5xx arrives as AuthRetryableFetchError
  assert.equal(signupKind(new AuthRetryableFetchError('Database error saving new user', 500)), 'username_unavailable');
});

test('other signup failures keep their own message', () => {
  assert.equal(signupKind(new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit')), 'rate_limited');
  assert.equal(signupKind(new AuthWeakPasswordError('weak', 422, ['pwned'])), 'leaked_password');
  assert.equal(signupKind(new AuthRetryableFetchError('Network request failed', 0)), 'unknown');
});

test('a suspended account is told so on email sign-in (Supabase Auth reports it); username sign-in stays generic', () => {
  assert.equal(loginKind(new AuthApiError('User is banned', 400, 'user_banned')), 'account_suspended');
  assert.equal(loginKind(new FunctionsHttpError(new Response('{}', { status: 401 }))), 'invalid_credentials');
});
