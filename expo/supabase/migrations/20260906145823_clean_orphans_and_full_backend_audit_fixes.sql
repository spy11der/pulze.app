-- Remove orphaned test data before enforcing referential integrity
DELETE FROM public.visit_sessions WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = visit_sessions.user_id);

-- 1. Remove dead cron jobs
SELECT cron.unschedule(3);
SELECT cron.unschedule(4);

-- 2. Fix update_cell_scores — remove dead vibe_drops reference
CREATE OR REPLACE FUNCTION public.update_cell_scores()
RETURNS TABLE(cell_id text, energy_score numeric, vibe_status text)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_GeoHash(v.location::geometry, 6) as cell_id,
        (COUNT(vs.id) * 1.0)::NUMERIC as energy_score,
        CASE
            WHEN COUNT(vs.id) > 30 THEN '🔥 OVERFLOWING'
            WHEN COUNT(vs.id) > 10 THEN '⚡ ACTIVE'
            ELSE '💤 NEUTRAL'
        END as vibe_status
    FROM venues v
    LEFT JOIN visit_sessions vs ON vs.venue_id = v.id AND vs.exited_at IS NULL
    GROUP BY cell_id;
END;
$$;

-- 3. Build live_venue_scores (canonical scoring view, unblocks rank_nearby_venues + trending_in_city)
CREATE OR REPLACE VIEW public.live_venue_scores AS
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
  ('Based on ' || COALESCE(lvm.active_visitors,0) || ' active visitors and ' ||
    COALESCE(rcm.checkin_unique_users_60,0) || ' recent check-ins') AS score_reason
FROM public.pulze_master_scores pms
LEFT JOIN public.live_venue_metrics lvm ON lvm.venue_id = pms.venue_id
LEFT JOIN public.crowd_forecast_view cf ON cf.venue_id = pms.venue_id
LEFT JOIN public.v_recent_checkin_metrics rcm ON rcm.venue_id = pms.venue_id
LEFT JOIN public.baseline_activity_view bav ON bav.venue_id = pms.venue_id
  AND bav.day_of_week = EXTRACT(DOW FROM now())::int
  AND bav.hour_of_day = EXTRACT(HOUR FROM now())::int;

-- 4. Cascade-delete integrity
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.visit_sessions ADD CONSTRAINT visit_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.location_pings ADD CONSTRAINT location_pings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.geofence_candidates ADD CONSTRAINT geofence_candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_consent_states ADD CONSTRAINT user_consent_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_privacy_prefs ADD CONSTRAINT user_privacy_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.consent_audit_log ADD CONSTRAINT consent_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_venue_saves ADD CONSTRAINT user_venue_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_searches ADD CONSTRAINT user_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bluetooth_proximity_events ADD CONSTRAINT bluetooth_proximity_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.friend_presence_cache ADD CONSTRAINT friend_presence_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.friend_presence_cache ADD CONSTRAINT friend_presence_cache_friend_user_id_fkey FOREIGN KEY (friend_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_friendships ADD CONSTRAINT user_friendships_user_id_a_fkey FOREIGN KEY (user_id_a) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_friendships ADD CONSTRAINT user_friendships_user_id_b_fkey FOREIGN KEY (user_id_b) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Missing indexes on visit_sessions (hottest table) + others
CREATE INDEX idx_visit_sessions_venue_id ON public.visit_sessions(venue_id);
CREATE INDEX idx_visit_sessions_user_id ON public.visit_sessions(user_id);
CREATE INDEX idx_visit_sessions_entered_at ON public.visit_sessions(entered_at);
CREATE INDEX idx_location_pings_user_id ON public.location_pings(user_id);
CREATE INDEX idx_consent_audit_log_user_id ON public.consent_audit_log(user_id);

-- 6. Prevent self-friending
ALTER TABLE public.user_friendships ADD CONSTRAINT no_self_friendship CHECK (user_id_a <> user_id_b);

-- 7. Storage cleanup policies
CREATE POLICY "users_delete_own_checkin_photos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'check-in-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users_delete_own_avatars" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. Friendship column-privacy trigger (RLS can't do column-level restriction)
CREATE OR REPLACE FUNCTION public.enforce_friendship_column_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() = OLD.user_id_a THEN
    IF NEW.is_close_friend_b_to_a IS DISTINCT FROM OLD.is_close_friend_b_to_a
       OR NEW.allow_b_sees_a_location IS DISTINCT FROM OLD.allow_b_sees_a_location THEN
      RAISE EXCEPTION 'Cannot modify the other user''s own permission fields';
    END IF;
  ELSIF auth.uid() = OLD.user_id_b THEN
    IF NEW.is_close_friend_a_to_b IS DISTINCT FROM OLD.is_close_friend_a_to_b
       OR NEW.allow_a_sees_b_location IS DISTINCT FROM OLD.allow_a_sees_b_location THEN
      RAISE EXCEPTION 'Cannot modify the other user''s own permission fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_friendship_column_privacy_trigger
  BEFORE UPDATE ON public.user_friendships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_friendship_column_privacy();
