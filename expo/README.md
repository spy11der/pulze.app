# Pulze

Real-time nightlife discovery for Denver. Native iOS + Android via Expo / React Native, with a Supabase backend.

## Stack

- **Expo SDK 57** + **React Native 0.86** + **React 19**
- **Expo Router** (file-based routing)
- **Supabase** (Postgres + RLS + Edge Functions)
- **TypeScript** (strict)
- **Bun** for install / scripts

## Local development

```bash
bun install
bun run start        # dev server (currently proxies through Rork)
```

The dev workflow currently uses [Rork](https://rork.com) via `bunx rork start`. To fall back to vanilla Expo:

```bash
bunx expo start
```

## Environment

The client reads two env vars at build/run time:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

For local dev, put them in a `.env` (gitignored). For EAS builds, set them as secrets on the EAS project.

## Layout

```
app/                  Expo Router screens
  (tabs)/             Home, Nearby, Crew, Profile
components/           Shared UI
providers/            Auth, Theme, Favorites, Biometric, TabScroll
services/             Supabase client + all server calls
hooks/                Location, nearby-venues, etc.
supabase/
  migrations/         DB schema (mirror of live migrations)
  functions/          Deno edge functions (auth, personalization, etc.)
types/                Generated Supabase types
constants/            Theme colors, spacing, typography
```

## Backend

- **Migrations** live in `supabase/migrations/` and are applied out-of-band to the production Supabase project.
- **Edge functions** in `supabase/functions/` are deployed via the Supabase CLI or MCP tooling.
- **Types** in `types/supabase.ts` are regenerated after schema changes.

## Build / release

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

Bundle ID / package: `com.pulze.app`. Deep-link scheme: `pulze://`.

## Contributing

- `npx tsc --noEmit` and `bun run lint` must be clean before commit.
- Commit messages: short, imperative subject; use the body to explain the *why*.
