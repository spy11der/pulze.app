CREATE POLICY "users_delete_own_friendships" ON public.user_friendships FOR DELETE TO authenticated
  USING (user_id_a = auth.uid() OR user_id_b = auth.uid());
