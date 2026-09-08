DROP POLICY IF EXISTS "users_read_visible_checkins" ON public.check_ins;

CREATE POLICY "users_read_visible_checkins" ON public.check_ins FOR SELECT TO authenticated
  USING (
    is_deleted = false AND (
      visibility = 'public'
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id_a = check_ins.user_id AND f.user_id_b = auth.uid() AND f.is_close_friend_a_to_b)
            OR (f.user_id_b = check_ins.user_id AND f.user_id_a = auth.uid() AND f.is_close_friend_b_to_a)
          )
      )
    )
  );
