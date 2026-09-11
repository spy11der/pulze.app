-- Convert legacy full Storage URLs stored in the DB into raw object
-- paths. The `avatars` and `check-in-photos` buckets flip to private
-- in the next migration, so any /object/public/... URL still held here
-- would 403 at read time. The regex captures the public / sign /
-- authenticated URL shapes that Supabase's own Storage endpoints emit,
-- so re-runs on already-clean paths are no-ops.

UPDATE public.check_ins
SET photo_url = regexp_replace(
  photo_url,
  '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/check-in-photos/',
  ''
)
WHERE photo_url ~ '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/check-in-photos/';

UPDATE public.profiles
SET avatar_url = regexp_replace(
  avatar_url,
  '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/avatars/',
  ''
)
WHERE avatar_url ~ '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/avatars/';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{avatar_url}',
  to_jsonb(regexp_replace(
    raw_user_meta_data->>'avatar_url',
    '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/avatars/',
    ''
  ))
)
WHERE (raw_user_meta_data->>'avatar_url') ~ '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/avatars/';
