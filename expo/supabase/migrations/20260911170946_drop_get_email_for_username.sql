-- get_email_for_username is a SECURITY DEFINER function that any
-- anonymous caller could invoke via PostgREST to resolve a username to
-- the account's real email address. The app doesn't use it (the
-- working username-login flow uses resolve_login_email instead),
-- verified via full-repo grep. Dropping removes the enumeration surface
-- entirely; a plain REVOKE would leave the function callable if grants
-- are re-added in the future.
DROP FUNCTION IF EXISTS public.get_email_for_username(text);
