DROP FUNCTION IF EXISTS public.rank_nearby_venues(double precision, double precision, integer, text);

CREATE FUNCTION public.rank_nearby_venues(p_user_lat double precision, p_user_lon double precision, p_radius_m integer, p_desired_mode text)
RETURNS TABLE(
  venue_id uuid, venue_name text, category text, city text, distance_m numeric,
  pulze_score numeric, quiet_score numeric, trend_score numeric, confidence_score numeric,
  occupancy_proxy numeric, unique_users_recent numeric, activity_vs_baseline numeric,
  trend_label text, rank_score numeric, score_reason jsonb, legacy_mock_id text
)
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
with p as (
  select st_setsrid(st_makepoint(p_user_lon, p_user_lat), 4326)::geography as user_geo
),
c as (
  select
    v.id as venue_id, v.name as venue_name, v.category, v.city,
    st_distance(v.geom::geography, p.user_geo)::numeric as distance_m,
    s.pulze_score, s.quiet_score, s.trend_score, s.confidence_score, s.occupancy_proxy,
    s.unique_users_recent::numeric as unique_users_recent,
    s.activity_vs_baseline::numeric as activity_vs_baseline,
    s.trend_label, s.score_reason, v.legacy_mock_id
  from public.venues v
  join p on true
  join public.live_venue_scores s on s.venue_id = v.id
  where v.is_active = true
    and st_dwithin(v.geom::geography, p.user_geo, p_radius_m)
),
r as (
  select c.*,
    case
      when lower(p_desired_mode) = 'quiet' then
        (c.quiet_score * 0.62 + c.confidence_score * 0.20
         + (100 - least(c.distance_m / greatest(p_radius_m, 1) * 100, 100)) * 0.12
         + (100 - abs(c.trend_score) * 40) * 0.06)::numeric
      else
        (c.pulze_score * 0.56 + ((c.trend_score + 1) * 50) * 0.18
         + c.confidence_score * 0.16
         + (100 - least(c.distance_m / greatest(p_radius_m, 1) * 100, 100)) * 0.10)::numeric
    end as rank_score
  from c
)
select venue_id, venue_name, category, city, distance_m, pulze_score, quiet_score, trend_score,
  confidence_score, occupancy_proxy, unique_users_recent, activity_vs_baseline, trend_label,
  rank_score, score_reason, legacy_mock_id
from r
order by rank_score desc, distance_m asc;
$$;

REVOKE EXECUTE ON FUNCTION public.rank_nearby_venues(double precision, double precision, integer, text) FROM anon;

CREATE OR REPLACE VIEW public.venues_with_scores AS
SELECT v.id AS venue_id, v.name, v.category, v.city, v.legacy_mock_id, v.is_active,
       s.pulze_score, s.quiet_score, s.trend_label
FROM public.venues v
JOIN public.live_venue_scores s ON s.venue_id = v.id
WHERE v.is_active = true;

DROP FUNCTION IF EXISTS public.handle_smart_geofence(uuid, double precision, double precision, double precision, text, text);

CREATE FUNCTION public.handle_smart_geofence(p_user_id uuid, p_lat double precision, p_lng double precision, p_velocity_mph double precision, p_ble_id text DEFAULT NULL::text, p_wifi_hash text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_venue_id UUID;
    v_venue_name TEXT;
BEGIN
    SELECT id, name INTO v_venue_id, v_venue_name
    FROM venues
    WHERE is_active = true
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, geofence_radius_meters)
    LIMIT 1;

    IF v_venue_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM visit_sessions WHERE user_id = p_user_id AND venue_id = v_venue_id AND exited_at IS NULL) THEN
            INSERT INTO visit_sessions (user_id, venue_id, entered_at)
            VALUES (p_user_id, v_venue_id, NOW());
            RETURN jsonb_build_object('event', 'entered', 'venue_id', v_venue_id, 'venue_name', v_venue_name);
        END IF;
        RETURN jsonb_build_object('event', 'still_inside', 'venue_id', v_venue_id, 'venue_name', v_venue_name);
    ELSE
        UPDATE visit_sessions SET exited_at = NOW() WHERE user_id = p_user_id AND exited_at IS NULL;
        RETURN jsonb_build_object('event', 'exited_all');
    END IF;
END;
$$;
