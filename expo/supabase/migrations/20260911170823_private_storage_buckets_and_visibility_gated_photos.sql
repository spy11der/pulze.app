-- Make both user-facing Storage buckets private. Before this change,
-- Supabase served /object/public/... URLs that bypassed RLS entirely,
-- so anyone with a URL could fetch even a private check-in photo. The
-- existing SELECT policies were role-only and had no effect because
-- the public path never invokes them.
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'check-in-photos');

-- Replace the permissive check-in-photos SELECT policy with one that
-- gates signed-URL creation on the caller's check_ins visibility.
-- check_ins.photo_url now stores raw object paths (see the previous
-- migration), so joining storage.objects.name to check_ins.photo_url
-- is exact. The subquery inherits check_ins' own RLS, which already
-- implements the public / own / inner-circle-close-friend rules.
DROP POLICY IF EXISTS "public_read_checkin_photos" ON storage.objects;

CREATE POLICY "users_read_visible_checkin_photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'check-in-photos' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.check_ins ci
      WHERE ci.photo_url = storage.objects.name
    )
  )
);

-- Avatars: any authenticated Pulze user can view any avatar. This was
-- the intent all along; the previous policy name ("public_read_avatars")
-- was misleading because the bucket was public and the policy was
-- inert. Rename + keep the same allow-all-authenticated rule.
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;

CREATE POLICY "authenticated_read_avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
