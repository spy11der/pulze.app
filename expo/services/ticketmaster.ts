// Ticketmaster client for the Expo app (dev only)
// - Reads EXPO_PUBLIC_TICKETMASTER_API_KEY
// - If EXPO_PUBLIC_API_BASE_URL is set, uses our local Express API to avoid rate limits

import type { ArtistListing, PulzeEvent, TicketTier } from '@/mocks/events';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

function todayUtcStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function pickImage(ev: any): string {
  const imgs: any[] = ev?.images ?? [];
  if (!imgs.length) return 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop';
  // Prefer 16:9 large images
  const sixteenNine = imgs.filter(i => (i.ratio?.toLowerCase?.() ?? '') === '16_9').sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return (sixteenNine[0]?.url) || imgs[0]?.url || imgs[imgs.length - 1]?.url;
}

function fmtDate(ev: any): string {
  const d = ev?.dates?.start;
  const dt = d?.dateTime || d?.localDate || d?.localTime;
  if (!dt) return 'TBA';
  const date = new Date(d?.dateTime ?? d?.localDate ?? Date.now());
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function fetchTMEvents(opts?: {
  postalCode?: string;
  radius?: number;
  unit?: 'miles' | 'km';
  startDateTime?: string;
}): Promise<ArtistListing[]> {
  // Prefer our local API if configured
  if (API_BASE) {
    try {
      const url = `${API_BASE.replace(/\/$/, '')}/api/tm/events?limit=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Local API request failed: ${res.status} ${res.statusText}`);
      const list = await res.json();
      return list as ArtistListing[];
    } catch (_e) {
      console.warn('[TM] Local API unreachable, falling back to Ticketmaster for list');
      // fall through to direct TM below
    }
  }

  // Fallback: direct TM API
  const key = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
  if (!key) throw new Error('Missing EXPO_PUBLIC_TICKETMASTER_API_KEY');
  const postal = opts?.postalCode ?? '80202';
  const radius = opts?.radius ?? 50;
  const unit = opts?.unit ?? 'miles';
  const start = encodeURIComponent(opts?.startDateTime ?? todayUtcStartIso());

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?postalCode=${postal}&radius=${radius}&unit=${unit}&startDateTime=${start}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const events: any[] = data?._embedded?.events ?? [];

  const toArtistListing = (ev: any): ArtistListing => {
    const venue = ev?._embedded?.venues?.[0];
    const attraction = ev?._embedded?.attractions?.[0];
    const price = Array.isArray(ev?.priceRanges) && ev.priceRanges.length > 0 ? Number(ev.priceRanges[0].min ?? 0) : 0;
    const genre = ev?.classifications?.[0]?.genre?.name ?? 'Event';
    return {
      id: String(ev.id),
      artistName: String(attraction?.name ?? ev.name ?? 'Event'),
      eventName: String(ev.name ?? 'Event'),
      venue: String(venue?.name ?? 'TBA'),
      venueId: String(venue?.id ? `tmv-${venue.id}` : 'tmv-unknown'),
      date: fmtDate(ev),
      startingPrice: isFinite(price) ? price : 0,
      image: pickImage(ev),
      genre,
      trending: Boolean(ev?.promoter || ev?.pleaseNote),
      sellingFast: false,
      soldOutPercent: 0,
    };
  };

  return events.map(toArtistListing);
}

// Map TM event details payload -> PulzeEvent used by ticketing screen
function toPulzeEvent(details: any): PulzeEvent {
  const venue = details?._embedded?.venues?.[0] ?? {};
  const start = details?.dates?.start ?? {};
  const dateObj = start?.dateTime ? new Date(start.dateTime) : start?.localDate ? new Date(start.localDate) : new Date();
  const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = start?.localTime || (start?.dateTime ? dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'TBA');

  const priceRanges: any[] = Array.isArray(details?.priceRanges) ? details.priceRanges : [];
  const tiers: TicketTier[] = priceRanges.length
    ? priceRanges.slice(0, 2).map((pr, idx) => ({
        id: `tm-tier-${idx}`,
        name: (pr?.type && String(pr.type)) || (idx === 0 ? 'General Admission' : 'VIP'),
        price: Number(pr?.min ?? pr?.max ?? 0) || 0,
        originalPrice: undefined,
        perks: ['General admission'],
        available: 50,
        total: 500,
        soldOut: false,
        tag: idx === 0 ? 'Most Popular' : undefined,
      }))
    : [
        {
          id: 'tm-tier-ga',
          name: 'General Admission',
          price: 0,
          originalPrice: undefined,
          perks: ['General admission'],
          available: 100,
          total: 500,
          soldOut: false,
        },
      ];

  const hero = pickImage(details) || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop';

  return {
    id: String(details?.id || 'tm-unknown'),
    source: 'eventbrite', // placeholder source type; optional
    title: String(details?.name ?? 'Event'),
    tagline: String(details?.info || details?.pleaseNote || 'Live event'),
    heroImage: hero,
    date: dateStr,
    time: timeStr,
    doorsOpen: 'TBA',
    venueName: String(venue?.name || 'TBA'),
    venueAddress: [venue?.address?.line1, venue?.city?.name].filter(Boolean).join(', '),
    venueLatitude: Number(venue?.location?.latitude ?? 0) || 0,
    venueLongitude: Number(venue?.location?.longitude ?? 0) || 0,
    distanceFromUser: '',
    vibeScore: 90,
    vibeLabel: 'Electric',
    energyType: 'pulze',
    interestedCount: 0,
    attendingCount: 0,
    hostName: String(details?.promoter?.name || 'Pulze'),
    hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    hostVerified: true,
    description: String(details?.pleaseNote || details?.info || 'Details TBA'),
    whatToExpect: [],
    bestTimeToArrive: 'TBA',
    currentVibeAround: 'TBA',
    ticketTiers: tiers,
    lineup: [],
    friendsGoing: [],
    serviceFeePercent: 12,
    tags: (details?.classifications || []).map((c: any) => c?.genre?.name).filter(Boolean),
    externalEventUrl: details?.url || undefined,
    externalCheckoutUrl: details?.url || undefined,
  };
}

export async function fetchTMEventDetails(eventId: string): Promise<PulzeEvent> {
  async function fetchDirectFromTM(): Promise<PulzeEvent> {
    const key = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
    if (!key) throw new Error('Missing EXPO_PUBLIC_TICKETMASTER_API_KEY');
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(eventId)}?apikey=${key}`);
    if (!res.ok) throw new Error(`Ticketmaster details failed: ${res.status} ${res.statusText}`);
    const details = await res.json();
    return toPulzeEvent(details || {});
  }

  // Prefer local API, but gracefully fall back to direct Ticketmaster if unreachable (e.g., Expo Go on device)
  if (API_BASE) {
    try {
      const url = `${API_BASE.replace(/\/$/, '')}/api/tm/events/${encodeURIComponent(eventId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Local API request failed: ${res.status} ${res.statusText}`);
      const payload = await res.json();
      const details = payload?.details || payload?.base;
      return toPulzeEvent(details || {});
    } catch (_e) {
      console.warn('[TM] Local API unreachable, falling back to Ticketmaster for details');
      return fetchDirectFromTM();
    }
  }

  // No local API configured; fetch directly
  return fetchDirectFromTM();
}

