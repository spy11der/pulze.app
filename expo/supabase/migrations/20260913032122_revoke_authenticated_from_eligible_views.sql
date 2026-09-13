-- The two consent-gated views are meant to be reachable only from
-- a future server-side reader running under service_role. The
-- previous migration REVOKE'd from PUBLIC + anon but Supabase's
-- default post-migration grant policy re-issued SELECT to the
-- `authenticated` role, so a signed-in client can currently SELECT
-- its own consent-gated rows through the view. That's not a
-- correctness bug (RLS on app_events plus the consent join filter
-- to zero rows for anyone else), but it dilutes the "views are the
-- service-side interface" contract we want future reviewers to
-- see. Explicit REVOKE from authenticated closes the surface.

REVOKE ALL ON public.personalization_events_eligible FROM authenticated;
REVOKE ALL ON public.demographic_aggregate_events_eligible FROM authenticated;

-- service_role grant is unchanged and still allows the eventual
-- reader to consume rows.
