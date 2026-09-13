-- ============================================================
-- Happy Hour: schema, RLS, active-view + three retrieval RPCs.
-- ============================================================
--
-- Data model choices:
--
--   * venues.timezone (new): venue-local IANA tz name. Default
--     'America/Denver' for the launch city so existing rows adopt
--     it without a data-migration pass. Every retrieval RPC uses
--     `now() AT TIME ZONE v.timezone` to reason in the venue's
--     local wall-clock time.
--
--   * venue_happy_hours: one row per (venue, days-of-week set,
--     time window). Days-of-week is an ISO-weekday integer array
--     (1=Mon..7=Sun) so "Mon-Fri 3-6pm" is a single row, but
--     "Wed 5-7pm AND Wed 10pm-close" is two rows for Wednesday.
--     Multiple concurrent periods per day are naturally supported.
--
--   * Overnight windows: when end_time <= start_time the window
--     spans midnight into the *next* calendar day. The RPCs handle
--     that by looking at both today's schedule (windows starting
--     today) AND yesterday's schedule (windows that started
--     yesterday and are still running).
--
--   * Source tracking: source, source_url, source_provider_ref,
--     last_verified_at, verified_by. Staleness is enforced in the
--     retrieval layer, not by deleting rows — a stale row can be
--     re-verified via UPDATE and immediately becomes eligible.
--
--   * Specials: drink_specials text[] and food_specials text[]
--     for MVP. Free-form short descriptors. A structured
--     product/discount schema can layer on later without breaking
--     the current callers.
--
-- Access model:
--   * SELECT: any authenticated Pulze user. Happy-hour hours are
--     public venue metadata, not per-user data.
--   * INSERT/UPDATE/DELETE: no client policy. Only service_role
--     (admin ingest jobs) can write. This mirrors the pattern used
--     by venues + venue_provider_links.


-- ============================================================
-- 1. venues.timezone
-- ============================================================
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Denver';

COMMENT ON COLUMN public.venues.timezone IS
  'IANA timezone name for the venue''s wall-clock schedules (opening hours, happy hours). Default America/Denver for the launch city; non-Denver venues override on insert.';


-- ============================================================
-- 2. venue_happy_hours
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_happy_hours (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id              uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,

  -- Days-of-week the period runs on. ISO weekday: 1=Mon..7=Sun.
  -- Multiple periods same day = multiple rows.
  days_of_week          smallint[] NOT NULL,

  -- Venue-local wall clock. If end_time <= start_time the window
  -- spills into the next calendar day (handled by the RPCs).
  start_time            time NOT NULL,
  end_time              time NOT NULL,

  -- Free-form MVP specials. text[] of short descriptors like
  -- '$5 wells' or 'Half-off drafts'. A structured schema can be
  -- added later without breaking existing callers.
  drink_specials        text[],
  food_specials         text[],
  description           text,

  -- Where this schedule came from + how to verify it. Enum kept
  -- narrow so unknown sources don't slip in silently.
  source                text NOT NULL CHECK (source IN (
    'google_places', 'foursquare', 'venue_website', 'manual', 'user_report'
  )),
  source_url            text,
  source_provider_ref   text,     -- e.g. Google Place ID, Foursquare fsq_id

  -- Staleness. Every write bumps last_verified_at. The retrieval
  -- RPCs hide rows past a source-specific staleness window even if
  -- is_active = true.
  last_verified_at      timestamptz NOT NULL DEFAULT now(),
  verified_by           text,     -- 'admin', 'ingest:google_places', 'user:{uuid}', etc.

  -- Lifecycle. Soft-deactivate rather than deleting so we retain
  -- provenance. Effective range for seasonal / limited-run promos.
  is_active             boolean NOT NULL DEFAULT true,
  effective_from        date,
  effective_until       date,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Guardrails.
  CONSTRAINT venue_happy_hours_days_of_week_valid
    CHECK (
      cardinality(days_of_week) > 0
      AND days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
    ),
  CONSTRAINT venue_happy_hours_nonempty_window
    CHECK (start_time <> end_time),
  CONSTRAINT venue_happy_hours_effective_order
    CHECK (effective_from IS NULL OR effective_until IS NULL OR effective_from <= effective_until)
);

CREATE INDEX IF NOT EXISTS venue_happy_hours_venue_active_idx
  ON public.venue_happy_hours (venue_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS venue_happy_hours_active_verified_idx
  ON public.venue_happy_hours (is_active, last_verified_at);

COMMENT ON TABLE public.venue_happy_hours IS
  'Recurring happy-hour schedules per venue. Multiple rows per venue as needed. Overnight windows expressed as end_time <= start_time. Times are in venues.timezone. Staleness is filtered by retrieval RPCs, not by row deletion.';

COMMENT ON COLUMN public.venue_happy_hours.days_of_week IS
  'ISO weekday integer array (1=Mon..7=Sun). Constrained.';
COMMENT ON COLUMN public.venue_happy_hours.source IS
  'How this row was obtained. Constrained enum. Determines staleness window applied by the retrieval RPCs.';


-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.venue_happy_hours ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read. Happy hour hours are public
-- venue metadata. anon has no policy -> no access from the anon key.
DROP POLICY IF EXISTS authenticated_read_happy_hours ON public.venue_happy_hours;
CREATE POLICY authenticated_read_happy_hours
  ON public.venue_happy_hours FOR SELECT
  TO authenticated
  USING (true);

-- Deliberately NO INSERT/UPDATE/DELETE policy. Only service_role
-- (which bypasses RLS) can write. Mirrors venues + venue_provider_links.


-- ============================================================
-- 4. is_happy_hour_row_fresh() — staleness helper.
-- ============================================================
--
-- Per-source freshness window. Manual/venue_website entries earn a
-- longer window because they represent an explicit human check;
-- provider-scraped rows re-expire faster because the underlying
-- provider data can update out from under us. user_report entries
-- get the shortest window because they aren't independently
-- verified.
--
-- All values are MVP tuning constants — safe to bump after real
-- launch feedback.
CREATE OR REPLACE FUNCTION public.is_happy_hour_row_fresh(
  p_source            text,
  p_last_verified_at  timestamptz,
  p_now               timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_last_verified_at >= p_now - CASE p_source
    WHEN 'manual'         THEN interval '90 days'
    WHEN 'venue_website'  THEN interval '60 days'
    WHEN 'google_places'  THEN interval '30 days'
    WHEN 'foursquare'     THEN interval '30 days'
    WHEN 'user_report'    THEN interval '14 days'
    ELSE                       interval '30 days'
  END;
$$;

COMMENT ON FUNCTION public.is_happy_hour_row_fresh(text, timestamptz, timestamptz) IS
  'Per-source freshness window. Callers pass source + last_verified_at + optional now(); returns whether the row is still within its source-appropriate staleness horizon. All windows are MVP tuning constants.';


-- ============================================================
-- 5. v_active_happy_hours view — active + fresh + effective-range.
-- ============================================================
--
-- Joins venues so the caller gets timezone + name + coordinates
-- without a second lookup. Every RPC below reads via this view so
-- staleness/active/effective-range filters live in one place.
CREATE OR REPLACE VIEW public.v_active_happy_hours
WITH (security_invoker = true) AS
SELECT
  hh.id                 AS happy_hour_id,
  hh.venue_id,
  v.name                AS venue_name,
  v.category            AS venue_category,
  v.neighborhood_id     AS venue_neighborhood_id,
  v.latitude,
  v.longitude,
  v.timezone            AS venue_timezone,
  hh.days_of_week,
  hh.start_time,
  hh.end_time,
  hh.drink_specials,
  hh.food_specials,
  hh.description,
  hh.source,
  hh.source_url,
  hh.last_verified_at,
  hh.effective_from,
  hh.effective_until
FROM public.venue_happy_hours hh
JOIN public.venues v ON v.id = hh.venue_id
WHERE hh.is_active = true
  AND v.is_active = true
  AND public.is_happy_hour_row_fresh(hh.source, hh.last_verified_at)
  AND (hh.effective_from  IS NULL OR hh.effective_from  <= (now() AT TIME ZONE v.timezone)::date)
  AND (hh.effective_until IS NULL OR hh.effective_until >= (now() AT TIME ZONE v.timezone)::date);

COMMENT ON VIEW public.v_active_happy_hours IS
  'Happy-hour rows that pass the active + fresh + effective-range filters. The three retrieval RPCs read exclusively from this view so those filters are enforced in one place.';


-- ============================================================
-- 6. RPC: get_happy_hours_happening_now(p_now)
-- ============================================================
--
-- Returns every window currently open, expressed in venue-local
-- time. Handles overnight windows by checking both:
--   (a) windows that start on today's local weekday and are within
--       (start_time, end_time) or, for overnight, currently at or
--       after start_time;
--   (b) windows that started YESTERDAY (yesterday's local weekday)
--       and are still running before end_time on the current wall
--       clock — this is the case where a Friday-night window is
--       still open at 1am Saturday.
CREATE OR REPLACE FUNCTION public.get_happy_hours_happening_now(
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE(
  happy_hour_id       uuid,
  venue_id            uuid,
  venue_name          text,
  venue_category      text,
  venue_neighborhood_id uuid,
  latitude            double precision,
  longitude           double precision,
  venue_timezone      text,
  ends_at_local       time,
  is_overnight        boolean,
  drink_specials      text[],
  food_specials       text[],
  description         text,
  source              text,
  last_verified_at    timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH ctx AS (
    SELECT
      hh.*,
      (p_now AT TIME ZONE hh.venue_timezone)                       AS local_ts,
      (p_now AT TIME ZONE hh.venue_timezone)::time                 AS local_time,
      EXTRACT(ISODOW FROM p_now AT TIME ZONE hh.venue_timezone)::smallint      AS today_dow,
      (((EXTRACT(ISODOW FROM p_now AT TIME ZONE hh.venue_timezone)::int + 5) % 7) + 1)::smallint
                                                                    AS yesterday_dow,
      (hh.end_time <= hh.start_time)                               AS overnight
    FROM public.v_active_happy_hours hh
  )
  SELECT
    ctx.happy_hour_id,
    ctx.venue_id,
    ctx.venue_name,
    ctx.venue_category,
    ctx.venue_neighborhood_id,
    ctx.latitude,
    ctx.longitude,
    ctx.venue_timezone,
    ctx.end_time  AS ends_at_local,
    ctx.overnight AS is_overnight,
    ctx.drink_specials,
    ctx.food_specials,
    ctx.description,
    ctx.source,
    ctx.last_verified_at
  FROM ctx
  WHERE
    -- Case (a): window started today.
    (
      ctx.today_dow = ANY (ctx.days_of_week)
      AND ctx.local_time >= ctx.start_time
      AND (
        (NOT ctx.overnight AND ctx.local_time <  ctx.end_time)  -- normal
        OR ctx.overnight                                        -- overnight and we're past start_time today
      )
    )
    OR
    -- Case (b): overnight window from yesterday, still running.
    (
      ctx.overnight
      AND ctx.yesterday_dow = ANY (ctx.days_of_week)
      AND ctx.local_time <  ctx.end_time
    );
$$;

REVOKE ALL ON FUNCTION public.get_happy_hours_happening_now(timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.get_happy_hours_happening_now(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_happy_hours_happening_now(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_happy_hours_happening_now(timestamptz) TO service_role;

COMMENT ON FUNCTION public.get_happy_hours_happening_now(timestamptz) IS
  'Every happy-hour window currently open. Reads from v_active_happy_hours (already stale/active/effective-range filtered). Handles overnight windows via case-(a)-today or case-(b)-yesterday-still-running. p_now defaults to now() but callers can pass a fixed instant for deterministic tests.';


-- ============================================================
-- 7. RPC: get_happy_hours_upcoming_today(p_now)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_happy_hours_upcoming_today(
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE(
  happy_hour_id       uuid,
  venue_id            uuid,
  venue_name          text,
  venue_category      text,
  venue_neighborhood_id uuid,
  latitude            double precision,
  longitude           double precision,
  venue_timezone      text,
  starts_at_local     time,
  ends_at_local       time,
  is_overnight        boolean,
  drink_specials      text[],
  food_specials       text[],
  description         text,
  source              text,
  last_verified_at    timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH ctx AS (
    SELECT
      hh.*,
      (p_now AT TIME ZONE hh.venue_timezone)::time AS local_time,
      EXTRACT(ISODOW FROM p_now AT TIME ZONE hh.venue_timezone)::smallint AS today_dow,
      (hh.end_time <= hh.start_time) AS overnight
    FROM public.v_active_happy_hours hh
  )
  SELECT
    ctx.happy_hour_id,
    ctx.venue_id,
    ctx.venue_name,
    ctx.venue_category,
    ctx.venue_neighborhood_id,
    ctx.latitude,
    ctx.longitude,
    ctx.venue_timezone,
    ctx.start_time AS starts_at_local,
    ctx.end_time   AS ends_at_local,
    ctx.overnight  AS is_overnight,
    ctx.drink_specials,
    ctx.food_specials,
    ctx.description,
    ctx.source,
    ctx.last_verified_at
  FROM ctx
  WHERE ctx.today_dow = ANY (ctx.days_of_week)
    AND ctx.start_time > ctx.local_time
  ORDER BY ctx.start_time;
$$;

REVOKE ALL ON FUNCTION public.get_happy_hours_upcoming_today(timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.get_happy_hours_upcoming_today(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_happy_hours_upcoming_today(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_happy_hours_upcoming_today(timestamptz) TO service_role;

COMMENT ON FUNCTION public.get_happy_hours_upcoming_today(timestamptz) IS
  'Windows scheduled to START later today (venue-local). Sorted by start_time. Uses v_active_happy_hours so stale rows are already excluded.';


-- ============================================================
-- 8. RPC: get_venue_weekly_happy_hours(p_venue_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_venue_weekly_happy_hours(
  p_venue_id uuid
)
RETURNS TABLE(
  happy_hour_id       uuid,
  venue_id            uuid,
  venue_name          text,
  venue_timezone      text,
  days_of_week        smallint[],
  starts_at_local     time,
  ends_at_local       time,
  is_overnight        boolean,
  drink_specials      text[],
  food_specials       text[],
  description         text,
  source              text,
  last_verified_at    timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    happy_hour_id,
    venue_id,
    venue_name,
    venue_timezone,
    days_of_week,
    start_time AS starts_at_local,
    end_time   AS ends_at_local,
    (end_time <= start_time) AS is_overnight,
    drink_specials,
    food_specials,
    description,
    source,
    last_verified_at
  FROM public.v_active_happy_hours
  WHERE venue_id = p_venue_id
  ORDER BY start_time, days_of_week;
$$;

REVOKE ALL ON FUNCTION public.get_venue_weekly_happy_hours(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_venue_weekly_happy_hours(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_venue_weekly_happy_hours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_venue_weekly_happy_hours(uuid) TO service_role;

COMMENT ON FUNCTION public.get_venue_weekly_happy_hours(uuid) IS
  'Full weekly happy-hour schedule for a single venue. Frontend groups by day for display. Reads from v_active_happy_hours (stale/inactive rows excluded).';
