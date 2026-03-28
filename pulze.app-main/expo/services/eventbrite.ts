import { useQuery } from '@tanstack/react-query';

import { sampleEvent, type PulzeEvent, type TicketTier } from '@/mocks/events';

interface EventbriteMoney {
  value?: number | null;
  major_value?: string | null;
  display?: string | null;
}

interface EventbriteVenue {
  name?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  address?: {
    address_1?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    localized_address_display?: string | null;
  } | null;
}

interface EventbriteTicketClass {
  id: string;
  name?: string | null;
  display_name?: string | null;
  description?: string | null;
  free?: boolean | null;
  cost?: EventbriteMoney | null;
  fee?: EventbriteMoney | null;
  on_sale_status?: string | null;
  capacity?: number | null;
  quantity_total?: number | null;
  quantity_sold?: number | null;
}

interface EventbriteEventResponse {
  id: string;
  url?: string | null;
  summary?: string | null;
  status?: string | null;
  online_event?: boolean | null;
  capacity?: number | null;
  name?: { text?: string | null } | null;
  description?: { text?: string | null } | null;
  start?: { local?: string | null } | null;
  end?: { local?: string | null } | null;
  logo?: { url?: string | null; original?: { url?: string | null } | null } | null;
  venue?: EventbriteVenue | null;
  ticket_classes?: EventbriteTicketClass[] | null;
}

type EventbriteErrorResponse = {
  error_description?: string;
  error?: { message?: string };
};

const EVENTBRITE_BASE_URL = 'https://www.eventbriteapi.com/v3';

function getTrimmedEnv(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getEventbriteApiKey(): string | null {
  return getTrimmedEnv(process.env.EXPO_PUBLIC_EVENTBRITE_API_KEY);
}

export function getConfiguredEventbriteEventId(): string | null {
  return getTrimmedEnv(process.env.EXPO_PUBLIC_EVENTBRITE_EVENT_ID);
}

export function resolveEventbriteEventId(requestedEventId?: string | null): string | null {
  const requested = getTrimmedEnv(requestedEventId);
  if (requested && requested !== sampleEvent.id) {
    return requested;
  }

  return getConfiguredEventbriteEventId();
}

export function hasEventbriteConfig(requestedEventId?: string | null): boolean {
  return Boolean(getEventbriteApiKey() && resolveEventbriteEventId(requestedEventId));
}

function parseMoneyValue(money?: EventbriteMoney | null): number {
  if (typeof money?.major_value === 'string') {
    const parsed = Number(money.major_value);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (typeof money?.value === 'number' && Number.isFinite(money.value)) {
    return money.value / 100;
  }

  return 0;
}

function buildUtcDateFromLocalString(localValue?: string | null): Date | null {
  if (!localValue) return null;

  const [datePart, timePart = '00:00:00'] = localValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes = 0, seconds = 0] = timePart.split(':').map(Number);

  if (![year, month, day, hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

function formatEventDate(localValue?: string | null): string {
  const date = buildUtcDateFromLocalString(localValue);
  if (!date) return sampleEvent.date;

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatEventTime(localValue?: string | null): string {
  const date = buildUtcDateFromLocalString(localValue);
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function formatEventTimeRange(startLocal?: string | null, endLocal?: string | null): string {
  const start = formatEventTime(startLocal);
  const end = formatEventTime(endLocal);

  if (start && end) return `${start} – ${end}`;
  return start || sampleEvent.time;
}

function buildVenueAddress(venue?: EventbriteVenue | null): string {
  const localizedAddress = venue?.address?.localized_address_display?.trim();
  if (localizedAddress) return localizedAddress;

  const fallbackAddress = [
    venue?.address?.address_1,
    venue?.address?.city,
    venue?.address?.region,
    venue?.address?.postal_code,
  ]
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part));

  return fallbackAddress.length ? fallbackAddress.join(', ') : sampleEvent.venueAddress;
}

function getFirstSentence(text: string): string {
  const firstSentence = text.split(/[.!?]\s/)[0]?.trim();
  return firstSentence || text.trim();
}

function buildWhatToExpect(description: string, ticketTiers: TicketTier[]): string[] {
  const descriptionLines = description
    .split(/\r?\n/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 12)
    .slice(0, 3);

  const tierHighlights = ticketTiers
    .filter(tier => !tier.soldOut)
    .slice(0, 2)
    .map(tier => `${tier.name} available${tier.price > 0 ? ` from $${tier.price.toFixed(2)}` : ''}`);

  const combined = [...descriptionLines, ...tierHighlights];
  return combined.length ? combined : sampleEvent.whatToExpect;
}

function buildTicketTiers(ticketClasses?: EventbriteTicketClass[] | null): TicketTier[] {
  const tiers =
    ticketClasses?.map((ticketClass, index) => {
      const price = parseMoneyValue(ticketClass.cost);
      const fee = parseMoneyValue(ticketClass.fee);
      const status = ticketClass.on_sale_status?.toUpperCase() ?? '';
      const soldOut = ['SOLD_OUT', 'UNAVAILABLE', 'ENDED', 'HIDDEN'].includes(status);

      const total = ticketClass.quantity_total ?? ticketClass.capacity ?? 0;
      const quantitySold = ticketClass.quantity_sold ?? 0;
      const available =
        total > 0
          ? Math.max(total - quantitySold, 0)
          : soldOut
            ? 0
            : sampleEvent.ticketTiers[index]?.available ?? 25;

      const perks = [
        ticketClass.description?.trim(),
        ticketClass.free ? 'Free admission' : undefined,
        fee > 0 ? `Eventbrite fee ${ticketClass.fee?.display ?? `$${fee.toFixed(2)}`}` : 'Secure Eventbrite checkout',
      ].filter((perk): perk is string => Boolean(perk));

      const tier: TicketTier = {
        id: ticketClass.id,
        name: ticketClass.display_name?.trim() || ticketClass.name?.trim() || `Ticket ${index + 1}`,
        price,
        perks: perks.length ? perks : ['Admission handled by Eventbrite'],
        available,
        total: total > 0 ? total : available,
        soldOut,
        tag: index === 0 && !soldOut ? 'Live' : undefined,
      };

      return tier;
    }) ?? [];

  return tiers.length ? tiers : sampleEvent.ticketTiers;
}

function buildTags(event: EventbriteEventResponse): string[] {
  const derivedTags = [
    'Eventbrite',
    event.online_event ? 'Online Event' : 'Live Event',
    event.venue?.address?.city?.trim(),
    event.status?.trim(),
  ].filter((tag): tag is string => Boolean(tag));

  return Array.from(new Set([...derivedTags, ...sampleEvent.tags])).slice(0, 5);
}

function mapEventbriteEventToPulzeEvent(event: EventbriteEventResponse): PulzeEvent {
  const ticketTiers = buildTicketTiers(event.ticket_classes);
  const description = event.description?.text?.trim() || event.summary?.trim() || sampleEvent.description;
  const venueLatitude = Number(event.venue?.latitude ?? event.venue?.address?.latitude);
  const venueLongitude = Number(event.venue?.longitude ?? event.venue?.address?.longitude);

  return {
    ...sampleEvent,
    id: event.id,
    source: 'eventbrite',
    externalEventUrl: event.url ?? undefined,
    externalCheckoutUrl: event.url ?? undefined,
    title: event.name?.text?.trim() || sampleEvent.title,
    tagline: event.summary?.trim() || getFirstSentence(description) || 'Tickets powered by Eventbrite.',
    heroImage: event.logo?.original?.url ?? event.logo?.url ?? sampleEvent.heroImage,
    date: formatEventDate(event.start?.local),
    time: formatEventTimeRange(event.start?.local, event.end?.local),
    doorsOpen: formatEventTime(event.start?.local) || sampleEvent.doorsOpen,
    venueName: event.venue?.name?.trim() || sampleEvent.venueName,
    venueAddress: buildVenueAddress(event.venue),
    venueLatitude: Number.isFinite(venueLatitude) ? venueLatitude : sampleEvent.venueLatitude,
    venueLongitude: Number.isFinite(venueLongitude) ? venueLongitude : sampleEvent.venueLongitude,
    interestedCount: event.capacity ?? sampleEvent.interestedCount,
    attendingCount: event.capacity ?? sampleEvent.attendingCount,
    description,
    whatToExpect: buildWhatToExpect(description, ticketTiers),
    bestTimeToArrive: `Arrive by ${formatEventTime(event.start?.local) || sampleEvent.doorsOpen} for the smoothest entry.`,
    currentVibeAround: 'Live event details and checkout are being pulled from Eventbrite for this POC.',
    ticketTiers,
    serviceFeePercent: 0,
    tags: buildTags(event),
  };
}

export async function fetchEventbriteEvent(requestedEventId?: string | null): Promise<PulzeEvent> {
  const apiKey = getEventbriteApiKey();
  const eventId = resolveEventbriteEventId(requestedEventId);

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_EVENTBRITE_API_KEY. Add it to expo/.env and restart Expo.');
  }

  if (!eventId) {
    throw new Error('Missing EXPO_PUBLIC_EVENTBRITE_EVENT_ID. Add a concrete Eventbrite event ID to expo/.env.');
  }

  const response = await fetch(`${EVENTBRITE_BASE_URL}/events/${eventId}/?expand=venue,ticket_classes`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const payload = (await response.json()) as EventbriteEventResponse & EventbriteErrorResponse;
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error?.message ?? 'Eventbrite event request failed.');
  }

  return mapEventbriteEventToPulzeEvent(payload);
}

export function useTicketEvent(requestedEventId?: string | null) {
  const resolvedEventId = resolveEventbriteEventId(requestedEventId);
  const enabled = Boolean(getEventbriteApiKey() && resolvedEventId);

  const query = useQuery({
    queryKey: ['ticketEvent', resolvedEventId ?? 'fallback'],
    queryFn: async () => {
      if (!resolvedEventId) {
        throw new Error('No Eventbrite event ID is configured.');
      }

      return fetchEventbriteEvent(resolvedEventId);
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    event: query.data ?? sampleEvent,
    isEventbrite: query.data?.source === 'eventbrite',
    resolvedEventId,
  };
}