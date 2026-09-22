import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';

/**
 * The single disclosure surface for paid placement.
 *
 * Phase 6A-1 (decision A3) ships this inert: pulze_discover_feed hardcodes
 * is_sponsored = false on every row, and pulze_organic_score takes no
 * monetization input at all, so this component renders nowhere today. It
 * exists now so that 6B (CPC delivery) and 6C (boosted placement) plug into a
 * disclosure path that already exists and has already been reviewed, instead
 * of bolting labelling on at the same moment money starts moving.
 *
 * The rules this component encodes:
 *
 *   1. DISCLOSURE IS SERVER-DRIVEN. `isSponsored` comes from the feed. There
 *      is no client-side inference — the client cannot decide a card is
 *      sponsored, and cannot decide one isn't.
 *
 *   2. RENDERING IS NOT OPTIONAL. A card whose row carries isSponsored=true
 *      must render this. Callers pass the flag straight through rather than
 *      wrapping it in their own condition, which is why the component itself
 *      returns null for the false case: there is exactly one place that
 *      decides whether the label appears.
 *
 *   3. THE LABEL NEVER IMPLIES BUSYNESS. It is a placement disclosure and
 *      nothing else. Busyness continues to be gated solely by
 *      hasReliableBusyness(), which deliberately ignores isSponsored — a
 *      sponsored card with no live signal still reads "No live data".
 *
 *   4. IT IS NOT DISMISSIBLE and is not rendered as a chip the user can
 *      confuse with a vibe tag or a venue-type chip. Muted, small, and
 *      visually distinct from the aqua accent that marks real venue
 *      attributes.
 */
export const SPONSORED_LABEL = 'Sponsored';

export const SponsoredBadge = React.memo(function SponsoredBadge({
  isSponsored,
}: {
  isSponsored?: boolean;
}) {
  const { colors, isDark } = useTheme();
  if (!isSponsored) return null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel="Sponsored placement"
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>{SPONSORED_LABEL}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
});
