-- The original CHECK on race_ethnicity used
--   array_length(race_ethnicity, 1) > 0
-- which is NULL for empty arrays (Postgres returns NULL for
-- array_length of a zero-length dimension). NULL propagates through
-- AND/OR and CHECK constraints treat NULL as satisfied, so ARRAY[]
-- was silently accepted. Use cardinality() instead — it returns 0
-- for empty arrays, so `> 0` is a real boolean.
--
-- Two data-model steps first: null out any race_ethnicity that is
-- currently the empty array (which would violate the new constraint
-- and block ADD CONSTRAINT). Only one test row is affected today.

UPDATE public.user_demographics
   SET race_ethnicity = NULL,
       race_ethnicity_established_at = NULL,
       updated_at = now()
 WHERE race_ethnicity IS NOT NULL
   AND cardinality(race_ethnicity) = 0;

ALTER TABLE public.user_demographics DROP CONSTRAINT IF EXISTS race_ethnicity_valid;
ALTER TABLE public.user_demographics
  ADD CONSTRAINT race_ethnicity_valid
  CHECK (
    race_ethnicity IS NULL
    OR (
      cardinality(race_ethnicity) > 0
      AND race_ethnicity <@ ARRAY[
        'american_indian_or_alaska_native',
        'asian',
        'black_or_african_american',
        'hispanic_or_latino',
        'middle_eastern_or_north_african',
        'native_hawaiian_or_other_pacific_islander',
        'white',
        'other',
        'prefer_not_to_say'
      ]::text[]
    )
  );

-- Belt-and-suspenders: the write RPC now also rejects an empty
-- array up front, so a malformed client can't tie up a CHECK
-- violation traceback in the logs.
CREATE OR REPLACE FUNCTION public.set_my_optional_demographics(
  p_gender  text,
  p_race    text[],
  p_consent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_race_already_set boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Normalize an empty array to NULL so the CHECK doesn't have to
  -- shoulder that case and the row's meaning is unambiguous:
  -- NULL = "not provided", non-empty array = user's selections.
  IF p_race IS NOT NULL AND cardinality(p_race) = 0 THEN
    p_race := NULL;
  END IF;

  SELECT (race_ethnicity_established_at IS NOT NULL)
    INTO v_race_already_set
  FROM public.user_demographics
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'age_gate_not_completed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_demographics
     SET gender_identity   = p_gender,
         gender_updated_at = CASE
                               WHEN p_gender IS DISTINCT FROM gender_identity
                                 THEN now()
                               ELSE gender_updated_at
                             END,
         race_ethnicity = CASE
                            WHEN v_race_already_set THEN race_ethnicity
                            ELSE p_race
                          END,
         race_ethnicity_established_at = CASE
                            WHEN v_race_already_set THEN race_ethnicity_established_at
                            WHEN p_race IS NOT NULL THEN now()
                            ELSE race_ethnicity_established_at
                          END,
         optional_step_completed_at = COALESCE(optional_step_completed_at, now()),
         updated_at = now()
   WHERE user_id = v_uid;

  INSERT INTO public.user_consent_states (user_id, consent_demographic_analytics)
  VALUES (v_uid, COALESCE(p_consent, false))
  ON CONFLICT (user_id) DO UPDATE
    SET consent_demographic_analytics = COALESCE(EXCLUDED.consent_demographic_analytics, false),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_optional_demographics(text, text[], boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_my_optional_demographics(text, text[], boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_optional_demographics(text, text[], boolean) TO authenticated;
