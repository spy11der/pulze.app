import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { EventSource, Tables } from '@/types/supabase';
import { calcLiveliness, sumActiveListings } from '@/utils/liveliness';

export interface MapEventItem {
  id: string;
  name: string;
  venueName: string | null;
  city: string | null;
  source: EventSource;
  latitude: number;
  longitude: number;
  date: Date;
  imageUrl: string | null;
}

export interface FeedEventItem {
  id: string;
  name: string;
  venueName: string | null;
  city: string | null;
  source: EventSource;
  date: Date;
  imageUrl: string | null;
  capacity: number | null;
  activeListings: number;
  liveliness: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface EventDetail extends Tables<'events'> {
  details: Tables<'event_details'> | null;
  images: Tables<'event_images'>[];
  capacity: number | null;
  venueLat: number | null;
  venueLng: number | null;
  activeListings: number;
  liveliness: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  recentSales: number;
}

const STALE_MAP = 10 * 60 * 1000;
const STALE_FEED = 5 * 60 * 1000;
const STALE_DETAIL = 2 * 60 * 1000;

export function useMapEvents(limit: number = 200) {
  return useQuery<MapEventItem[]>({
    queryKey: ['map-events', limit],
    queryFn: async () => {
      console.log('[useMapEvents] fetching');
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          start_date_time,
          venue_name,
          venue_city,
          source,
          event_details!inner ( venue_latitude, venue_longitude ),
          event_images ( url )
        `)
        .gte('start_date_time', new Date().toISOString())
        .not('event_details.venue_latitude', 'is', null)
        .not('event_details.venue_longitude', 'is', null)
        .order('start_date_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.log('[useMapEvents] error:', error.message);
        throw error;
      }

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        name: string;
        start_date_time: string;
        venue_name: string | null;
        venue_city: string | null;
        source: EventSource;
        event_details: { venue_latitude: number | null; venue_longitude: number | null } | { venue_latitude: number | null; venue_longitude: number | null }[] | null;
        event_images: { url: string }[] | { url: string } | null;
      }>;

      return rows
        .map((row): MapEventItem | null => {
          const ed = Array.isArray(row.event_details) ? row.event_details[0] : row.event_details;
          if (!ed?.venue_latitude || !ed?.venue_longitude) return null;
          const imgs = Array.isArray(row.event_images) ? row.event_images : row.event_images ? [row.event_images] : [];
          return {
            id: row.id,
            name: row.name,
            venueName: row.venue_name,
            city: row.venue_city,
            source: row.source,
            latitude: ed.venue_latitude,
            longitude: ed.venue_longitude,
            date: new Date(row.start_date_time),
            imageUrl: imgs[0]?.url ?? null,
          };
        })
        .filter((x): x is MapEventItem => x !== null);
    },
    staleTime: STALE_MAP,
    gcTime: 30 * 60 * 1000,
  });
}

export function useEventFeed(limit: number = 50) {
  return useQuery<FeedEventItem[]>({
    queryKey: ['event-feed', limit],
    queryFn: async () => {
      console.log('[useEventFeed] fetching');
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          venue_name,
          venue_city,
          source,
          start_date_time,
          event_images ( url )
        `)
        .gte('start_date_time', new Date().toISOString())
        .order('start_date_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.log('[useEventFeed] error:', error.message);
        throw error;
      }

      const rows = (events ?? []) as unknown as Array<{
        id: string;
        name: string;
        venue_name: string | null;
        venue_city: string | null;
        source: EventSource;
        start_date_time: string;
        event_images: { url: string }[] | { url: string } | null;
      }>;

      const venueNames = Array.from(
        new Set(rows.map((r) => r.venue_name).filter((n): n is string => !!n)),
      );

      const venuesByName = new Map<string, number | null>();
      if (venueNames.length > 0) {
        const { data: venues } = await supabase
          .from('venues')
          .select('name, capacity')
          .in('name', venueNames);
        for (const v of venues ?? []) {
          venuesByName.set(v.name, v.capacity);
        }
      }

      const eventIds = rows.map((r) => r.id);
      const listingsByEvent = new Map<string, { active: boolean | null; quantity: number | null; price: number | null }[]>();
      if (eventIds.length > 0) {
        const { data: listings } = await supabase
          .from('listings')
          .select('event_id, active, quantity, price')
          .in('event_id', eventIds)
          .eq('active', true);
        for (const l of listings ?? []) {
          const arr = listingsByEvent.get(l.event_id) ?? [];
          arr.push({ active: l.active, quantity: l.quantity, price: l.price });
          listingsByEvent.set(l.event_id, arr);
        }
      }

      return rows.map((row): FeedEventItem => {
        const imgs = Array.isArray(row.event_images) ? row.event_images : row.event_images ? [row.event_images] : [];
        const capacity = row.venue_name ? venuesByName.get(row.venue_name) ?? null : null;
        const ls = listingsByEvent.get(row.id) ?? [];
        const activeListings = sumActiveListings(ls);
        const prices = ls.map((l) => l.price).filter((p): p is number => typeof p === 'number');
        return {
          id: row.id,
          name: row.name,
          venueName: row.venue_name,
          city: row.venue_city,
          source: row.source,
          date: new Date(row.start_date_time),
          imageUrl: imgs[0]?.url ?? null,
          capacity,
          activeListings,
          liveliness: calcLiveliness(capacity, activeListings),
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
        };
      });
    },
    staleTime: STALE_FEED,
  });
}

export function useEventDetail(eventId: string | null | undefined) {
  return useQuery<EventDetail | null>({
    queryKey: ['event-detail', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return null;
      console.log('[useEventDetail] fetching', eventId);

      const { data: event, error } = await supabase
        .from('events')
        .select(`
          *,
          event_details (*),
          event_images (*)
        `)
        .eq('id', eventId)
        .maybeSingle();

      if (error) {
        console.log('[useEventDetail] error:', error.message);
        throw error;
      }
      if (!event) return null;

      const row = event as unknown as Tables<'events'> & {
        event_details: Tables<'event_details'> | Tables<'event_details'>[] | null;
        event_images: Tables<'event_images'>[] | Tables<'event_images'> | null;
      };

      const details = Array.isArray(row.event_details) ? row.event_details[0] ?? null : row.event_details;
      const images = Array.isArray(row.event_images)
        ? row.event_images
        : row.event_images
          ? [row.event_images]
          : [];

      let capacity: number | null = null;
      if (row.venue_name) {
        const { data: venue } = await supabase
          .from('venues')
          .select('capacity')
          .eq('name', row.venue_name)
          .maybeSingle();
        capacity = venue?.capacity ?? null;
      }

      const { data: listings } = await supabase
        .from('listings')
        .select('quantity, price, active')
        .eq('event_id', eventId)
        .eq('active', true);

      const activeListings = sumActiveListings(listings ?? []);
      const prices = (listings ?? [])
        .map((l) => l.price)
        .filter((p): p is number => typeof p === 'number');

      const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      const { data: sales } = await supabase
        .from('sales')
        .select('quantity')
        .eq('event_id', eventId)
        .gte('timestamp', sevenDaysAgo);
      const recentSales = (sales ?? []).reduce((s, x) => s + (x.quantity ?? 0), 0);

      return {
        ...row,
        details,
        images,
        capacity,
        venueLat: details?.venue_latitude ?? null,
        venueLng: details?.venue_longitude ?? null,
        activeListings,
        liveliness: calcLiveliness(capacity, activeListings),
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        recentSales,
      };
    },
    staleTime: STALE_DETAIL,
  });
}

export interface SearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  source?: EventSource | 'all';
  sortBy?: 'date' | 'name';
}

export interface SearchEventItem {
  id: string;
  name: string;
  venueName: string | null;
  city: string | null;
  source: EventSource;
  date: Date;
  imageUrl: string | null;
}

export function useSearchEvents(filters: SearchFilters) {
  const queryEnabled =
    !!(filters.query && filters.query.trim().length > 0) ||
    !!filters.startDate ||
    !!filters.endDate ||
    (!!filters.source && filters.source !== 'all');

  return useQuery<SearchEventItem[]>({
    queryKey: ['search-events', filters],
    enabled: queryEnabled,
    queryFn: async () => {
      let q = supabase
        .from('events')
        .select(`id, name, venue_name, venue_city, source, start_date_time, event_images(url)`)
        .gte('start_date_time', filters.startDate ?? new Date().toISOString())
        .limit(60);

      if (filters.endDate) q = q.lte('start_date_time', filters.endDate);
      if (filters.source && filters.source !== 'all') q = q.eq('source', filters.source);
      if (filters.query && filters.query.trim()) {
        const term = filters.query.trim().replace(/%/g, '');
        q = q.or(`name.ilike.%${term}%,venue_name.ilike.%${term}%,venue_city.ilike.%${term}%`);
      }
      q = filters.sortBy === 'name'
        ? q.order('name', { ascending: true })
        : q.order('start_date_time', { ascending: true });

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        name: string;
        venue_name: string | null;
        venue_city: string | null;
        source: EventSource;
        start_date_time: string;
        event_images: { url: string }[] | { url: string } | null;
      }>;

      return rows.map((row) => {
        const imgs = Array.isArray(row.event_images) ? row.event_images : row.event_images ? [row.event_images] : [];
        return {
          id: row.id,
          name: row.name,
          venueName: row.venue_name,
          city: row.venue_city,
          source: row.source,
          date: new Date(row.start_date_time),
          imageUrl: imgs[0]?.url ?? null,
        };
      });
    },
    staleTime: 60 * 1000,
  });
}

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [v, setV] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
