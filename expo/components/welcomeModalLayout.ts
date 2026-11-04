// Geometry of the onboarding card (WelcomeModal), kept apart so tests can
// check it without React Native.
//
// Every slide is exactly as wide as the card's content box,
// which is the overlay's width minus OVERLAY_GUTTER and CARD_PADDING on each
// side. The old code sized slides as screen - 48, ignoring the card's own
// 32 pt padding, so each slide was 64 pt wider than the visible area: text and
// buttons ran past the card's right edge and, after a slide, the previous
// slide showed through the left padding.
export const OVERLAY_GUTTER = 24;
export const CARD_PADDING = 32;
export const CARD_MAX_WIDTH = 440;

/** The width one slide must have for a card shown in a window this wide. */
export function slideWidthFor(windowWidth: number): number {
  const card = Math.min(windowWidth - OVERLAY_GUTTER * 2, CARD_MAX_WIDTH);
  return Math.max(0, card - CARD_PADDING * 2);
}
