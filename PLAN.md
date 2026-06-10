# Pulze v1 — Nightlife Discovery for Denver

## Features

- **Sign up & log in** with the existing auth flow (kept as-is)
- **See what venues are busy tonight** — a home feed sorted by how packed each spot is right now
- **Tap a venue** to see its busyness level, type (bar, club, lounge), neighborhood, and recent check-ins
- **Passive geofence check-in** — when you walk within 150 ft of a venue, a push notification fires: "You made it to [Venue] — front cam's ready, make it count." Tap "Let's go" to open a full-screen front camera with a 5-second countdown. Auto-captures your photo, overlays a venue stamp with neighborhood and time, shows a one-liner quip, then lets you "Share with crew" or "Just check in" silently. Tapping "Skip" on the notification still records your visit.
- **Deduplication** — same user, same venue within 15 minutes counts as one check-in
- **Your profile** shows your check-in history, saved venues, and friends
- **Save venues** you want to try later

## What goes away

- Full map view tab
- Tickets tab and all ticketing screens (event tickets, secure wallet, wallet pass, QR code)
- ID verification / age verification
- Staff mode
- Complex post system (energy levels, crowd tags, mood tags)
- All event-specific screens (event detail, events list)
- Manual check-in tab (replaced by geofence-triggered flow)

## Design

- Dark, moody nightlife aesthetic — deep backgrounds with teal accent glow
- Clean, visual venue cards with large photos, venue name, busyness badge, type, and neighborhood
- Busyness shown as a simple label: **Quiet**, **Getting Busy**, **Packed** with a colored indicator
- Check-in flow: triggered automatically by geofence proximity to a venue
- 2-tab layout: Home, Profile — dead simple navigation

## Screens

- **Home tab** — "Denver, Tonight" header. Scrollable feed of nearby bars and clubs sorted by busyness. Each card shows the venue photo, name, busyness level, type, neighborhood, and distance
- **Profile tab** — User avatar, stats (check-ins, saved, friends), check-in history feed, links to friends, settings, and activity
- **Venue detail** — Hero photo, name, busyness gauge, venue type chip, neighborhood chip, address, recent check-in photos, directions button, and save button
- **Check-in capture** — Full-screen front camera with 5-second countdown circle timer. Auto-captures, stamps photo with venue/neighborhood/time, shows quip, then presents Share/Just-check-in buttons
- **Settings, Friends, Edit Profile** — kept as-is with ticketing/verification references removed
