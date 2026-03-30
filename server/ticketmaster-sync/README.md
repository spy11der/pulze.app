# Ticketmaster -> SQL Server Sync (dev utility)

This small Node utility fetches Ticketmaster Discovery events and upserts them into your local SQL Server database.

## Prereqs
- Node 18+ (for built-in fetch)
- Install deps (once, after you approve):
  - npm --prefix server/ticketmaster-sync install mssql dotenv node-cron

## Environment
Secrets live in expo/.env (already gitignored). Add/update:

```
TICKETMASTER_API_KEY=YOUR_TICKETMASTER_KEY
TM_POSTAL_CODE=80202
TM_RADIUS=50
TM_UNIT=miles
TM_START=2026-03-30T00:00:00Z

DB_SERVER=GP3-ACES
DB_USER=PulzeDevUser
DB_PASSWORD=Tester123!
DB_DATABASE=Pulze
```

## Usage
- One-off sync:
```
npm --prefix server/ticketmaster-sync run sync:once
```

- Background schedule every 8 hours:
```
npm --prefix server/ticketmaster-sync run sync:schedule
```

## What it does
- Ensures table dbo.Events_Ticketmaster exists
- Fetches events for the configured area/time
- Upserts by id, with change-detection via SHA-256 of full JSON
- Stores the full JSON payload (rawJson) for "all fields now"
- Logs Ticketmaster rate-limit headers for monitoring daily usage (5k/day cap)

## Table shape
- id (PK), name, url, startDateTime, venueName, postalCode
- rawJson (NVARCHAR(MAX)), contentHash (CHAR(64))
- inserted_at, updated_at

> For production we’ll move this behind a proper service and add indexing/ETL.

