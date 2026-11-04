// node --test tests/welcomeModalLayout.test.mjs
// The onboarding carousel (components/WelcomeModal.tsx) on real iPhone widths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARD_MAX_WIDTH, CARD_PADDING, OVERLAY_GUTTER, slideWidthFor } from '../components/welcomeModalLayout.ts';

// Logical widths (pt) of the portrait iPhones iOS 16.4+ runs on.
const IPHONES = {
  'SE (2nd/3rd gen), 13 mini': 375,
  '12/13/14, 16e': 390,
  '15, 15 Pro, 16, 16 Pro': 393,
  '16 Pro (2024)': 402,
  '12/13 Pro Max, 14 Plus': 428,
  '15 Plus, 15 Pro Max, 16 Plus': 430,
  '16 Pro Max': 440,
};

for (const [model, w] of Object.entries(IPHONES)) {
  test(`iPhone ${model} (${w} pt): one slide fills the card's content box exactly`, () => {
    const slide = slideWidthFor(w);
    const card = Math.min(w - OVERLAY_GUTTER * 2, CARD_MAX_WIDTH);
    assert.equal(slide + CARD_PADDING * 2, card, 'slide + padding = card width');
    assert.ok(card + OVERLAY_GUTTER * 2 <= w, 'card fits the screen');
    // Build 3's arithmetic: screen - 48, 64 pt wider than the content box.
    assert.equal((w - 48) - slide, 64);
  });
}

test('never negative on a very narrow window', () => {
  assert.equal(slideWidthFor(100), 0);
});

test('WelcomeModal sizes slides from the layout module, not from the screen', () => {
  const src = readFileSync(new URL('../components/WelcomeModal.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Dimensions\.get/, 'no module-level screen size');
  assert.doesNotMatch(src, /CARD_INNER_WIDTH/);
  assert.match(src, /slideWidthFor\(windowWidth\)/);
  assert.match(src, /styles\.viewport/, 'the track is clipped to the content box');
  assert.equal((src.match(/width: slideWidth \}/g) ?? []).length, 3, 'all three slides use the measured width');
});
