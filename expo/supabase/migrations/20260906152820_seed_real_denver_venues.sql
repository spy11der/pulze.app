ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS legacy_mock_id TEXT UNIQUE;

INSERT INTO public.venues (name, category, city, latitude, longitude, legacy_mock_id, is_active)
VALUES
  ('Death & Co', 'speakeasy', 'Denver', 39.7594, -104.9815, 'v-001', true),
  ('Milk Bar', 'bar', 'Denver', 39.7325, -104.9875, 'v-002', true),
  ('Temple Nightclub', 'club', 'Denver', 39.7344, -104.9878, 'v-003', true),
  ('Avanti F&B', 'rooftop', 'Denver', 39.7625, -105.0066, 'v-004', true),
  ('The Cruise Room', 'lounge', 'Denver', 39.7526, -104.9972, 'v-005', true),
  ('Larimer Lounge', 'bar', 'Denver', 39.7587, -104.9828, 'v-006', true),
  ('Church Nightclub', 'club', 'Denver', 39.7348, -104.9866, 'v-007', true),
  ('Williams & Graham', 'speakeasy', 'Denver', 39.7619, -105.0113, 'v-008', true),
  ('Beacon RiNo', 'bar', 'Denver', 39.7608, -104.9838, 'v-009', true),
  ('Bar Standard', 'club', 'Denver', 39.7318, -104.9872, 'v-010', true),
  ('The Golden Mill', 'brewery', 'Golden', 39.7570, -105.2220, 'v-011', false),
  ('The Meadowlark', 'dive', 'Denver', 39.7585, -104.9832, 'v-012', true)
ON CONFLICT (legacy_mock_id) DO NOTHING;
