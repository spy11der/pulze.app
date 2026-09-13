-- ============================================================
-- Batch 4B: personalization consent RPC + recommendation-input layer.
-- ============================================================
--
-- Two pieces:
--
--  1. set_my_personalization_consent(boolean) — narrow SECURITY
--     DEFINER RPC that only touches the
--     consent_personalized_recommendations flag on user_consent_states.
--     The client uses this instead of PATCH/UPSERT against the
--     table so it can't accidentally (or maliciously) alter the
--     other consent columns via a broader write.
--
--  2. get_personalization_features_for_user(uuid) — service-role-only
--     RPC that produces the recommendation input surface: distinct
--     venue lists per interaction type, normalized search terms,
--     event counts, and a last-event timestamp. Every subquery
--     reads from personalization_events_eligible (never raw
--     app_events), so consent gating and purpose separation are
--     automatic. A 30-day window is applied inside — that's the
--     MVP tuning parameter for behavioral recency; adjust the
--     literal here before the recommendation reader ships.
--
-- Social-circle boundary (DOCUMENTATION ONLY — not implemented in
-- this batch):
--   A future recommendation system may consider aggregate signals
--   from a user's friends/social circle only if the product/privacy
--   design explicitly allows it. It must never expose which
--   specific friend caused a recommendation and must never reveal
--   private friend activity. There is no friend-level surface in
--   this batch; the input layer here is strictly per-user.


-- ============================================================
-- 1. set_my_personalization_consent
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_my_personalization_consent(p_granted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Owner-derived write. Only consent_personalized_recommendations
  -- is touched — the ON CONFLICT UPDATE explicitly names the single
  -- column so a caller can't ride this RPC to alter the demographic,
  -- location, or ads consent columns.
  INSERT INTO public.user_consent_states (user_id, consent_personalized_recommendations)
  VALUES (v_uid, COALESCE(p_granted, false))
  ON CONFLICT (user_id) DO UPDATE
    SET consent_personalized_recommendations = COALESCE(EXCLUDED.consent_personalized_recommendations, false),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_personalization_consent(boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_my_personalization_consent(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_personalization_consent(boolean) TO authenticated;

COMMENT ON FUNCTION public.set_my_personalization_consent(boolean) IS
  'Narrow write path for the personalization-recommendations consent flag. Ownership derived from auth.uid(); anon has no access; the single column is the only field this RPC can alter. Withdrawing (false) stops future personalization writes via record_app_event and instantly hides existing eligible rows from personalization_events_eligible.';


-- ============================================================
-- 2. get_personalization_features_for_user
-- ============================================================
--
-- Recommendation input layer. Returns a jsonb feature bag suitable
-- for a future ranking algorithm. Every field is derived from
-- personalization_events_eligible, which means:
--
--   * If the user withdraws consent, the view returns no rows, so
--     every feature field collapses to its empty default. No
--     application code has to know consent state.
--   * Operational rows are structurally excluded — they never
--     appear in the view.
--   * demographic_aggregate rows are structurally excluded.
--   * The subject_id space is deliberately restricted to venue
--     interactions and normalized search terms; DOB, race,
--     gender, raw coordinates, captions, photos, friend
--     identities, email, and phone are not queryable here because
--     they're not columns in app_events and were scrubbed from
--     properties at insert time by sanitize_event_properties.
--
-- MVP recency: 30 days. The raw event stream still retains for 90
-- days (cleanup_app_events_by_retention). Adjust the interval
-- literal after product/legal review — do not change silently.
--
-- REVOKE from anon and authenticated so the mobile client cannot
-- call this. Only service_role can execute it (a future recommendation
-- ranking service will run as service_role or via an Edge Function
-- with the service_role key).
CREATE OR REPLACE FUNCTION public.get_personalization_features_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '30 days';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'user_id',       p_user_id,
    'generated_at',  now(),
    'window_days',   30,
    'window_start',  v_cutoff,
    'venues_viewed', (
      SELECT COALESCE(jsonb_agg(DISTINCT subject_id), '[]'::jsonb)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND event_type = 'venue_view'
        AND subject_type = 'venue'
        AND subject_id IS NOT NULL
        AND server_ts >= v_cutoff
    ),
    'venues_saved', (
      SELECT COALESCE(jsonb_agg(DISTINCT subject_id), '[]'::jsonb)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND event_type = 'venue_save'
        AND subject_type = 'venue'
        AND subject_id IS NOT NULL
        AND server_ts >= v_cutoff
    ),
    'venues_unsaved', (
      SELECT COALESCE(jsonb_agg(DISTINCT subject_id), '[]'::jsonb)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND event_type = 'venue_unsave'
        AND subject_type = 'venue'
        AND subject_id IS NOT NULL
        AND server_ts >= v_cutoff
    ),
    'venues_from_search', (
      SELECT COALESCE(jsonb_agg(DISTINCT subject_id), '[]'::jsonb)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND event_type = 'search_result_clicked'
        AND subject_type = 'venue'
        AND subject_id IS NOT NULL
        AND server_ts >= v_cutoff
    ),
    'venues_directions', (
      SELECT COALESCE(jsonb_agg(DISTINCT subject_id), '[]'::jsonb)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND event_type = 'directions_open'
        AND subject_type = 'venue'
        AND subject_id IS NOT NULL
        AND server_ts >= v_cutoff
    ),
    'search_terms', (
      -- Normalized lowercased + trimmed, distinct. Empty or NULL
      -- entries are filtered out so a single 'null' string never
      -- ends up in the array.
      SELECT COALESCE(
        jsonb_agg(DISTINCT term ORDER BY term),
        '[]'::jsonb
      )
      FROM (
        SELECT lower(btrim(properties->>'query')) AS term
        FROM public.personalization_events_eligible
        WHERE user_id = p_user_id
          AND event_type = 'search_query'
          AND properties ? 'query'
          AND server_ts >= v_cutoff
      ) s
      WHERE s.term IS NOT NULL AND s.term <> ''
    ),
    'event_counts', COALESCE((
      SELECT jsonb_object_agg(event_type, n)
      FROM (
        SELECT event_type, count(*) AS n
        FROM public.personalization_events_eligible
        WHERE user_id = p_user_id
          AND server_ts >= v_cutoff
        GROUP BY event_type
      ) counts
    ), '{}'::jsonb),
    'last_event_at', (
      SELECT max(server_ts)
      FROM public.personalization_events_eligible
      WHERE user_id = p_user_id
        AND server_ts >= v_cutoff
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_personalization_features_for_user(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_personalization_features_for_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_personalization_features_for_user(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_personalization_features_for_user(uuid) TO service_role;

COMMENT ON FUNCTION public.get_personalization_features_for_user(uuid) IS
  'Recommendation input surface. Reads only from personalization_events_eligible so consent gating and purpose separation are automatic. 30-day recency window is an MVP tuning parameter — adjust after product/legal review. service_role only; the mobile client cannot call this. Returns inputs, not scores.';
