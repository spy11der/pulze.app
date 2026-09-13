-- ============================================================
-- Batch 4C: MVP personalized ranking RPC.
-- ============================================================
--
-- Deterministic, explainable scoring for real active Pulze venues,
-- computed on demand from the consent-eligible personalization
-- stream. Cold-start returns personalized=false with an empty
-- rankings array so the caller can fall back to non-personalized
-- ranking (live busyness, popularity, trending) rather than the
-- ranking layer inventing a preference profile.
--
-- --------------------------------------------------------------
-- Scoring model (all values documented as MVP tuning constants):
-- --------------------------------------------------------------
--
-- Base event weights:
--   venue_save             +8
--   directions_open        +6
--   search_result_clicked  +5
--   venue_view             +2
--   venue_unsave          -10
--   search_query           (not scored on its own; would require semantic
--                          matching to a canonical venue/category/
--                          neighborhood and we do not invent semantics)
--
-- Recency multipliers (against server_ts, the authoritative time):
--    0-3   days: * 1.00
--    4-7   days: * 0.80
--    8-14  days: * 0.55
--    15-30 days: * 0.30
--    > 30  days: ignored (not read at all; personalization_events_eligible
--                        is intersected with a 30-day window)
--
-- Diminishing returns per (venue, event_type) pair for the action
-- events (view / directions_open / search_result_clicked). Order
-- is newest-first so the freshest occurrence carries the largest
-- multiplier and older recurrences fade:
--    1st  : 1.00
--    2nd  : 0.70
--    3rd  : 0.45
--    4th+ : 0.25
--
-- Save-state rule (save / unsave):
--    Only the MOST RECENT save-state event per venue contributes.
--    Older cancelled saves/unsaves do NOT contribute. If the latest
--    is venue_unsave, we apply its -10 (with recency); we do NOT
--    also credit the venue as if it were still saved. If the latest
--    is venue_save, we credit that. Later positive behavior can
--    still move the score upward via view/directions/search_click.
--    This intentionally deviates from the "diminishing returns"
--    rule for save/unsave because save is a state, not an action.
--
-- View cap:
--    Total venue_view contribution per venue is capped at +8. This
--    is chosen so that many rapid opens ("spammy views") cannot
--    overpower a single save (+8) or directions_open (+6). Not
--    permanent; document + revisit.
--
-- No demographic personalization:
--    This RPC never reads user_demographics, user_consent_states'
--    demographic fields, calculated age, DOB, gender, or race.
--    Demographic aggregation lives under its own consent + view
--    (demographic_aggregate_events_eligible) and is used only for
--    aggregate nightlife intelligence, never individualized venue
--    recommendations.
--
-- No social-circle weighting:
--    This RPC never reads friend edges, close-friend state, or any
--    friend's events. A future recommendation system may consider
--    aggregate social-circle signals only if the product/privacy
--    design explicitly allows it, and must never expose which
--    specific friend caused a recommendation.
--
-- Access:
--    service_role only. The mobile client cannot call this directly;
--    a future Edge Function running with the service_role key will
--    serve the finished output to the app. The service_role key is
--    never exposed to the mobile app.

CREATE OR REPLACE FUNCTION public.rank_personalized_venues_for_user(
  p_user_id uuid,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now         timestamptz := now();
  v_cutoff      timestamptz := v_now - interval '30 days';
  v_has_history boolean;
  v_result      jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 20; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;

  -- Cold-start check. Reads via the consent-eligible view so a
  -- withdrawn user always trips this branch.
  SELECT EXISTS (
    SELECT 1 FROM public.personalization_events_eligible
    WHERE user_id = p_user_id AND server_ts >= v_cutoff
  ) INTO v_has_history;

  IF NOT v_has_history THEN
    RETURN jsonb_build_object(
      'user_id',       p_user_id,
      'generated_at',  v_now,
      'window_days',   30,
      'personalized',  false,
      'rankings',      '[]'::jsonb
    );
  END IF;

  WITH raw AS (
    SELECT
      e.event_type,
      v.id AS venue_id,
      v.name AS venue_name,
      e.server_ts,
      CASE
        WHEN e.server_ts >= v_now - interval '3 days'  THEN 1.00::numeric
        WHEN e.server_ts >= v_now - interval '7 days'  THEN 0.80::numeric
        WHEN e.server_ts >= v_now - interval '14 days' THEN 0.55::numeric
        WHEN e.server_ts >= v_now - interval '30 days' THEN 0.30::numeric
        ELSE 0.00::numeric
      END AS recency_mult,
      CASE e.event_type
        WHEN 'venue_save'            THEN 8::numeric
        WHEN 'directions_open'       THEN 6::numeric
        WHEN 'search_result_clicked' THEN 5::numeric
        WHEN 'venue_view'            THEN 2::numeric
        WHEN 'venue_unsave'          THEN -10::numeric
        ELSE 0::numeric
      END AS base_weight
    FROM public.personalization_events_eligible e
    JOIN public.venues v
      ON v.id::text = e.subject_id
     AND v.is_active = true
    WHERE e.user_id = p_user_id
      AND e.subject_type = 'venue'
      AND e.subject_id IS NOT NULL
      AND e.server_ts >= v_cutoff
      AND e.event_type IN (
        'venue_save','venue_unsave','directions_open','search_result_clicked','venue_view'
      )
  ),
  save_state AS (
    -- Latest save-state event per venue is the only one that
    -- counts. Older saves/unsaves for the same venue are treated
    -- as cancelled by whatever came after.
    SELECT DISTINCT ON (venue_id)
      venue_id, venue_name, event_type, server_ts,
      base_weight * recency_mult AS event_score
    FROM raw
    WHERE event_type IN ('venue_save','venue_unsave')
    ORDER BY venue_id, server_ts DESC
  ),
  actions_ranked AS (
    SELECT
      venue_id, venue_name, event_type, server_ts,
      base_weight * recency_mult * CASE
        ROW_NUMBER() OVER (PARTITION BY venue_id, event_type ORDER BY server_ts DESC)
        WHEN 1 THEN 1.00::numeric
        WHEN 2 THEN 0.70::numeric
        WHEN 3 THEN 0.45::numeric
        ELSE 0.25::numeric
      END AS event_score
    FROM raw
    WHERE event_type IN ('venue_view','directions_open','search_result_clicked')
  ),
  per_venue_actions AS (
    SELECT
      venue_id,
      venue_name,
      COALESCE(SUM(event_score) FILTER (WHERE event_type = 'venue_view'), 0)::numeric        AS view_raw,
      LEAST(COALESCE(SUM(event_score) FILTER (WHERE event_type = 'venue_view'), 0), 8.0)::numeric AS view_score,
      COALESCE(SUM(event_score) FILTER (WHERE event_type = 'directions_open'), 0)::numeric   AS directions_score,
      COALESCE(SUM(event_score) FILTER (WHERE event_type = 'search_result_clicked'), 0)::numeric AS search_score,
      COUNT(*) FILTER (WHERE event_type = 'venue_view')            AS view_events,
      COUNT(*) FILTER (WHERE event_type = 'directions_open')       AS directions_events,
      COUNT(*) FILTER (WHERE event_type = 'search_result_clicked') AS search_events,
      MAX(server_ts) AS last_action_at
    FROM actions_ranked
    GROUP BY venue_id, venue_name
  ),
  combined AS (
    SELECT
      COALESCE(a.venue_id, s.venue_id) AS venue_id,
      COALESCE(a.venue_name, s.venue_name) AS venue_name,
      (COALESCE(a.view_score, 0)
        + COALESCE(a.directions_score, 0)
        + COALESCE(a.search_score, 0)
        + COALESCE(s.event_score, 0))::numeric AS total_score,
      a.view_raw, a.view_score,
      a.directions_score, a.search_score,
      a.view_events, a.directions_events, a.search_events,
      s.event_type    AS save_state_event,
      s.event_score   AS save_state_score,
      s.server_ts     AS save_state_at,
      GREATEST(COALESCE(a.last_action_at, '-infinity'::timestamptz),
               COALESCE(s.server_ts,      '-infinity'::timestamptz)) AS last_relevant_event_at
    FROM per_venue_actions a
    FULL OUTER JOIN save_state s ON a.venue_id = s.venue_id
  ),
  ranked AS (
    SELECT
      c.venue_id,
      c.venue_name,
      ROUND(c.total_score, 3) AS personalization_score,
      c.last_relevant_event_at,
      (
        (CASE WHEN c.save_state_event = 'venue_save' AND c.save_state_score > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN COALESCE(c.directions_events, 0) > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN COALESCE(c.search_events, 0) > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN COALESCE(c.view_events, 0) > 0 AND c.view_score > 0 THEN 1 ELSE 0 END)
      ) AS positive_signals,
      (CASE WHEN c.save_state_event = 'venue_unsave' THEN 1 ELSE 0 END) AS negative_signals,
      (
        -- Save-state reason.
        (CASE
          WHEN c.save_state_event = 'venue_save' THEN
            jsonb_build_array(jsonb_build_object(
              'reason', 'saved_recently',
              'score',  ROUND(c.save_state_score, 3),
              'at',     c.save_state_at
            ))
          WHEN c.save_state_event = 'venue_unsave' THEN
            jsonb_build_array(jsonb_build_object(
              'reason', 'unsaved',
              'score',  ROUND(c.save_state_score, 3),
              'at',     c.save_state_at
            ))
          ELSE '[]'::jsonb
        END)
        -- Directions component.
        || (CASE WHEN COALESCE(c.directions_score, 0) > 0 THEN
              jsonb_build_array(jsonb_build_object(
                'reason', 'opened_directions',
                'score',  ROUND(c.directions_score, 3),
                'count',  c.directions_events
              ))
            ELSE '[]'::jsonb END)
        -- Search-result-click component.
        || (CASE WHEN COALESCE(c.search_score, 0) > 0 THEN
              jsonb_build_array(jsonb_build_object(
                'reason', 'selected_from_search',
                'score',  ROUND(c.search_score, 3),
                'count',  c.search_events
              ))
            ELSE '[]'::jsonb END)
        -- View component (with cap flag).
        || (CASE WHEN COALESCE(c.view_score, 0) > 0 THEN
              jsonb_build_array(jsonb_build_object(
                'reason', 'viewed_recently',
                'score',  ROUND(c.view_score, 3),
                'count',  c.view_events,
                'capped', c.view_raw > 8.0
              ))
            ELSE '[]'::jsonb END)
      ) AS score_components
    FROM combined c
    WHERE c.total_score <> 0
  )
  SELECT jsonb_build_object(
    'user_id',      p_user_id,
    'generated_at', v_now,
    'window_days',  30,
    'personalized', true,
    'rankings', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'venue_id',                venue_id,
            'venue_name',              venue_name,
            'personalization_score',   personalization_score,
            'score_components',        score_components,
            'positive_signals',        positive_signals,
            'negative_signals',        negative_signals,
            'last_relevant_event_at',  last_relevant_event_at
          )
          ORDER BY personalization_score DESC, last_relevant_event_at DESC NULLS LAST, venue_id
        )
        FROM (
          SELECT *
          FROM ranked
          ORDER BY personalization_score DESC, last_relevant_event_at DESC NULLS LAST, venue_id
          LIMIT p_limit
        ) top_ranked
      ),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rank_personalized_venues_for_user(uuid, int) FROM public;
REVOKE ALL ON FUNCTION public.rank_personalized_venues_for_user(uuid, int) FROM anon;
REVOKE ALL ON FUNCTION public.rank_personalized_venues_for_user(uuid, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rank_personalized_venues_for_user(uuid, int) TO service_role;

COMMENT ON FUNCTION public.rank_personalized_venues_for_user(uuid, int) IS
  'MVP personalized venue ranking. Reads only from personalization_events_eligible so consent gating, epoch enforcement, and purpose separation are automatic. Never reads demographics, never reads friends, never reads operational rows. Cold-start returns personalized=false with empty rankings. service_role only; a future Edge Function delivers finished results to the mobile client.';
