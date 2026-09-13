-- Batch 3: optional demographic fields + explicit demographic-analytics consent.
--
-- Adds gender_identity (single-value, freely editable) and
-- race_ethnicity (multi-value, one-shot) to the existing owner-only
-- user_demographics row created by the DOB gate. Adds
-- consent_demographic_analytics to user_consent_states so
-- downstream analytics readers have a single boolean to gate on.
--
-- Small-cohort rule (design constraint for the future analytics
-- engine, deliberately NOT implemented in this batch): demographic
-- breakdowns must not expose cohorts smaller than 20. Small groups
-- must be suppressed or truthfully combined into an appropriately
-- labeled broader reporting category. NEVER relabel identities to
-- reach the threshold — a small Transgender Woman cohort is not
-- reported as Woman.

-- ============================================================
-- 1. Extend user_demographics.
-- ============================================================
ALTER TABLE public.user_demographics
  ADD COLUMN IF NOT EXISTS gender_identity               text,
  ADD COLUMN IF NOT EXISTS race_ethnicity                text[],
  ADD COLUMN IF NOT EXISTS gender_updated_at             timestamptz,
  ADD COLUMN IF NOT EXISTS race_ethnicity_established_at timestamptz,
  ADD COLUMN IF NOT EXISTS optional_step_completed_at    timestamptz;

-- Gender enum via CHECK (immutable, no lookup table needed).
ALTER TABLE public.user_demographics DROP CONSTRAINT IF EXISTS gender_identity_valid;
ALTER TABLE public.user_demographics
  ADD CONSTRAINT gender_identity_valid
  CHECK (
    gender_identity IS NULL
    OR gender_identity IN (
      'man',
      'woman',
      'trans_man',
      'trans_woman',
      'nonbinary',
      'other',
      'prefer_not_to_say'
    )
  );

-- Race is multi-select: NULL means "not provided", non-empty array
-- means "these are my selections". The <@ subset test is IMMUTABLE
-- so it's valid inside a CHECK constraint. NOTE: the array_length()
-- form used here has a subtle NULL propagation problem for empty
-- arrays — see the follow-up migration
-- fix_race_ethnicity_empty_array_check.sql which switches to
-- cardinality() and also normalizes empty arrays to NULL in the
-- write RPC.
ALTER TABLE public.user_demographics DROP CONSTRAINT IF EXISTS race_ethnicity_valid;
ALTER TABLE public.user_demographics
  ADD CONSTRAINT race_ethnicity_valid
  CHECK (
    race_ethnicity IS NULL
    OR (
      array_length(race_ethnicity, 1) > 0
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

-- No new RLS policy on user_demographics. All writes still go
-- through SECURITY DEFINER RPCs so we can enforce the "gender
-- editable, race one-shot, DOB immutable" rule at the write layer
-- rather than trying to encode it in RLS. The client cannot PATCH
-- this table via PostgREST at all (no UPDATE policy exists) —
-- exactly what protects DOB from being overwritten.

COMMENT ON COLUMN public.user_demographics.gender_identity IS
  'Voluntarily supplied gender identity. Freely editable by the owner via update_my_gender_identity(). One value; NULL means "not provided".';
COMMENT ON COLUMN public.user_demographics.race_ethnicity IS
  'Voluntarily supplied race/ethnicity selections. One-shot: once set, only pulze support can correct it (no self-service update RPC). Never inferred from name, location, behavior, photos, voice, friends, or any other data.';


-- ============================================================
-- 2. Explicit demographic-analytics consent.
-- ============================================================
ALTER TABLE public.user_consent_states
  ADD COLUMN IF NOT EXISTS consent_demographic_analytics boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_consent_states.consent_demographic_analytics IS
  'Explicit opt-in for Pulze to use the voluntarily provided demographic fields in aggregated nightlife/neighborhood analytics. Default OFF. Withdrawing stops future analytics use but does not delete the underlying demographic row. Historical aggregates that no longer tie back to this account may remain.';


-- ============================================================
-- 3. Write RPCs.
-- ============================================================

-- set_my_optional_demographics: called from the onboarding step or,
-- once, from Settings if the user chose to fill in what they'd
-- skipped. Race honors the one-shot rule (silently keeps the old
-- value if already established). Gender is treated as a fresh value
-- and gender_updated_at bumps if the caller changed it. Consent is
-- upserted through the existing user_consent_states table.
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

  SELECT (race_ethnicity_established_at IS NOT NULL)
    INTO v_race_already_set
  FROM public.user_demographics
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    -- Demographic row is created by set_my_date_of_birth. If it's
    -- missing the user hasn't cleared the age gate yet.
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


-- mark_optional_demographics_skipped: flips the "step seen" flag so
-- the router stops showing the screen. Does not write any
-- demographic values and does not grant consent.
CREATE OR REPLACE FUNCTION public.mark_optional_demographics_skipped()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  UPDATE public.user_demographics
     SET optional_step_completed_at = COALESCE(optional_step_completed_at, now()),
         updated_at = now()
   WHERE user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_optional_demographics_skipped() FROM public;
REVOKE ALL ON FUNCTION public.mark_optional_demographics_skipped() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_optional_demographics_skipped() TO authenticated;


-- update_my_gender_identity: gender is the one field freely editable
-- after establishment. NULL clears the value.
CREATE OR REPLACE FUNCTION public.update_my_gender_identity(p_gender text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  UPDATE public.user_demographics
     SET gender_identity   = p_gender,
         gender_updated_at = now(),
         updated_at        = now()
   WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'age_gate_not_completed' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_gender_identity(text) FROM public;
REVOKE ALL ON FUNCTION public.update_my_gender_identity(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_my_gender_identity(text) TO authenticated;

-- Deliberately NOT provided: update_my_race_ethnicity(). Race is a
-- one-shot field on this schema. Corrections go through Pulze
-- support (contact@pulze.pro) so identity relabeling can't be
-- automated by a client.


-- set_my_demographic_analytics_consent: the toggle called from
-- Settings. Kept as a SECURITY DEFINER RPC (rather than a raw
-- upsert against user_consent_states) so the write path is
-- parallel to the other demographic RPCs.
CREATE OR REPLACE FUNCTION public.set_my_demographic_analytics_consent(p_granted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  INSERT INTO public.user_consent_states (user_id, consent_demographic_analytics)
  VALUES (v_uid, COALESCE(p_granted, false))
  ON CONFLICT (user_id) DO UPDATE
    SET consent_demographic_analytics = COALESCE(EXCLUDED.consent_demographic_analytics, false),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_demographic_analytics_consent(boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_my_demographic_analytics_consent(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_demographic_analytics_consent(boolean) TO authenticated;

COMMENT ON FUNCTION public.set_my_demographic_analytics_consent(boolean) IS
  'Toggle the demographic-analytics consent flag. Withdrawing (p_granted=false) stops future analytics use of this account''s demographic fields but does NOT delete the underlying user_demographics row.';
