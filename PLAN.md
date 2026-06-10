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

- Dark, moody nightlife aesthetic — deep backgrounds with purple accent glow
- Compact venue cards with small square photo thumbnail on left, name, type chip, neighborhood, distance, busyness percentage in plain text (no bar), and vibe tags
- Sticky horizontal filter pill row for instant feed filtering — no modals, no apply buttons
- Busyness shown as a simple label: **Quiet**, **Getting Busy**, **Packed** with a colored indicator
- Check-in flow: triggered automatically by geofence proximity to a venue
- 4-tab layout: Discover, Nearby, Crew, Profile

## Screens

- **Discover tab** — City name + time-context header ("Denver, tonight" / "Denver, right now" depending on hour). Sticky horizontal filter pill row below header: "Popping now," "Low wait," "RiNo," "Cap Hill," "LoDo," "Baker," "Bars," "Clubs," "Breweries" — single tap instantly filters the feed. Compact venue cards (3+ visible on screen) with small square photo thumbnail on left, name, type chip, neighborhood, distance, busyness percentage in plain text (no bar), and 1-2 vibe tags
- **Nearby tab** — Tighter radius real-time view for when someone is already out. Shows venues very close to the user sorted by walking distance. Compact cards with name, type tag, distance in minutes, busyness bar with percentage, and 1-2 vibe tags. Stripped down and fast — no filter pills, just raw proximity
- **Crew tab** — Friends check-in activity feed. Vertical list with small square stamped photo thumbnails, friend name, venue, neighborhood, and time ago. Proximity hint at the bottom when a friend is nearby: "Sofia is 9 min away · Death & Co is popping right now" — client-side distance calculation
- **Profile tab** — User avatar, stats (check-ins, saved, friends), Pulze ID, friends list with inner circle, theme toggle, settings, activity, sign out
- **Venue detail** — Hero photo, name, busyness gauge, venue type chip, neighborhood chip, address, recent check-in photos, directions button, and save button
- **Check-in capture** — Full-screen front camera with 5-second countdown circle timer. Auto-captures, stamps photo with venue/neighborhood/time, shows quip, then presents Share/Just-check-in buttons
- **Settings, Edit Profile** — kept as-is with ticketing/verification references removed
