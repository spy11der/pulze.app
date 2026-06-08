# Pulze v1 Redesign — Nightlife Discovery for Denver

## Features

- **Sign up & log in** with the existing auth flow (kept as-is)
- **See what venues are busy tonight** — a home feed sorted by how packed each spot is right now
- **Tap a venue** to see its busyness level, type (bar, club, lounge), neighborhood, and recent check-ins
- **Quick check-in** — snap a photo, tag a venue, post "I made it" that shows on your profile and the venue page
- **Your profile** shows your check-in history, saved venues, and friends
- **Save venues** you want to try later

## What goes away

- Full map view tab
- Tickets tab and all ticketing screens (event tickets, secure wallet, wallet pass, QR code)
- ID verification / age verification
- Staff mode
- Complex post system (energy levels, crowd tags, mood tags)
- All event-specific screens (event detail, events list)

## Design

- Dark, moody nightlife aesthetic — deep backgrounds with teal accent glow
- Clean, visual venue cards with large photos, venue name, busyness badge, type, and neighborhood
- Busyness shown as a simple label: **Quiet**, **Getting Busy**, **Packed** with a colored indicator
- Check-in flow: camera opens, pick a photo, tag the venue (auto-detected nearby), post
- 3-tab layout: Home, Check In, Profile — dead simple navigation

## Screens

- **Home tab** — "Denver, Tonight" header. Scrollable feed of nearby bars and clubs sorted by busyness. Each card shows the venue photo, name, busyness level, type, neighborhood, and distance
- **Check In tab** — Camera-first screen to snap a pic (or pick from gallery), select a nearby venue, add an optional caption, and post "I made it"
- **Profile tab** — User avatar, stats (check-ins, saved, friends), check-in history feed, links to friends, settings, and activity
- **Venue detail** — Hero photo, name, busyness gauge, venue type chip, neighborhood chip, address, recent check-in photos, directions button, and save button
- **Settings, Friends, Edit Profile** — kept as-is with ticketing/verification references removed

