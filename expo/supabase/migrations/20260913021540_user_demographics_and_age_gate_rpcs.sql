-- 21+ age gate — data storage and server-side enforcement.
--
-- Design constraints, from the launch privacy spec:
--   * DOB is category-A PII. Store in an owner-only table, never in
--     the public profiles row (which is read-all-authenticated).
--   * DOB cannot be freely changed by the normal client after it has
--     been established. The RPC below refuses a second set. There is
--     also NO UPDATE RLS policy — the client cannot patch the row
--     via PostgREST at all.
--   * Age validation is time-dependent, so it lives in the RPC
--     (SECURITY DEFINER + STABLE current_date). Do NOT try to encode
--     it as a CHECK constraint — Postgres CHECK expressions must be
--     immutable, and current_date is only STABLE.
--   * Account deletion cascades this row automatically via the
--     auth.users(id) foreign key.

CREATE TABLE IF NOT EXISTS public.user_demographics (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth    date        NOT NULL,
  -- Records when the DOB was first accepted. Combined with the
  -- absence of an UPDATE policy this is what prevents the row from
  -- being silently rewritten later by a client.
  established_at   timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_demographics ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT. Any other authenticated user reading this table
-- gets an empty result set — RLS is a filter, not an error, so no
-- existence oracle is exposed.
DROP POLICY IF EXISTS users_read_own_demographics ON public.user_demographics;
CREATE POLICY users_read_own_demographics
  ON public.user_demographics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner-only INSERT. Combined with the PK on user_id this allows a
-- single row per user; a second INSERT hits unique_violation. The
-- SECURITY DEFINER RPC below intercepts that case with a clean error.
DROP POLICY IF EXISTS users_insert_own_demographics ON public.user_demographics;
CREATE POLICY users_insert_own_demographics
  ON public.user_demographics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Intentionally NO UPDATE and NO DELETE policies. Direct PATCH via
-- PostgREST cannot alter DOB. DELETE happens only via account-delete
-- cascade. If a future flow (verified-provider path in Batch 3+)
-- needs to overwrite the row, it will do so via a new SECURITY
-- DEFINER RPC gated by that provider's verification result — never
-- by user-supplied UPDATE.

COMMENT ON TABLE public.user_demographics IS
  'Owner-only demographic record. DOB is the only column for the Batch 2 21+ gate; gender/race columns are the deliberate Batch 3 extension point.';


-- ============================================================
-- set_my_date_of_birth: the one write path for the DOB gate.
-- ============================================================
--
-- Refuses to insert if:
--   * caller isn't authenticated
--   * DOB is null / in the future
--   * DOB is implausibly old (< 1900)
--   * caller is under 21 today (calendar-year arithmetic)
--   * caller already has a demographic row (no post-hoc reset)
--
-- Returns the caller's current whole-year age on success.
--
-- Error codes (see setMyDateOfBirth() client-side mapping):
--   not_authenticated  (SQLSTATE 28000)
--   future_date        (SQLSTATE 22007)
--   under_21           (SQLSTATE P0001)
--   already_set        (SQLSTATE P0001, MESSAGE distinguishes)
CREATE OR REPLACE FUNCTION public.set_my_date_of_birth(p_dob date)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_min_age_cutoff date := current_date - interval '21 years';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_dob IS NULL OR p_dob > current_date THEN
    RAISE EXCEPTION 'future_date' USING ERRCODE = '22007';
  END IF;

  IF p_dob < DATE '1900-01-01' THEN
    -- Same shape as future_date — from the user's perspective this
    -- is "invalid date", and we don't need to distinguish outward.
    RAISE EXCEPTION 'future_date' USING ERRCODE = '22007';
  END IF;

  -- Exactly-21-today acceptance:
  --   today = 2026-09-13, cutoff = 2005-09-13
  --   dob = 2005-09-13 -> 2005-09-13 <= 2005-09-13 -> OK
  --   dob = 2005-09-14 -> 2005-09-14 <= 2005-09-13 -> reject
  IF p_dob > v_min_age_cutoff THEN
    RAISE EXCEPTION 'under_21' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_demographics WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'already_set' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.user_demographics (user_id, date_of_birth)
  VALUES (v_uid, p_dob);

  RETURN DATE_PART('year', AGE(current_date, p_dob))::int;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_date_of_birth(date) FROM public;
REVOKE ALL ON FUNCTION public.set_my_date_of_birth(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_date_of_birth(date) TO authenticated;

COMMENT ON FUNCTION public.set_my_date_of_birth(date) IS
  'One-shot DOB setter. 21+ enforced server-side against current_date; refuses a second call once a row exists. FUTURE: a Batch 3+ SECURITY DEFINER RPC gated on a third-party age/ID verification result may overwrite the row and mark it verified — never a user-supplied UPDATE path.';


-- ============================================================
-- get_current_user_age: safe public-facing age readout.
-- ============================================================
--
-- Returns an integer age computed from the caller's DOB, or NULL if
-- the caller hasn't completed the gate. Does NOT return DOB. Age is
-- recomputed every call, so birthdays automatically roll the value.
CREATE OR REPLACE FUNCTION public.get_current_user_age()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dob date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT date_of_birth INTO v_dob
  FROM public.user_demographics
  WHERE user_id = v_uid;
  IF v_dob IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN DATE_PART('year', AGE(current_date, v_dob))::int;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_age() FROM public;
REVOKE ALL ON FUNCTION public.get_current_user_age() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_age() TO authenticated;

COMMENT ON FUNCTION public.get_current_user_age() IS
  'Own-age readout for profile display. When a future other-user profile screen needs to display someone else''s age, add a companion get_user_age(uuid) that returns only the integer — never DOB.';
