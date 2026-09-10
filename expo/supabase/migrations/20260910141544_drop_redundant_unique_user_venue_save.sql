-- Saved Venues is a binary (user, venue) relationship for the MVP. The
-- earlier UNIQUE (user_id, venue_id, save_type) constraint named
-- unique_user_venue_save was more permissive than the invariant we
-- actually want and is now redundant with the stricter
-- user_venue_saves_user_id_venue_id_key added in
-- 20260910135523_user_venue_saves_unique_user_venue. Dropping it so
-- there's a single source of truth for the uniqueness rule.

ALTER TABLE public.user_venue_saves
  DROP CONSTRAINT IF EXISTS unique_user_venue_save;
