// Happy Hour client — thin wrappers over the three RPCs shipped in
// migration 20260913180312_venue_happy_hours_schema.
//
// Fetches are fire-and-forget. On failure (network, RPC error,
// auth) the caller gets an empty array so a happy-hour outage never
// blocks venue rendering. Callers should treat these as
// discovery/enrichment data, not source-of-truth for a screen.
//
// Weekly is the one call that takes a venue id; the other two are
// city-wide reads that the server already filters (active + fresh
// + effective-range) via v_active_happy_hours.

import { supabase } from '@/services/supabase';
import type { Database } from '@/types/supabase';

export type HappyHourNow =
  Database['public']['Functions']['get_happy_hours_happening_now']['Returns'][number];

export type HappyHourUpcoming =
  Database['public']['Functions']['get_happy_hours_upcoming_today']['Returns'][number];

export type HappyHourWeekly =
  Database['public']['Functions']['get_venue_weekly_happy_hours']['Returns'][number];

export async function fetchHappyHoursHappeningNow(): Promise<HappyHourNow[]> {
  try {
    const { data, error } = await supabase.rpc('get_happy_hours_happening_now');
    if (error) {
      console.log('[HappyHours] happening_now rpc error:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.log('[HappyHours] happening_now crashed:', e);
    return [];
  }
}

export async function fetchHappyHoursUpcomingToday(): Promise<HappyHourUpcoming[]> {
  try {
    const { data, error } = await supabase.rpc('get_happy_hours_upcoming_today');
    if (error) {
      console.log('[HappyHours] upcoming_today rpc error:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.log('[HappyHours] upcoming_today crashed:', e);
    return [];
  }
}

export async function fetchVenueWeeklyHappyHours(venueId: string): Promise<HappyHourWeekly[]> {
  if (!venueId) return [];
  try {
    const { data, error } = await supabase.rpc('get_venue_weekly_happy_hours', { p_venue_id: venueId });
    if (error) {
      console.log('[HappyHours] weekly rpc error:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.log('[HappyHours] weekly crashed:', e);
    return [];
  }
}


// ------------------------------------------------------------
// Shape helpers used by Nearby + venue detail.
// ------------------------------------------------------------

// Compact lookup for the Nearby "Happy Hour Now" filter and card
// badge: venue_id -> the first happy-hour row currently open for
// that venue. If a venue has multiple concurrent windows the first
// one is fine — the badge only needs to say "ends at X".
export function buildHappeningNowIndex(list: HappyHourNow[]): Map<string, HappyHourNow> {
  const idx = new Map<string, HappyHourNow>();
  for (const row of list) {
    if (!row?.venue_id) continue;
    if (!idx.has(row.venue_id)) idx.set(row.venue_id, row);
  }
  return idx;
}

// Server returns Postgres `time` values as "HH:MM:SS". Format to
// "3:00 PM" / "12:30 AM" for display. Minutes get elided when :00.
export function formatLocalTimeLabel(hhmmss: string | null | undefined): string {
  if (!hhmmss || typeof hhmmss !== 'string') return '';
  const parts = hhmmss.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? '0');
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ISO weekday number (1=Mon..7=Sun) -> short label.
const DOW_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Compact human label for a days-of-week set. Groups contiguous ISO
// runs so [1,2,3,4,5] -> "Mon–Fri", [6,7] -> "Sat & Sun",
// [1,2,3,4,5,6,7] -> "Daily", [1,3,5] -> "Mon, Wed & Fri".
export function formatDaysOfWeek(days: number[] | null | undefined): string {
  if (!Array.isArray(days) || days.length === 0) return '';
  const uniq = Array.from(new Set(days.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
  if (uniq.length === 7) return 'Daily';

  // Detect contiguous runs.
  const runs: number[][] = [];
  let current: number[] = [];
  for (const d of uniq) {
    if (current.length === 0 || d === current[current.length - 1] + 1) {
      current.push(d);
    } else {
      runs.push(current);
      current = [d];
    }
  }
  if (current.length > 0) runs.push(current);

  const runLabels = runs.map((run) => {
    if (run.length === 1) return DOW_SHORT[run[0]];
    if (run.length === 2) return `${DOW_SHORT[run[0]]} & ${DOW_SHORT[run[1]]}`;
    return `${DOW_SHORT[run[0]]}–${DOW_SHORT[run[run.length - 1]]}`;
  });

  if (runLabels.length === 1) return runLabels[0];
  if (runLabels.length === 2) return `${runLabels[0]} & ${runLabels[1]}`;
  return `${runLabels.slice(0, -1).join(', ')} & ${runLabels[runLabels.length - 1]}`;
}
