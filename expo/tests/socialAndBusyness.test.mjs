// node --test tests/socialAndBusyness.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { literalLikePattern } from '../utils/likePattern.ts';
import { hasReliableBusyness, MIN_BUSYNESS_CONFIDENCE } from '../types/venue.ts';

test('username search matches literally: wildcards are escaped', () => {
  assert.equal(literalLikePattern('a_b'), 'a\\_b');
  assert.equal(literalLikePattern('100%'), '100\\%');
  assert.equal(literalLikePattern('back\\slash'), 'back\\\\slash');
  assert.equal(literalLikePattern('plain.name'), 'plain.name');
});

test('no live signal means no busyness figure (No live data)', () => {
  assert.equal(hasReliableBusyness({}), false, 'confidence not fetched');
  assert.equal(hasReliableBusyness({ confidence: 0 }), false, 'no signal at all');
  assert.equal(hasReliableBusyness({ confidence: MIN_BUSYNESS_CONFIDENCE - 1 }), false, 'below the floor');
  assert.equal(hasReliableBusyness({ confidence: MIN_BUSYNESS_CONFIDENCE }), true);
  // Sponsorship never buys a crowd figure.
  assert.equal(hasReliableBusyness({ confidence: 0, isSponsored: true }), false);
});
