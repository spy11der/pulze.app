// supabase/functions/_shared/providers/besttime.ts
//
// Not implemented. BestTime.app is primarily a foot-traffic/busyness-curve
// data source rather than a venue-discovery source — likely feeds into the
// scoring pipeline differently than a venue importer (probably enriching
// existing venues rather than creating new ones via upsertExternalVenue).
// Worth a design decision when this is actually built, not assumed here.
// Secret name reserved: BESTTIME_API_KEY.

export async function fetchBestTimeData(_venueId: string): Promise<unknown> {
  throw new Error('BestTime adapter not implemented yet');
}
