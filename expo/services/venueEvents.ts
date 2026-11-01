// Events a venue publishes in the Portal (venue_events). The read policy only
// returns events that have not ended; cancelled ones are kept so the app can
// say so rather than silently dropping them.
import { supabase } from '@/services/supabase';

export interface VenueEvent {
  id: string;
  title: string;
  description: string | null;
  cancelled: boolean;
  /** e.g. "Fri, Nov 7 · 9:00 PM – 12:00 AM", in the venue's own time zone. */
  whenLabel: string;
  startsAt: string;
}

export function formatEventWhen(startsAt: string, endsAt: string, timeZone: string | null): string {
  const tz = timeZone ?? undefined;
  try {
    const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(startsAt));
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
    return `${day} · ${time.format(new Date(startsAt))} – ${time.format(new Date(endsAt))}`;
  } catch {
    return new Date(startsAt).toLocaleString();
  }
}

export async function getUpcomingVenueEvents(venueId: string): Promise<VenueEvent[] | null> {
  const [{ data, error }, { data: venue }] = await Promise.all([
    (supabase.from('venue_events' as any) as any)
      .select('id, title, description, status, starts_at, ends_at')
      .eq('venue_id', venueId)
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase.from('venues').select('timezone').eq('id', venueId).maybeSingle(),
  ]);
  if (error) return null;
  const tz = (venue as { timezone?: string } | null)?.timezone ?? null;
  return ((data ?? []) as any[]).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    cancelled: e.status === 'cancelled',
    whenLabel: formatEventWhen(e.starts_at, e.ends_at, tz),
    startsAt: e.starts_at,
  }));
}
