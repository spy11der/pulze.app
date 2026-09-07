-- Point check_ins.user_id at public.profiles instead of auth.users.
--
-- PostgREST embedded-selects (profiles(username, display_name, avatar_url) in
-- crewFeed.ts's CHECKIN_SELECT) require a DIRECT foreign key to auto-detect
-- the relationship. The previous constraint referenced auth.users only, so
-- the embed threw a relationship error at runtime — silently caught by the
-- fetch helpers and rendered as an empty check-in history / crew feed.
--
-- Cascade safety is preserved: profiles.id itself cascades from auth.users,
-- so deleting an auth account still removes the check-in, via one correct
-- constraint instead of a mismatched one. Applied live 2026-09-07.

ALTER TABLE public.check_ins
  DROP CONSTRAINT IF EXISTS check_ins_user_id_fkey;

ALTER TABLE public.check_ins
  ADD CONSTRAINT check_ins_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
