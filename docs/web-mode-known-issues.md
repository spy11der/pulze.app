# Web-mode known issues (not Phase 6A)

Recorded during Phase 6A verification, 2026-09-22. These are **pre-existing**
issues surfaced by exercising the Consumer app in web mode for the first time
in a while. None was introduced by 6A and none is fixed here. They are written
down because web mode is a supported development surface (`bun start-web`,
`start-web-dev`) and because each one is currently invisible until someone
tries it.

Native iOS/Android builds are unaffected by everything on this page: none of
these are reachable outside a browser.

---

## 1. `login-with-username` has no CORS handling — username sign-in is impossible in a browser

**Severity: blocks username sign-in in web mode. Email sign-in is unaffected.**

`AuthProvider.login()` branches on `@`. The email branch calls
`supabase.auth.signInWithPassword` against `/auth/v1/token`, which serves
`access-control-allow-origin: *`. The username branch invokes the
`login-with-username` Edge Function, which has no `OPTIONS` handler and no CORS
headers, so the browser's preflight falls through to its `405` and the request
is never sent:

```
Access to fetch at '…/functions/v1/login-with-username' from origin
'http://127.0.0.1:8099' has been blocked by CORS policy: Response to
preflight request doesn't pass access control check
```

The user sees the function's generic "Invalid email/username or password",
because `login()` collapses every failure into that message — so in a browser a
correct username and password look identical to a wrong one.

Not 6A: the function was created 2026-09-11 (Batch 1, username-enumeration
hardening) and 6A did not touch it.

**Fix when it is picked up** — the same three lines already applied to
`discover-feed` in 6A: a `CORS_HEADERS` constant, an `OPTIONS` short-circuit
*before* the method check, and spreading the headers into every response so the
browser can read error statuses. Worth extracting into
`supabase/functions/_shared/cors.ts` at that point rather than writing it a
third time.

## 2. `personalized-venues` has the same CORS gap

**Severity: none today — the Consumer no longer calls it.**

Identical shape to the above. 6A-1 moved the personalization blend server-side
into `pulze_discover_feed`, so the client stopped invoking this function
entirely. It is listed here so that the gap is known before anything calls it
from a browser again, and so it is fixed in the same pass as #1.

## 3. `expo-secure-store` is not available on web

**Severity: cosmetic today; sessions do not persist across a web reload.**

`services/supabase.ts` installs `ExpoSecureStoreAdapter` as the Supabase auth
storage on every platform. On web the underlying module throws; the adapter
catches and logs, so `getItem` returns null and `setItem` silently drops the
session. The session therefore lives in memory for the life of the page and is
gone after a refresh.

Verified not to affect a single-page E2E run — sign-in, navigation and the feed
all work. It would matter if web became a shipping target, which it is not.

**Fix when it is picked up** — select the storage adapter by platform
(`Platform.OS === 'web' ? localStorage : ExpoSecureStoreAdapter`). Note this is
a real security decision, not a shim: `localStorage` is readable by any script
on the origin, which is precisely why SecureStore was chosen on native.

---

## Verification-only note: Metro `.wasm` asset extension

`expo/metro.config.js` gained `wasm` in `resolver.assetExts` during 6A. This is
**not** in the list above because it was applied, not deferred: without it
`expo-sqlite`'s web worker fails to resolve `wa-sqlite.wasm` and *no* web build
is possible at all, which blocked the 6A web verification outright. It reaches
the whole app via `AuthProvider -> services/localCleanup -> expo-sqlite`, so it
is not scoped to one screen.
