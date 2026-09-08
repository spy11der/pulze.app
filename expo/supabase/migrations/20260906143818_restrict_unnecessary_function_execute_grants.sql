-- handle_new_user and rls_auto_enable are trigger/event-trigger functions —
-- they can only run inside a trigger context and would error if called directly
-- via RPC, but there's no reason to leave them technically exposed either.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- rank_nearby_venues is a real app-facing function (nearby venue search),
-- but it should require login, not be callable by logged-out visitors.
REVOKE EXECUTE ON FUNCTION public.rank_nearby_venues(double precision, double precision, integer, text) FROM anon;
