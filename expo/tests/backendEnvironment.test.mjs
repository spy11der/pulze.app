// node --test tests/backendEnvironment.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environmentFor, projectRefFrom } from '../services/backendEnvironment.ts';

const envOf = (url) => environmentFor(projectRefFrom(url));

test('the label comes from the URL the client uses', () => {
  assert.equal(envOf('https://noxkfboguoyggyhaqrbx.supabase.co'), 'staging');
  assert.equal(projectRefFrom('https://noxkfboguoyggyhaqrbx.supabase.co'), 'noxkfboguoyggyhaqrbx');
  assert.equal(envOf('https://someotherproject.supabase.co'), 'other');
});

test('a missing or malformed URL is never labelled staging', () => {
  assert.equal(projectRefFrom(''), 'none');
  assert.equal(envOf(''), 'other');
  assert.equal(envOf('not a url'), 'other');
  assert.equal(envOf('https://noxkfboguoyggyhaqrbx.example.com'), 'other');
});
