-- ============================================
-- #5: check_ins needs to actually hold the check-in content
-- (photo, caption, stamp position) since vibes/vibe_posts are gone
-- ============================================
ALTER TABLE public.check_ins
  ADD COLUMN photo_url TEXT,
  ADD COLUMN caption TEXT,
  ADD COLUMN stamp_x DOUBLE PRECISION,
  ADD COLUMN stamp_y DOUBLE PRECISION,
  ADD COLUMN stamp_scale DOUBLE PRECISION DEFAULT 1.0;

-- ============================================
-- #9: Storage buckets — check-in photos and profile avatars
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('check-in-photos', 'check-in-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view photos (they're public check-ins/avatars by nature of the feature)
CREATE POLICY "public_read_checkin_photos" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'check-in-photos');
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'avatars');

-- Users can only upload into their own folder (path convention: {user_id}/filename)
CREATE POLICY "users_upload_own_checkin_photos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'check-in-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users_upload_own_avatars" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- #8: Close-friends tier on user_friendships
-- ============================================
ALTER TABLE public.user_friendships
  ADD COLUMN is_close_friend_a_to_b BOOLEAN DEFAULT false,
  ADD COLUMN is_close_friend_b_to_a BOOLEAN DEFAULT false;
