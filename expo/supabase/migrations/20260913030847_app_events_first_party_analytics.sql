-- ============================================================
-- Batch 4A: first-party behavioral analytics.
-- ============================================================
--
-- Foundation only. This migration:
--   * Creates public.app_events with owner-scoped RLS.
--   * Records events exclusively via the record_app_event RPC so
--     the client can never forge user_id and the server enforces
--     the consent gates.
--   * Adds a 90-day retention cleanup + cron.
--
-- What this migration does NOT do (deliberately deferred):
--   * No recommendation reader, no personalization scoring, no
--     demographic aggregation, no external export path, no
--     advertising surface. Those all read from this table when they
--     ship, but the readers themselves are out of scope.
--
-- Consent boundaries (enforced by record_app_event):
--   purpose = 'operational'           always recorded
--   purpose = 'personalization'       recorded only if
--     user_consent_states.consent_personalized_recommendations = true
--   purpose = 'demographic_aggregate' recorded only if
--     user_consent_states.consent_demographic_analytics = true
--
-- The three consents remain distinct. The location-based check-in
-- switch is NOT a behavioral-analytics master switch.
--
-- Retention: 90-day default for the raw event stream. May be
-- shortened after legal/product review before public launch —
-- keep the cutoff configurable in cleanup_app_events_by_retention.
-- Account deletion cascades events immediately regardless of the
-- window via ON DELETE CASCADE.

-- ============================================================
-- 1. Table + constraints + indexes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    text NOT NULL,
  subject_type  text,
  subject_id    text,
  properties    jsonb NOT NULL DEFAULT '{}'::jsonb,
  purpose       text NOT NULL,
  client_ts     timestamptz,
  server_ts     timestamptz NOT NULL DEFAULT now()
);

-- Purpose enum via CHECK. Only three values ever allowed.
ALTER TABLE public.app_events DROP CONSTRAINT IF EXISTS app_events_purpose_valid;
ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_purpose_valid
  CHECK (purpose IN ('operational', 'personalization', 'demographic_aggregate'));

-- Event-type enum via CHECK. All future event types must be added
-- to this list AND to the client taxonomy in services/analytics.ts;
-- forgetting either is a hard failure, which is the intent.
ALTER TABLE public.app_events DROP CONSTRAINT IF EXISTS app_events_event_type_valid;
ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_event_type_valid
  CHECK (event_type IN (
    'venue_view',
    'venue_dwell',
    'venue_save',
    'venue_unsave',
    'search_query',
    'search_result_clicked',
    'category_view',
    'neighborhood_view',
    'checkin',
    'directions_open',
    'share',
    'friend_request_sent',
    'friend_request_accepted',
    'friend_removed',
    'close_friend_toggled',
    'notification_shown',
    'notification_action',
    'recommendation_impression',
    'recommendation_click'
  ));

-- Subject-type enum. NULL is legal for events without a subject.
ALTER TABLE public.app_events DROP CONSTRAINT IF EXISTS app_events_subject_type_valid;
ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_subject_type_valid
  CHECK (subject_type IS NULL OR subject_type IN (
    'venue',
    'category',
    'neighborhood',
    'user',
    'notification',
    'recommendation',
    'search'
  ));

-- Access patterns:
--   * a user reading their own recent events (owner-scoped feed / debug)
--   * the retention cron scanning by server_ts
--   * a future personalization reader scanning by (user_id, purpose, server_ts)
CREATE INDEX IF NOT EXISTS app_events_user_server_ts_idx
  ON public.app_events (user_id, server_ts DESC);
CREATE INDEX IF NOT EXISTS app_events_server_ts_idx
  ON public.app_events (server_ts);


-- ============================================================
-- 2. RLS: owner-only SELECT, no direct INSERT policy.
-- ============================================================

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Owner can read own events (debugging surface, future personal
-- audit views). Anyone else gets an empty result via the RLS filter.
DROP POLICY IF EXISTS users_read_own_app_events ON public.app_events;
CREATE POLICY users_read_own_app_events
  ON public.app_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT, UPDATE, or DELETE policies. The client cannot INSERT
-- directly via PostgREST — every write must go through the
-- record_app_event SECURITY DEFINER RPC, which forces user_id =
-- auth.uid() and enforces the consent gates. UPDATE and DELETE are
-- reserved for the account-delete cascade and the retention cron
-- (which runs under a role that can bypass RLS anyway).

COMMENT ON TABLE public.app_events IS
  'First-party behavioral analytics. All writes go through record_app_event RPC — no direct INSERT policy exists. Retention: 90 days via cleanup_app_events_by_retention cron. Account deletion cascades events immediately.';


-- ============================================================
-- 3. record_app_event: the one write path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_app_event(
  p_purpose      text,
  p_event_type   text,
  p_subject_type text,
  p_subject_id   text,
  p_properties   jsonb,
  p_client_ts    timestamptz
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_ok    boolean;
  v_props jsonb;
BEGIN
  -- 1. Authenticated only. anon cannot record events at all.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Purpose validation (defense-in-depth over CHECK; also lets
  -- us return a clean error before the consent lookup).
  IF p_purpose NOT IN ('operational','personalization','demographic_aggregate') THEN
    RAISE EXCEPTION 'invalid_purpose' USING ERRCODE = '22023';
  END IF;

  -- 3. Event-type validation.
  IF p_event_type NOT IN (
    'venue_view','venue_dwell','venue_save','venue_unsave',
    'search_query','search_result_clicked',
    'category_view','neighborhood_view',
    'checkin',
    'directions_open','share',
    'friend_request_sent','friend_request_accepted','friend_removed',
    'close_friend_toggled',
    'notification_shown','notification_action',
    'recommendation_impression','recommendation_click'
  ) THEN
    RAISE EXCEPTION 'invalid_event_type' USING ERRCODE = '22023';
  END IF;

  -- 4. Consent gating. operational always records; personalization
  -- and demographic_aggregate are silent no-ops when consent is off
  -- (return 0 so the caller can distinguish "recorded" from "skipped").
  IF p_purpose = 'personalization' THEN
    SELECT COALESCE(consent_personalized_recommendations, false) INTO v_ok
    FROM public.user_consent_states WHERE user_id = v_uid;
    IF v_ok IS NULL OR v_ok = false THEN
      RETURN 0;
    END IF;
  ELSIF p_purpose = 'demographic_aggregate' THEN
    SELECT COALESCE(consent_demographic_analytics, false) INTO v_ok
    FROM public.user_consent_states WHERE user_id = v_uid;
    IF v_ok IS NULL OR v_ok = false THEN
      RETURN 0;
    END IF;
  END IF;

  -- 5. Strip forbidden top-level property keys. Callers should keep
  -- properties flat; nested objects are stored as-is and the caller
  -- is responsible for not putting sensitive material there. Order
  -- of `-` operators is unimportant since each is a no-op if the
  -- key is absent.
  v_props := COALESCE(p_properties, '{}'::jsonb);
  IF jsonb_typeof(v_props) <> 'object' THEN
    v_props := '{}'::jsonb;
  END IF;
  v_props := v_props
    - 'password' - 'token' - 'auth_token' - 'access_token' - 'refresh_token' - 'jwt' - 'apikey' - 'api_key'
    - 'email' - 'phone' - 'phone_number'
    - 'date_of_birth' - 'dob' - 'birthday'
    - 'race' - 'ethnicity' - 'race_ethnicity' - 'gender' - 'gender_identity'
    - 'lat' - 'lng' - 'latitude' - 'longitude' - 'coordinates' - 'coords' - 'location'
    - 'caption' - 'photo' - 'photo_url' - 'photo_uri' - 'photo_blob' - 'image' - 'image_url';

  -- 6. Cap serialized size. 4096 bytes is generous for anything
  -- reasonable; larger payloads suggest either abuse or a bug.
  IF octet_length(v_props::text) > 4096 THEN
    v_props := jsonb_build_object('truncated', true);
  END IF;

  INSERT INTO public.app_events (
    user_id, event_type, subject_type, subject_id, properties, purpose, client_ts
  ) VALUES (
    v_uid, p_event_type, p_subject_type, p_subject_id, v_props, p_purpose, p_client_ts
  );

  RETURN 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_app_event(text, text, text, text, jsonb, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.record_app_event(text, text, text, text, jsonb, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_app_event(text, text, text, text, jsonb, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.record_app_event(text, text, text, text, jsonb, timestamptz) IS
  'One write path for public.app_events. Forces user_id = auth.uid(), enforces consent gating per purpose, strips a fixed list of forbidden property keys, caps property size. Returns 1 if recorded, 0 if skipped due to consent gating.';


-- ============================================================
-- 4. Retention cleanup + cron.
-- ============================================================

-- Kept parallel to cleanup_location_data_by_retention: not
-- SECURITY DEFINER, runs under the cron installer role which
-- already has DELETE authority. Retention window is 90 days for
-- Batch 4A; change here after legal/product review before public
-- launch if a shorter window is chosen.
CREATE OR REPLACE FUNCTION public.cleanup_app_events_by_retention()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.app_events
  WHERE server_ts < now() - interval '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_app_events_by_retention() IS
  'Nightly retention pass for public.app_events. 90-day default; adjust the interval here after legal/product review. Account deletion is handled separately via auth.users ON DELETE CASCADE.';

-- Add cron only if not already scheduled (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pulze-cleanup-app-events') THEN
    PERFORM cron.schedule(
      'pulze-cleanup-app-events',
      '15 3 * * *',  -- 03:15 UTC, offset from the 02:00 location cleanup
      $cronsql$select public.cleanup_app_events_by_retention();$cronsql$
    );
  END IF;
END;
$$;
