-- Repair the nightly location-retention cleanup.
--
-- The previous body referenced public.user_visits, a table that was
-- dropped in an earlier consolidation, so every scheduled run raised
-- `relation "public.user_visits" does not exist` and NOTHING was
-- being pruned. That silently violated the retention promise for
-- location-derived data.
--
-- New behavior: delete rows from every location-derived per-user
-- table that are older than the user's configured
-- `user_privacy_prefs.location_retention_days`, defaulting to 30 days
-- when no explicit preference is set. The four tables covered are the
-- only per-user location surfaces after the consolidation:
--   - visit_sessions          (entered_at)
--   - location_pings          (recorded_at, may be null on legacy rows)
--   - geofence_candidates     (last_computed_at, may be null)
--   - bluetooth_proximity_events (detected_at)
--
-- Reference / aggregate venue data (venues, venue_scores, etc.) and
-- account-deletion cascades are intentionally NOT touched — this
-- function only prunes per-user location traces.
--
-- The nightly pg_cron job `pulze-cleanup-location-retention`
-- (schedule `0 2 * * *`) already invokes this function and was left
-- in place; only the function body needed repair.
CREATE OR REPLACE FUNCTION public.cleanup_location_data_by_retention()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.visit_sessions vs
  WHERE vs.entered_at < now() - COALESCE(
    (SELECT (p.location_retention_days::text || ' days')::interval
       FROM public.user_privacy_prefs p WHERE p.user_id = vs.user_id),
    '30 days'::interval
  );

  DELETE FROM public.location_pings lp
  WHERE COALESCE(lp.recorded_at, 'epoch'::timestamptz) < now() - COALESCE(
    (SELECT (p.location_retention_days::text || ' days')::interval
       FROM public.user_privacy_prefs p WHERE p.user_id = lp.user_id),
    '30 days'::interval
  );

  DELETE FROM public.geofence_candidates gc
  WHERE COALESCE(gc.last_computed_at, 'epoch'::timestamptz) < now() - COALESCE(
    (SELECT (p.location_retention_days::text || ' days')::interval
       FROM public.user_privacy_prefs p WHERE p.user_id = gc.user_id),
    '30 days'::interval
  );

  DELETE FROM public.bluetooth_proximity_events bpe
  WHERE bpe.detected_at < now() - COALESCE(
    (SELECT (p.location_retention_days::text || ' days')::interval
       FROM public.user_privacy_prefs p WHERE p.user_id = bpe.user_id),
    '30 days'::interval
  );
END;
$function$;
