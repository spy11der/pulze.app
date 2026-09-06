-- Username login support + guaranteed profile creation on signup.
-- Run once in the Supabase dashboard (SQL Editor). Idempotent — safe to re-run.
--
-- Auth model:
--   auth.users.email          = the user's REAL email (Supabase Auth identity)
--   profiles.username         = unique username (what users type to log in)
--   profiles.display_name     = display name
--
-- Login resolves username -> real auth email via resolve_login_email, then
-- calls supabase.auth.signInWithPassword with that email + password.

-- ---------------------------------------------------------------------------
-- 1) resolve_login_email: username -> auth email
--
-- SECURITY DEFINER is required because profiles is RLS-protected and the
-- caller is anonymous (pre-login). The email alone grants nothing — sign-in
-- still requires the correct password via signInWithPassword. Residual risk:
-- an attacker can probe whether a username exists (email enumeration) by
-- observing non-null vs null. Client code always answers with a generic
-- "Invalid username or password" so the distinction is never surfaced.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.email
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  WHERE lower(p.username) = lower(trim(p_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Guarantee profiles row at signup — fires when the auth user row is
-- INSERTED, i.e. immediately at signUp() even when email confirmation is
-- enabled and no session exists yet. Without this, email confirmation would
-- delay profile creation until first login.
--
-- Reads username/display_name from the metadata signUp() sends in
-- options.data. ON CONFLICT makes it coexist harmlessly with the client-side
-- upsert that runs after a confirmed signup.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
