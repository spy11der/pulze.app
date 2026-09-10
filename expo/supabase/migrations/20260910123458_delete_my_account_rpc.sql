-- SECURITY DEFINER account-deletion RPC. Deletes the caller's user record
-- and every scrap of user-scoped data via FK cascade + explicit Storage
-- object cleanup, all in a single transaction. Runs as the function owner
-- (postgres), which has DELETE on auth.users; the client never receives
-- the service-role key. Callable only by authenticated sessions.
--
-- Scope of deletion (auth.uid() is the caller):
--   1. storage.objects rows in buckets 'avatars' and 'check-in-photos'
--      where the first path segment equals the user id (the layout enforced
--      by the users_upload_own_* RLS policies from
--      20260906145135_check_ins_content_fields_and_storage_and_close_friends
--      and 20260906145823_clean_orphans_and_full_backend_audit_fixes).
--      The underlying blob is reaped by Supabase Storage's GC afterward;
--      row deletion is what makes it unreachable to any client immediately.
--   2. auth.users row for auth.uid(), which cascades to:
--      auth.* : identities, mfa_factors, oauth_authorizations, oauth_consents,
--               one_time_tokens, sessions, webauthn_challenges, webauthn_credentials
--      public.: profiles, bluetooth_proximity_events, consent_audit_log,
--               friend_presence_cache (both directions), geofence_candidates,
--               location_pings, user_consent_states, user_friendships (both sides),
--               user_privacy_prefs, user_searches, user_venue_saves, visit_sessions,
--               and transitively check_ins via profiles.
--
-- Retained: venues, venue_photos, venue_provider_links, neighborhoods,
-- algorithm_weights (not user-owned reference/venue data).

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id IN ('avatars', 'check-in-photos')
    AND (storage.foldername(name))[1] = v_user_id::text;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
