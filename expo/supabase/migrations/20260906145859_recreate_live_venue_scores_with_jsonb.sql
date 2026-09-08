DROP VIEW IF EXISTS public.live_venue_scores;

CREATE VIEW public.live_venue_scores AS
SELECT
  pms.venue_id,
  pms.activity_score AS pulze_score,
  GREATEST(0, 100 - pms.activity_score) AS quiet_score,
  CASE cf.forecast_label
    WHEN 'surging' THEN 1.0
    WHEN 'building' THEN 0.5
    WHEN 'warming_up' THEN 0.25
    WHEN 'steady' THEN 0.0
    WHEN 'cooling_off' THEN -0.5
    ELSE 0.0
  END AS trend_score,
  LEAST(100, (COALESCE(lvm.active_visitors,0) * 10)::numeric) AS confidence_score,
  COALESCE(lvm.active_visitors, 0) AS occupancy_proxy,
  COALESCE(rcm.checkin_unique_users_60, 0) AS unique_users_recent,
  CASE WHEN bav.expected_activity IS NULL OR bav.expected_activity = 0 THEN NULL
       ELSE ROUND((COALESCE(lvm.recent_arrivals,0)::numeric / bav.expected_activity) * 100, 1)
  END AS activity_vs_baseline,
  COALESCE(cf.forecast_label, 'steady') AS trend_label,
  jsonb_build_object(
    'active_visitors', COALESCE(lvm.active_visitors, 0),
    'recent_arrivals', COALESCE(lvm.recent_arrivals, 0),
    'unique_users_recent', COALESCE(rcm.checkin_unique_users_60, 0),
    'trend_label', COALESCE(cf.forecast_label, 'steady')
  ) AS score_reason
FROM public.pulze_master_scores pms
LEFT JOIN public.live_venue_metrics lvm ON lvm.venue_id = pms.venue_id
LEFT JOIN public.crowd_forecast_view cf ON cf.venue_id = pms.venue_id
LEFT JOIN public.v_recent_checkin_metrics rcm ON rcm.venue_id = pms.venue_id
LEFT JOIN public.baseline_activity_view bav ON bav.venue_id = pms.venue_id
  AND bav.day_of_week = EXTRACT(DOW FROM now())::int
  AND bav.hour_of_day = EXTRACT(HOUR FROM now())::int;
