// node --test tests/checkInFlow.test.mjs
// The check-in pipeline (services/checkInDatabase.ts) against a fake Supabase
// client: every way it can fail must say where and why, never fail silently.
import { register } from 'node:module';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

register('./support/rnStubLoader.mjs', import.meta.url);
const { store } = await import('./support/asyncStorage.mjs');
const { insertCheckIn } = await import('../services/checkInDatabase.ts');
const { FAILURES_KEY, describeError } = await import('../services/checkInErrors.ts');
const { checkInOutcomeMessage, manualCheckInUnavailable } = await import('../services/checkInOutcome.ts');

const USER = '11111111-1111-4111-8111-111111111111';
const VENUE = '22222222-2222-4222-8222-222222222222';
const photoFile = join(mkdtempSync(join(tmpdir(), 'pulze-ci-')), 'photo.jpg');
writeFileSync(photoFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]));
const PHOTO = pathToFileURL(photoFile).href;

/** A fake supabase-js client: records calls, answers as configured. */
function fakeClient({ upload = { error: null }, insert = { data: { id: 'ci-1' }, error: null }, insertThrows } = {}) {
  const calls = { uploads: [], inserts: [], removes: [] };
  return {
    calls,
    storage: {
      from: (bucket) => ({
        upload: async (path, bytes, opts) => { calls.uploads.push({ bucket, path, size: bytes.length, opts }); if (upload.throws) throw upload.throws; return upload; },
        remove: async (paths) => { calls.removes.push(...paths); return { error: null }; },
      }),
    },
    from: (table) => ({
      insert: (row) => {
        calls.inserts.push({ table, row });
        return { select: () => ({ single: async () => { if (insertThrows) throw insertThrows; return insert; } }) };
      },
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
}

const base = {
  userId: USER, venueId: VENUE, venueName: 'Test Bar', neighborhood: 'LoDo',
  photoUri: PHOTO, photoVisibility: true, capturedAt: new Date().toISOString(), quip: 'hi',
};
const failures = () => JSON.parse(store.get(FAILURES_KEY) ?? '[]');

beforeEach(() => { store.clear(); });

test('a photo check-in uploads under the user folder, then inserts that path', async () => {
  const c = (globalThis.__supabase = fakeClient());
  const r = await insertCheckIn(base);
  assert.equal(r.status, 'synced');
  assert.equal(r.id, 'ci-1');
  assert.equal(c.calls.uploads.length, 1);
  assert.equal(c.calls.uploads[0].bucket, 'check-in-photos');
  assert.match(c.calls.uploads[0].path, new RegExp(`^${USER}/\\d+\\.jpg$`));
  assert.equal(c.calls.uploads[0].size, 8);
  const row = c.calls.inserts[0].row;
  assert.equal(c.calls.inserts[0].table, 'check_ins');
  assert.equal(row.photo_url, c.calls.uploads[0].path);
  assert.equal(row.visibility, 'public');
  assert.match(row.client_ref, /^[0-9a-f-]{36}$/);
  assert.deepEqual(failures(), []);
});

test('an upload Storage refuses (RLS) fails visibly with its status and message, and inserts nothing', async () => {
  const err = Object.assign(new Error('new row violates row-level security policy'), { status: 403, statusCode: '403' });
  const c = (globalThis.__supabase = fakeClient({ upload: { error: err } }));
  const r = await insertCheckIn(base);
  assert.equal(r.status, 'failed');
  assert.equal(r.stage, 'upload');
  assert.match(r.reference, /^upload · 403 · new row violates row-level security/);
  assert.equal(c.calls.inserts.length, 0);
  const [f] = failures();
  assert.equal(f.stage, 'upload');
  assert.equal(f.code, '403');
});

test('an upload that never got an answer is kept for retry and still reported', async () => {
  globalThis.__supabase = fakeClient({ upload: { throws: new TypeError('Network request failed') } });
  const r = await insertCheckIn(base);
  assert.equal(r.status, 'pending');
  assert.equal(r.stage, 'upload');
  assert.match(r.reference, /Network request failed/);
  assert.equal(failures().length, 1);
});

test('an unreadable photo file is reported as such, not as an upload problem', async () => {
  const c = (globalThis.__supabase = fakeClient());
  const r = await insertCheckIn({ ...base, photoUri: pathToFileURL(join(tmpdir(), 'no-such-photo.jpg')).href });
  assert.equal(r.status, 'failed');
  assert.equal(r.stage, 'photo_read');
  assert.equal(c.calls.uploads.length, 0);
});

test('an insert the database refuses removes the uploaded photo and says why', async () => {
  const c = (globalThis.__supabase = fakeClient({ insert: { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "check_ins"' } } }));
  const r = await insertCheckIn(base);
  assert.equal(r.status, 'failed');
  assert.equal(r.stage, 'insert');
  assert.match(r.reference, /^insert · 42501 · /);
  assert.deepEqual(c.calls.removes, [c.calls.uploads[0].path]);
});

test('a duplicate keeps its friendly message and still carries a reference', async () => {
  globalThis.__supabase = fakeClient({ insert: { data: null, error: { code: 'P0001', message: 'check_in_duplicate' } } });
  const r = await insertCheckIn({ ...base, photoUri: null });
  assert.equal(r.error, 'You checked in here a few minutes ago.');
  assert.match(r.reference, /check_in_duplicate/);
});

test('a dropped connection on insert keeps the photo and queues the check-in', async () => {
  const c = (globalThis.__supabase = fakeClient({ insertThrows: new TypeError('Network request failed') }));
  const r = await insertCheckIn(base);
  assert.equal(r.status, 'pending');
  assert.equal(c.calls.removes.length, 0);
});

test('without a signed-in user nothing is sent and the user is told to sign in', async () => {
  for (const userId of ['', 'unknown']) {
    const c = (globalThis.__supabase = fakeClient());
    const r = await insertCheckIn({ ...base, userId });
    assert.equal(r.status, 'failed');
    assert.equal(r.stage, 'auth');
    assert.equal(c.calls.uploads.length + c.calls.inserts.length, 0);
  }
});

test('a venue that does not exist is refused before any upload', async () => {
  const c = (globalThis.__supabase = fakeClient());
  const r = await insertCheckIn({ ...base, venueId: 'v-404' });
  assert.equal(r.status, 'failed');
  assert.equal(r.stage, 'venue');
  assert.equal(c.calls.uploads.length, 0);
});

test('describeError reads supabase-js, Storage and plain errors', () => {
  assert.deepEqual(describeError({ code: '42501', message: 'denied' }), { code: '42501', message: 'denied' });
  assert.deepEqual(describeError(Object.assign(new Error('Payload too large'), { statusCode: '413' })), { code: '413', message: 'Payload too large' });
  assert.deepEqual(describeError('boom'), { message: 'boom' });
  assert.equal(describeError(null).message, 'unknown error');
  assert.equal(describeError({ message: 'x'.repeat(500) }).message.length, 200);
});

test('the user always sees what happened, with the reference when it failed', () => {
  assert.equal(checkInOutcomeMessage({ status: 'synced' }, 'Test Bar').title, 'Checked in');
  const p = checkInOutcomeMessage({ status: 'pending', error: 'saved', reference: 'upload · Network request failed' }, 'X');
  assert.equal(p.title, 'Not sent yet');
  assert.match(p.body, /Ref: upload · Network/);
  const f = checkInOutcomeMessage({ status: 'failed', reference: 'insert · 42501 · denied' }, 'X');
  assert.equal(f.title, 'Check-in failed');
  assert.match(f.body, /Ref: insert · 42501/);
});

test('"Check in manually" explains itself when there is no venue', () => {
  assert.equal(manualCheckInUnavailable(false, false).title, 'Location needed');
  assert.equal(manualCheckInUnavailable(true, false).title, 'Finding venues near you');
  assert.equal(manualCheckInUnavailable(true, true).title, 'No venues nearby');
});

test('the screens no longer swallow a check-in silently', () => {
  const activity = readFileSync(new URL('../app/activity.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(activity, /if \(!top\) return;/, 'Check in manually must not be a silent no-op');
  const capture = readFileSync(new URL('../app/check-in-capture.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(capture, /console\.log\('\[Capture\] Error taking photo/, 'a failed capture must be shown, not turned into a photo-less check-in');
  assert.equal((capture.match(/await insertCheckIn\(/g) ?? []).length, 2, 'one submit path (signed-in and signed-out branches)');
  assert.match(capture, /onCameraReady=/, 'the countdown waits for the camera');
});
