# Live Event Data Integration (Ticketmaster + SeatData via Supabase)

Replaces previous QR ticket plan. Live event data is synced into Supabase every 4 hours
across `events`, `event_details`, `event_images`, `venues` (with capacity), `listings`, and `sales`.

## Tasks

- [x] **Foundation** — Updated `expo/types/supabase.ts` with new tables. Added `expo/hooks/useEvents.ts` (useMapEvents, useEventFeed, useEventDetail, useSearchEvents, useDebouncedValue, useHotEvents, useFeaturedEvent) and `expo/utils/liveliness.ts` + `expo/utils/eventImage.ts` helpers.
- [x] **Live Map Markers** — `LiveEventMarkers` + `LiveEventsSheet` overlay on `(tabs)/map.tsx`. Tapping a venue pin shows upcoming events; tap an event row → `/event-detail?eventId=…`.
- [x] **Event Feed Screen** — `expo/app/events.tsx` lists live events with picked best image, source badge, liveliness pill, price. "Live events near you" CTA on `(tabs)/index.tsx`.
- [x] **Event Detail** — `event-detail.tsx` resolves only by Supabase `eventId`. Mock branch removed. Adds Hot / Selling Fast / Trending badges, demand meter, capacity, listings, price range, recent sales, venue mini-map, and a Buy Tickets sticky CTA that links to `event.url` or falls through to `/ticketing?eventId=…`.
- [x] **Search & Filter** — `events.tsx` includes debounced text search across name/venue/city plus source filter (All / Ticketmaster / SeatData).
- [x] **Tickets Tab** — `(tabs)/tickets.tsx` is fully wired to live data: "Hot Right Now" carousel uses `useHotEvents(10)` (random pull), "All Events" uses `useEventFeed`. Cards show inferred `Almost Gone` / `Selling Fast` / `Trending` flags from liveliness + recent sales.
- [x] **Ticketing Screen** — `ticketing.tsx` accepts `eventId`, derives ticket "tiers" from grouped `listings.zone` (min/max price + remaining qty), falls back to min/max price summary when no listings exist, opens `event.url` (or Ticketmaster search) externally on continue.
- [x] **Featured Event Card** — Home tab Featured card now pulls from `useFeaturedEvent()` (real upcoming event with hero image, demand label, price). Navigates to `/event-detail?eventId=…`.
- [x] **Event Images** — `event_images` schema extended with `event_id`, `ratio`, `width`, `height`, `fallback`. `pickBestImage()` selects 16_9 hero, 4_3 card, 3_2 detail with width fallbacks; used across feed, tickets, map, hero, and detail.

## Algorithm

Liveliness = ((capacity - sum(active listings)) / capacity) * 100. Labels: PACKED (≥99), BUZZING (≥80), LIVELY (≥50), CHILL (≥20), QUIET (<20).

Inferred event flags:
- **Hot / Almost Gone** — liveliness ≥ 95% of capacity.
- **Selling Fast** — liveliness ≥ 80%.
- **Trending** — recent (7d) ticket sales ≥ 25 OR sales velocity ≥ 5/day.
