-- ============================================================
-- Batch 4A.1: recursive sanitizer + personalization boundary.
-- ============================================================
--
-- Two hardenings on top of Batch 4A:
--
--   1. sanitize_event_properties(jsonb) walks a jsonb value at every
--      depth, dropping any key whose lowercase form matches the
--      forbidden set. Objects nested inside objects, arrays of
--      objects, arrays inside arrays — all reachable. This replaces
--      the per-key `-` chain in record_app_event which only touched
--      the top level. Same forbidden list as before.
--
--   2. Two consent-gated views expose the app_events rows that a
--      future recommendation or aggregation reader is *allowed* to
--      consume. They are the only supported read path for that data:
--        - personalization_events_eligible
--        - demographic_aggregate_events_eligible
--
--      Filtering on user_consent_states inside the view means a
--      user who withdraws consent instantly disappears from the
--      view without any application code needing to know. Neither
--      view exposes 'operational' rows — the operational purpose
--      keeps its narrow meaning (product operation / measurement /
--      security), not "everything else that could be repurposed".
--
-- No storage duplication. app_events remains the single source of
-- truth; the views are just filtered projections.


-- ============================================================
-- 1. Recursive property sanitizer.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sanitize_event_properties(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_key  text;
  v_val  jsonb;
  v_obj  jsonb;
  v_arr  jsonb;
  v_item jsonb;
BEGIN
  IF p IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  CASE jsonb_typeof(p)
    WHEN 'object' THEN
      v_obj := '{}'::jsonb;
      FOR v_key, v_val IN SELECT * FROM jsonb_each(p) LOOP
        -- Match on lowercase so 'Email' / 'EMAIL' / 'email' all
        -- collapse to the same forbidden set. Same list as the
        -- client-side scrub in services/analytics.ts.
        IF lower(v_key) = ANY (ARRAY[
          'password','token','auth_token','access_token','refresh_token','jwt','apikey','api_key',
          'email','phone','phone_number',
          'date_of_birth','dob','birthday',
          'race','ethnicity','race_ethnicity','gender','gender_identity',
          'lat','lng','latitude','longitude','coordinates','coords','location',
          'caption','photo','photo_url','photo_uri','photo_blob','image','image_url'
        ]) THEN
          CONTINUE;  -- drop the key entirely, including whatever's inside its value
        END IF;
        v_obj := v_obj || jsonb_build_object(v_key, public.sanitize_event_properties(v_val));
      END LOOP;
      RETURN v_obj;

    WHEN 'array' THEN
      v_arr := '[]'::jsonb;
      FOR v_item IN SELECT jsonb_array_elements(p) LOOP
        v_arr := v_arr || jsonb_build_array(public.sanitize_event_properties(v_item));
      END LOOP;
      RETURN v_arr;

    ELSE
      -- Scalars (string / number / boolean / null) pass through.
      RETURN p;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.sanitize_event_properties(jsonb) IS
  'Recursively removes any key whose lowercase form matches the forbidden set (secrets, PII, raw coordinates, captions, photos). Applies at every depth of objects and arrays. IMMUTABLE so it is safe to inline into record_app_event and future callers.';


-- ============================================================
-- 2. record_app_event now uses the recursive sanitizer.
-- ============================================================
--
-- Same signature and behavior otherwise. Only the properties-scrub
-- step changed; everything else (auth check, purpose validation,
-- event-type validation, consent gating, size cap, INSERT with
-- user_id = auth.uid(), return 1/0) is unchanged.

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_purpose NOT IN ('operational','personalization','demographic_aggregate') THEN
    RAISE EXCEPTION 'invalid_purpose' USING ERRCODE = '22023';
  END IF;

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

  -- Recursive scrub at every depth. Non-object input (e.g. the
  -- client sending a scalar or array by mistake) is normalized to
  -- an empty object first so the sanitizer never has to invent an
  -- object shape for us.
  IF p_properties IS NULL OR jsonb_typeof(p_properties) <> 'object' THEN
    v_props := '{}'::jsonb;
  ELSE
    v_props := public.sanitize_event_properties(p_properties);
  END IF;

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


-- ============================================================
-- 3. Consent-gated views: the only supported read path for future
--    personalization / demographic-aggregate consumers.
-- ============================================================
--
-- Both views filter on the corresponding consent flag. When a user
-- withdraws consent, rows for that user disappear from the view
-- automatically — no application code needs to know about the
-- withdrawal. Withdrawal is "immediate" in exactly this sense: the
-- next read from the view will not see those rows.
--
-- security_invoker is set so RLS on app_events still applies to
-- the caller. That means the views are usable by:
--   * the owner (reading their own rows via authenticated session)
--   * service_role (bypassing RLS, for a future server-side reader)
-- and no one else. anon and authenticated non-owners see nothing.
--
-- IMPORTANT: the operational purpose is deliberately NOT included
-- in either view. Operational events remain narrowly scoped to
-- product operation / measurement / security. A future recommendation
-- system does NOT get to consume operational data merely because it
-- exists — the recommendation reader queries
-- personalization_events_eligible and gets only rows that were
-- emitted under personalization AND whose owner still consents.

CREATE OR REPLACE VIEW public.personalization_events_eligible
WITH (security_invoker = true) AS
SELECT
  ae.id,
  ae.user_id,
  ae.event_type,
  ae.subject_type,
  ae.subject_id,
  ae.properties,
  ae.client_ts,
  ae.server_ts
FROM public.app_events ae
JOIN public.user_consent_states ucs
  ON ucs.user_id = ae.user_id
WHERE ae.purpose = 'personalization'
  AND ucs.consent_personalized_recommendations = true;

COMMENT ON VIEW public.personalization_events_eligible IS
  'Consent-gated read path for future recommendation systems. Rows disappear from the view the moment a user withdraws consent_personalized_recommendations. Operational rows are intentionally excluded — the operational purpose is not a fallback dataset for personalization.';

REVOKE ALL ON public.personalization_events_eligible FROM PUBLIC;
REVOKE ALL ON public.personalization_events_eligible FROM anon;
-- Owners can still read their own personalization rows via
-- app_events directly (RLS). Grant to authenticated on the view is
-- deliberately withheld so a client cannot accidentally treat the
-- view as a data-mining surface for its own account either.
GRANT SELECT ON public.personalization_events_eligible TO service_role;


CREATE OR REPLACE VIEW public.demographic_aggregate_events_eligible
WITH (security_invoker = true) AS
SELECT
  ae.id,
  ae.user_id,
  ae.event_type,
  ae.subject_type,
  ae.subject_id,
  ae.properties,
  ae.client_ts,
  ae.server_ts
FROM public.app_events ae
JOIN public.user_consent_states ucs
  ON ucs.user_id = ae.user_id
WHERE ae.purpose = 'demographic_aggregate'
  AND ucs.consent_demographic_analytics = true;

COMMENT ON VIEW public.demographic_aggregate_events_eligible IS
  'Consent-gated read path for future demographic-aggregation systems. Same shape as personalization_events_eligible. Small-cohort suppression (minimum 20-user rule) must be applied by the aggregation reader; it is NOT implemented in the view itself so the reader can carry the responsibility explicitly.';

REVOKE ALL ON public.demographic_aggregate_events_eligible FROM PUBLIC;
REVOKE ALL ON public.demographic_aggregate_events_eligible FROM anon;
GRANT SELECT ON public.demographic_aggregate_events_eligible TO service_role;


-- Clarifying comment on the purpose column so a future engineer
-- reading the schema knows the semantic contract.
COMMENT ON COLUMN public.app_events.purpose IS
  'The single semantic contract that determines which downstream consumers may read the row. operational rows may be read by product operation / measurement / security paths only — NOT by personalization or aggregation readers. personalization rows are readable only via personalization_events_eligible (consent-gated). demographic_aggregate rows are readable only via demographic_aggregate_events_eligible (consent-gated). A row is never eligible for a purpose other than the one it was written under.';
