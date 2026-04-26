# Live Event Data Integration (Ticketmaster + SeatData via Supabase)

Replaces previous QR ticket plan. Live event data is synced into Supabase every 4 hours
across `events`, `event_details`, `event_images`, `venues` (with capacity), `listings`, and `sales`.

## Tasks

- [x] **Foundation** — Updated `expo/types/supabase.ts` with new tables. Added `expo/hooks/useEvents.ts` (useMapEvents, useEventFeed, useEventDetail, useSearchEvents, useDebouncedValue) and `expo/utils/liveliness.ts` helpers.
- [x] **Live Map Markers** — Added `LiveEventMarkers` + `LiveEventsSheet` overlay on `(tabs)/map.tsx`. Tapping a venue pin shows upcoming events; tap an event row → `/event-detail?eventId=…`.
- [x] **Event Feed Screen** — Added `expo/app/events.tsx` (live event list with images, source badge, liveliness pill, price). Added "Live events near you" CTA on the existing feed (`(tabs)/index.tsx`).
- [x] **Event Detail** — `event-detail.tsx` now branches on `eventId` (live Supabase) vs `venueId` (legacy mock). Live path shows demand meter, capacity, listings, price range, recent sales, venue mini-map, and "Buy Tickets" external link.
- [x] **Search & Filter** — `events.tsx` includes debounced text search across name/venue/city plus source filter (All / Ticketmaster / SeatData).

## Algorithm

Liveliness = ((capacity - sum(active listings)) / capacity) * 100. Labels: PACKED (≥99), BUZZING (≥80), LIVELY (≥50), CHILL (≥20), QUIET (<20).
