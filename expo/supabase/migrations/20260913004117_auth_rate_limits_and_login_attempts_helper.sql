-- Sliding-window rate-limit primitive backing the login-with-username
-- Edge Function. `bucket` is any string the caller wants to gate on
-- (IP, username, or the combination). Every attempt increments the
-- window's counter and returns whether the caller is still under
-- `p_max` for the current window; if the window has expired the
-- counter resets on the same row.
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  bucket   text PRIMARY KEY,
  count    int  NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

-- RLS on with no policies -> only SECURITY DEFINER callers (via
-- service_role) can access this table. Regular authenticated / anon
-- sessions cannot read or write it, so the counters can't be probed
-- or reset by clients.
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_increment_login_attempts(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now   timestamptz := now();
  v_count int;
BEGIN
  INSERT INTO public.auth_rate_limits(bucket, count, reset_at)
  VALUES (p_bucket, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (bucket) DO UPDATE
    SET count = CASE
                  WHEN public.auth_rate_limits.reset_at < v_now THEN 1
                  ELSE public.auth_rate_limits.count + 1
                END,
        reset_at = CASE
                    WHEN public.auth_rate_limits.reset_at < v_now
                      THEN v_now + make_interval(secs => p_window_seconds)
                    ELSE public.auth_rate_limits.reset_at
                  END
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;

-- The Edge Function calls this via the service_role client. No other
-- role should ever be able to invoke it — a client-side rate-limit
-- checker would defeat the whole purpose.
REVOKE ALL ON FUNCTION public.check_and_increment_login_attempts(text, int, int) FROM public;
REVOKE ALL ON FUNCTION public.check_and_increment_login_attempts(text, int, int) FROM anon;
REVOKE ALL ON FUNCTION public.check_and_increment_login_attempts(text, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_login_attempts(text, int, int) TO service_role;

COMMENT ON TABLE public.auth_rate_limits IS
  'Sliding-window counters for the login-with-username Edge Function. Access restricted to service_role via SECURITY DEFINER RPC.';
