-- user_venue_saves has no natural unique key today. Adding UNIQUE
-- (user_id, venue_id) enables idempotent saves — the client can retry
-- or use upsert(onConflict='user_id,venue_id', ignoreDuplicates=true)
-- without inserting duplicate rows. The one-shot AsyncStorage->Supabase
-- migration for legacy pulze_favorites_v1 relies on this to be safely
-- retryable on partial-failure networks. Table is currently empty, so
-- no dedupe pass required before applying the constraint.

ALTER TABLE public.user_venue_saves
  ADD CONSTRAINT user_venue_saves_user_id_venue_id_key UNIQUE (user_id, venue_id);
