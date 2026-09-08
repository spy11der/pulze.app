-- ============================================
-- 1. Drop dead functions (tables they referenced no longer exist)
-- ============================================
DROP FUNCTION IF EXISTS public.send_nudge(uuid, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.can_receive_nudge(uuid);
DROP FUNCTION IF EXISTS public.ingest_eventbrite_events(jsonb);

-- ============================================
-- 2. Pin search_path on every real function (prevents search_path hijacking)
-- ============================================
ALTER FUNCTION public.cleanup_friend_presence_cache() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_location_data_by_retention() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nearby_geofence_candidates(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nearby_geofence_candidates(uuid, double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_geofence_transition(uuid, double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_smart_geofence(uuid, double precision, double precision, double precision, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.pulze_clamp01(numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.pulze_decay(double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.rank_nearby_venues(double precision, double precision, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_geofence_event(uuid, uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_venue_geom_from_lat_lng() SET search_path = public, pg_temp;
ALTER FUNCTION public.trending_in_city(text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_cell_scores() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_friend_presence(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_venue_scores() SET search_path = public, pg_temp;
ALTER FUNCTION public.user_has_consent(uuid, text) SET search_path = public, pg_temp;

-- ============================================
-- 3. Lock down the one view that leaks per-user data
-- (v_checkin_signals_recent exposes raw user_id per check-in, bypassing
--  each check-in's own visibility setting. v_recent_checkin_metrics, which
--  is the aggregate the app should actually read, still works fine because
--  it runs as the view owner internally.)
-- ============================================
REVOKE SELECT ON public.v_checkin_signals_recent FROM anon, authenticated;

-- ============================================
-- 4. RLS policies for the 12 tables that had none
-- ============================================

-- venues, algorithm_weights, neighborhoods: reference/lookup data, read-only to the app
CREATE POLICY "authenticated_read_venues" ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_algorithm_weights" ON public.algorithm_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_neighborhoods" ON public.neighborhoods FOR SELECT TO authenticated USING (true);

-- check_ins: visible if public and not deleted, or if it's your own; only you can write/soft-delete your own
CREATE POLICY "users_read_visible_checkins" ON public.check_ins FOR SELECT TO authenticated
  USING (is_deleted = false AND (visibility = 'public' OR user_id = auth.uid()));
CREATE POLICY "users_insert_own_checkins" ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_checkins" ON public.check_ins FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_friendships: either party can see/update; the requester creates it
CREATE POLICY "users_read_own_friendships" ON public.user_friendships FOR SELECT TO authenticated
  USING (user_id_a = auth.uid() OR user_id_b = auth.uid());
CREATE POLICY "users_insert_own_friendship_requests" ON public.user_friendships FOR INSERT TO authenticated
  WITH CHECK (user_id_a = auth.uid());
CREATE POLICY "users_update_own_friendships" ON public.user_friendships FOR UPDATE TO authenticated
  USING (user_id_a = auth.uid() OR user_id_b = auth.uid())
  WITH CHECK (user_id_a = auth.uid() OR user_id_b = auth.uid());

-- visit_sessions, location_pings, geofence_candidates: own data only, gated by GPS consent on insert
-- (matches the existing users_read_own_X / system_insert_X_with_consent pattern already used on
--  bluetooth_proximity_events and user_searches)
CREATE POLICY "users_read_own_visit_sessions" ON public.visit_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "system_insert_visit_sessions_with_consent" ON public.visit_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_has_consent(auth.uid(), 'location_gps'));
CREATE POLICY "users_update_own_visit_sessions" ON public.visit_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_location_pings" ON public.location_pings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "system_insert_location_pings_with_consent" ON public.location_pings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_has_consent(auth.uid(), 'location_gps'));

CREATE POLICY "users_read_own_geofence_candidates" ON public.geofence_candidates FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "system_insert_geofence_candidates_with_consent" ON public.geofence_candidates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_has_consent(auth.uid(), 'location_gps'));

-- user_consent_states, user_privacy_prefs: fully self-managed
CREATE POLICY "users_read_own_consent_states" ON public.user_consent_states FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_consent_states" ON public.user_consent_states FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_consent_states" ON public.user_consent_states FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_privacy_prefs" ON public.user_privacy_prefs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_privacy_prefs" ON public.user_privacy_prefs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_privacy_prefs" ON public.user_privacy_prefs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- consent_audit_log: append-only, self-visible, no update/delete (it's an audit trail)
CREATE POLICY "users_read_own_consent_audit" ON public.consent_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_consent_audit" ON public.consent_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- user_venue_saves: fully self-managed (save/unsave)
CREATE POLICY "users_read_own_venue_saves" ON public.user_venue_saves FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_venue_saves" ON public.user_venue_saves FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_venue_saves" ON public.user_venue_saves FOR DELETE TO authenticated
  USING (user_id = auth.uid());
