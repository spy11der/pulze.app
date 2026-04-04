# QR Ticket Passes + 21+ Age Verification System

## Features

- **QR Ticket Pass after purchase** — After buying a ticket, users get an Apple Wallet-style digital pass with a scannable QR code, event artwork, and key event details (name, date, venue, tier, quantity)
- **My Tickets screen** — A new screen accessible from the profile showing all purchased tickets as passes, each tappable to reveal the full QR ticket view
- **21+ Verification from Secure Wallet** — The app reads stored ID documents (driver's license, state ID, passport) from the existing Secure Wallet to automatically verify if the user is 21+, based on date of birth
- **One-time verification on profile** — Users verify once from their profile; the verified status persists and unlocks all 21+ events going forward
- **21+ check at QR ticket display** — When showing a QR ticket for a 21+ event, the pass displays a prominent "21+ Verified" badge, confirming the user's age status to door staff
- **Prominent verified badge** — A green shield badge appears on the user's profile, on QR ticket passes, and is visible to friends in the friends list

---

## Design

- **QR Ticket Pass**: Apple Wallet-inspired card with rounded corners, event hero image at the top (blurred/gradient overlay), event name, date, venue, tier, and a large centered QR code at the bottom. Dark card background matching Pulze theme. Subtle animated glow ring around QR code. A "21+ Verified" shield badge in the corner for age-restricted events.
- **My Tickets list**: Stacked pass cards showing event name, date, and a small ticket icon. Tapping opens the full QR pass view as a modal.
- **Verification flow**: A bottom sheet on the profile screen — if the user has an ID in Secure Wallet, it auto-detects DOB and shows a confirmation card ("You're verified as 21+ based on your Driver's License"). If no ID stored, it prompts to add one via Secure Wallet first.
- **Verified badge**: Green shield with checkmark — appears next to the user's name on profile, on each QR ticket pass header, and as a small icon next to the user in friend lists.
- **Color system**: Green shield for verified status, teal accents for interactive elements, subtle red/amber for unverified or expired states.

---

## Screens / Changes

1. **QR Ticket Pass (new modal screen)** — Full-screen modal showing the Apple Wallet-style ticket pass with QR code, event details, and 21+ badge if applicable. Accessible after purchase confirmation and from My Tickets.

2. **My Tickets (new screen from profile)** — Lists all purchased ticket passes as stacked cards. Each card shows event name, date, venue, and ticket count. Tapping opens the QR Ticket Pass modal.

3. **Profile screen (updated)** — Adds a "21+ Verified" shield badge next to the user's display name. Adds a "Verify Age" action row that opens the verification flow. Adds a "My Tickets" row linking to purchased passes.

4. **Age Verification Sheet (new component)** — Bottom sheet that checks Secure Wallet documents for DOB, calculates age, and confirms/denies 21+ status. Shows the document used and verification result with haptic feedback.

5. **Checkout Confirmation (updated)** — After successful purchase, the "Done" button is replaced with "View Your Ticket" which opens the QR Ticket Pass directly.

6. **Verification Provider (new)** — Stores the user's 21+ verified status persistently so it only needs to be done once. Reads from Secure Wallet documents.

7. **Friends list (updated)** — Adds a small green verified shield next to friends who are 21+ verified.
