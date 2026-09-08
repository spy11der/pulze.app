-- 0003_provider_integration_schema.sql
-- Already applied directly to the live Supabase project. This file exists
-- for repo history/consistency with the existing migration-tracking
-- convention — do not re-run manually.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS price_level integer;

CREATE TABLE public.venue_provider_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('foursquare','google','besttime','scrapingbee')),
  provider_venue_id text NOT NULL,
  raw_metadata jsonb,
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_venue_id)
);
CREATE INDEX venue_provider_links_venue_id_idx ON public.venue_provider_links (venue_id);

CREATE TABLE public.venue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('provider','user')),
  provider text CHECK (provider IS NULL OR provider IN ('foursquare','google','besttime','scrapingbee')),
  provider_photo_id text,
  provider_photo_metadata jsonb,
  resolved_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venue_photos_venue_id_idx ON public.venue_photos (venue_id);
CREATE UNIQUE INDEX venue_photos_provider_photo_key
  ON public.venue_photos (provider, provider_photo_id)
  WHERE provider IS NOT NULL AND provider_photo_id IS NOT NULL;

ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_venue_photos" ON public.venue_photos FOR SELECT TO authenticated USING (true);
