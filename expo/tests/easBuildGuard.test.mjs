// node --test tests/easBuildGuard.test.mjs
// Uses unsigned fake JWTs: only the payload claims matter to the guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBuildEnv } from '../scripts/eas-build-guard.mjs';

const STAGING = 'noxkfboguoyggyhaqrbx';
const OTHER = 'someotherprojectref0'; // stands in for production
const fakeKey = (ref, role = 'anon') =>
  ['e30', Buffer.from(JSON.stringify({ ref, role })).toString('base64url'), 'sig'].join('.');
const env = (profile, ref, key = fakeKey(ref)) => ({
  EAS_BUILD_PROFILE: profile,
  EAS_BUILD_PLATFORM: 'ios',
  EXPO_USE_PRECOMPILED_MODULES: '0',
  EXPO_PUBLIC_SUPABASE_URL: ref ? `https://${ref}.supabase.co` : undefined,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: key,
});

test('testflight with the staging URL and staging anon key passes', () => {
  assert.deepEqual(checkBuildEnv(env('testflight', STAGING)).errors, []);
});

test('testflight with missing env fails (EAS environment not set up)', () => {
  const { errors } = checkBuildEnv({ EAS_BUILD_PROFILE: 'testflight' });
  assert.ok(errors.some((e) => e.includes('URL is not set')));
  assert.ok(errors.some((e) => e.includes('ANON_KEY is not set')));
});

test('testflight, preview and unknown profiles refuse any non-staging project', () => {
  for (const p of ['testflight', 'preview', 'some-new-profile']) {
    const { errors } = checkBuildEnv(env(p, OTHER));
    assert.ok(errors.some((e) => e.includes('must use the staging URL')), p);
  }
});

test('a staging URL with the production key, or a service-role key, fails', () => {
  assert.ok(checkBuildEnv(env('testflight', STAGING, fakeKey(OTHER))).errors.length > 0);
  assert.ok(checkBuildEnv(env('testflight', STAGING, fakeKey(STAGING, 'service_role'))).errors.length > 0);
});

test('development needs no baked-in env; production may use production', () => {
  assert.deepEqual(checkBuildEnv({ EAS_BUILD_PROFILE: 'development' }).errors, []);
  assert.deepEqual(checkBuildEnv(env('production', OTHER)).errors, []);
});

test("Rork's analytics variables are refused outside development", () => {
  const e = { ...env('testflight', STAGING), EXPO_PUBLIC_PROJECT_ID: 'x', EXPO_PUBLIC_TEAM_ID: 'y' };
  assert.equal(checkBuildEnv(e).errors.filter((m) => m.includes('analytics')).length, 2);
  assert.deepEqual(checkBuildEnv({ ...e, EAS_BUILD_PROFILE: 'development' }).errors, []);
});

test('errors never contain the key itself', () => {
  const key = fakeKey(OTHER);
  const { errors } = checkBuildEnv(env('testflight', STAGING, key));
  assert.ok(errors.every((e) => !e.includes(key)));
});

test("iOS builds outside production refuse Expo's precompiled modules (Build 2 launch crash)", () => {
  for (const value of [undefined, '1', '']) {
    for (const p of ['testflight', 'preview', 'ios-simulator', 'development']) {
      const e = { ...env(p, STAGING), EXPO_USE_PRECOMPILED_MODULES: value };
      assert.ok(checkBuildEnv(e).errors.some((m) => m.includes('EXPO_USE_PRECOMPILED_MODULES')), `${p} ${value}`);
    }
  }
  assert.deepEqual(checkBuildEnv(env('testflight', STAGING)).errors, []);
  // Android and local runs are unaffected.
  assert.deepEqual(checkBuildEnv({ ...env('preview', STAGING), EAS_BUILD_PLATFORM: 'android', EXPO_USE_PRECOMPILED_MODULES: undefined }).errors, []);
});

test('every non-production profile in eas.json disables precompiled modules', async () => {
  const { readFile } = await import('node:fs/promises');
  const eas = JSON.parse(await readFile(new URL('../eas.json', import.meta.url), 'utf8'));
  for (const [name, profile] of Object.entries(eas.build)) {
    if (name === 'production') continue;
    assert.equal(profile.env?.EXPO_USE_PRECOMPILED_MODULES, '0', name);
  }
});
