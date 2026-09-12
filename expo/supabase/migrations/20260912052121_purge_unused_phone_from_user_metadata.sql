-- Remove the `phone` key from auth.users.raw_user_meta_data.
--
-- Signup previously collected an optional phone number into user
-- metadata but the app never read it. The paired client change drops
-- the field from the signup form and from the AuthProvider payload;
-- this migration cleans up existing rows so no lingering PII stays.
--
-- The `jsonb - text` operator preserves every other key in the object
-- (including Supabase-managed keys like `sub`, `email_verified`, and
-- `phone_verified` — the latter is a separate Supabase-set flag,
-- unrelated to our custom `phone` field). Supabase's real auth phone
-- column (auth.users.phone / phone_confirmed_at) is intentionally
-- untouched — verified as empty for all users prior to this run.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'phone'
WHERE raw_user_meta_data ? 'phone';
