// node --test tests/signupProfile.test.mjs
// Clients have no INSERT on public.profiles (staging/prod grant hardening,
// 2026-09-20); on_auth_user_created creates the row from the signup metadata.
// A client upsert is an INSERT ... ON CONFLICT, so it was refused (403, 42501)
// on every signup. Verified on staging 2026-11-04: the trigger row carries the
// chosen username and display name, and the client upsert is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../providers/AuthProvider.tsx', import.meta.url), 'utf8');

test('signup does not write public.profiles from the client', () => {
  assert.doesNotMatch(auth, /from\('profiles'\)\s*\.(insert|upsert)\(/);
  assert.doesNotMatch(auth, /createProfile\(/);
});

test('signup still hands the trigger its username and display name', () => {
  assert.match(auth, /options: \{ data: \{ display_name: name, username \} \}/);
});
