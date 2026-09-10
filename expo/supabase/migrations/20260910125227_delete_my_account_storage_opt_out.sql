-- storage.protect_delete() blocks direct DELETE FROM storage.objects to
-- prevent accidental orphans. Supabase's own opt-out is a per-transaction
-- setting, storage.allow_delete_query = 'true'. This is the intended
-- pattern for admin/RPC cleanup paths that know what they're deleting.
-- We flip it on inside the SECURITY DEFINER function, scoped to this
-- transaction only (third arg = true = LOCAL), so nothing else in the
-- session is affected.

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

  PERFORM set_config('storage.allow_delete_query', 'true', true);

  DELETE FROM storage.objects
  WHERE bucket_id IN ('avatars', 'check-in-photos')
    AND (storage.foldername(name))[1] = v_user_id::text;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
