-- Kill the enumeration oracle.
--
-- resolve_login_email(text) was granted EXECUTE to anon (and
-- authenticated), which let any holder of the publishable anon key
-- reverse a username to its real email via a single POST to
-- /rest/v1/rpc/resolve_login_email. That's the exact enumeration
-- surface get_email_for_username was dropped for.
--
-- The username-login flow now goes through the `login-with-username`
-- Edge Function, which uses a service_role client to call this
-- function server-side and never returns the resolved email to the
-- caller. So the RPC only needs to remain executable by service_role.
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM public;
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM authenticated;
-- Ensure service_role still has EXECUTE (it always did via a
-- previous grant; re-issuing is a no-op if present).
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO service_role;

COMMENT ON FUNCTION public.resolve_login_email(text) IS
  'Username -> email resolver. Restricted to service_role: reached only via the login-with-username Edge Function, never called from a client.';
