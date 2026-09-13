-- ============================================================
-- Batch 4B.1: personalization consent epoch.
-- ============================================================
--
-- Problem: after withdrawing personalization consent and later
-- re-granting it, previously retained personalization rows became
-- eligible again. Re-consent should be prospective — only new
-- activity after the latest grant should feed the recommendation
-- input surface.
--
-- Fix:
--   * Add personalization_consent_granted_at timestamptz to
--     user_consent_states.
--   * Rewrite set_my_personalization_consent so it manages the
--     epoch atomically with the flag.
--   * Rewrite personalization_events_eligible so a row is visible
--     ONLY when consent is on AND its server_ts is >= the current
--     grant epoch. NULL epoch (or NULL comparison) means "no
--     current grant" so nothing is eligible.
--
-- Existing users: probed live before migrating.
--   total_consent_rows = 1
--   consent_personalized_recommendations = true count: 0
--   total personalization events in app_events: 0
-- So the backfill affects 0 rows in production. The backfill is
-- written defensively for the general case anyway: for any pre-
-- existing consented user, epoch = min(server_ts) of their
-- personalization events (preserves everything they already had),
-- else now() (defensible migration time for a consented user with
-- no history). No fabricated timestamps.

-- ============================================================
-- 1. Schema
-- ============================================================
ALTER TABLE public.user_consent_states
  ADD COLUMN IF NOT EXISTS personalization_consent_granted_at timestamptz;

COMMENT ON COLUMN public.user_consent_states.personalization_consent_granted_at IS
  'Timestamp of the current personalization-consent grant. NULL means "no current grant" (either never granted or withdrawn). personalization_events_eligible only exposes events at or after this timestamp so re-consent is prospective — previous-period rows do NOT come back.';


-- ============================================================
-- 2. Backfill for any pre-existing consented user.
-- ============================================================
-- The `AND personalization_consent_granted_at IS NULL` guard is
-- what makes this migration idempotent — a re-run leaves any
-- already-set epoch alone.
UPDATE public.user_consent_states ucs
SET personalization_consent_granted_at = COALESCE(
  (SELECT min(ae.server_ts) FROM public.app_events ae
     WHERE ae.user_id = ucs.user_id
       AND ae.purpose = 'personalization'),
  now()
)
WHERE ucs.consent_personalized_recommendations = true
  AND ucs.personalization_consent_granted_at IS NULL;


-- ============================================================
-- 3. Consent RPC — manages the epoch atomically with the flag.
-- ============================================================
--
--   false -> true:   set flag true, stamp granted_at = now()
--   true  -> true:   idempotent; keep existing granted_at
--   true  -> false:  set flag false, clear granted_at
--   false -> false:  no-op
--
-- Still ownership-derived from auth.uid(). Still only touches
-- personalization-specific columns.
CREATE OR REPLACE FUNCTION public.set_my_personalization_consent(p_granted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_new       boolean := COALESCE(p_granted, false);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.user_consent_states (
    user_id,
    consent_personalized_recommendations,
    personalization_consent_granted_at
  )
  VALUES (
    v_uid,
    v_new,
    CASE WHEN v_new THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET consent_personalized_recommendations = v_new,
        personalization_consent_granted_at = CASE
          -- false -> true: fresh epoch
          WHEN v_new AND NOT COALESCE(public.user_consent_states.consent_personalized_recommendations, false)
            THEN now()
          -- true -> true: preserve
          WHEN v_new AND COALESCE(public.user_consent_states.consent_personalized_recommendations, false)
            THEN public.user_consent_states.personalization_consent_granted_at
          -- any -> false: clear
          ELSE NULL
        END,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_personalization_consent(boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_my_personalization_consent(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_personalization_consent(boolean) TO authenticated;

COMMENT ON FUNCTION public.set_my_personalization_consent(boolean) IS
  'Narrow write path for consent_personalized_recommendations + personalization_consent_granted_at. Sets a fresh grant epoch on false->true; preserves on true->true (idempotent); clears on true->false. Ownership from auth.uid(). anon has no access. Withdrawing stops future personalization writes AND makes existing rows invisible via personalization_events_eligible.';


-- ============================================================
-- 4. Eligible view — enforce the epoch.
-- ============================================================
-- Same shape as Batch 4A.1's view; adds the server_ts >= epoch
-- guard. NULL epoch collapses the comparison to NULL, which the
-- WHERE clause treats as false, so a consented-but-epoch-null row
-- (shouldn't happen with the RPC, but defensive) exposes nothing.
-- security_invoker preserved; REVOKE from anon/authenticated
-- preserved; service_role SELECT preserved.
DROP VIEW IF EXISTS public.personalization_events_eligible;
CREATE VIEW public.personalization_events_eligible
WITH (security_invoker = true) AS
SELECT
  ae.id,
  ae.user_id,
  ae.event_type,
  ae.subject_type,
  ae.subject_id,
  ae.properties,
  ae.client_ts,
  ae.server_ts
FROM public.app_events ae
JOIN public.user_consent_states ucs
  ON ucs.user_id = ae.user_id
WHERE ae.purpose = 'personalization'
  AND ucs.consent_personalized_recommendations = true
  AND ucs.personalization_consent_granted_at IS NOT NULL
  AND ae.server_ts >= ucs.personalization_consent_granted_at;

COMMENT ON VIEW public.personalization_events_eligible IS
  'Consent-gated read path for future recommendation systems. Adds prospective re-consent enforcement: rows are visible only when the user currently consents AND the event fired on or after the current personalization_consent_granted_at epoch. Withdraw + re-grant does NOT resurrect previous-period rows.';

REVOKE ALL ON public.personalization_events_eligible FROM PUBLIC;
REVOKE ALL ON public.personalization_events_eligible FROM anon;
REVOKE ALL ON public.personalization_events_eligible FROM authenticated;
GRANT SELECT ON public.personalization_events_eligible TO service_role;

-- get_personalization_features_for_user is unchanged: it already
-- reads only from personalization_events_eligible, so the epoch
-- rule automatically applies to the recommendation-input surface.
-- Do not add a second consent check inside the RPC — the view is
-- the single source of truth.
