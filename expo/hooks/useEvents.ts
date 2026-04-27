import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { EventSource, Tables } from '@/types/supabase';
import { calcLiveliness, sumActiveListings } from '@/utils/liveliness';
import { pickBestImage, type EventImageLike } from '@/utils/eventImage';

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
  heroImageUrl: string | null;
  capacity: number | null;
  activeListings: number;
  liveliness: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  recentSales: number;
  isHot: boolean;
  isSellingFast: boolean;
  isTrending: boolean;
}

export interface EventDetail extends Tables<'events'> {
  details: Tables<'event_details'> | null;
  images: Tables<'event_images'>[];
  heroImageUrl: string | null;
  capacity: number | null;
  venueLat: number | null;
  venueLng: number | null;
  activeListings: number;
  liveliness: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  recentSales: number;
  salesVelocity: number;
  isHot: boolean;
  isSellingFast: boolean;
  isTrending: boolean;
}

const STALE_MAP = 10 * 60 * 1000;
const STALE_FEED = 5 * 60 * 1000;
const STALE_DETAIL = 2 * 60 * 1000;

const IMG_SELECT = 'url, ratio, width, height';

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
          event_images ( ${IMG_SELECT} )
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
        event_images: EventImageLike[] | EventImageLike | null;
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
            imageUrl: pickBestImage(imgs, 'card'),
          };
        })
        .filter((x): x is MapEventItem => x !== null);
    },
    staleTime: STALE_MAP,
    gcTime: 30 * 60 * 1000,
  });
}

interface FeedRow {
  id: string;
  name: string;
  venue_name: string | null;
  venue_city: string | null;
  source: EventSource;
  start_date_time: string;
  event_images: EventImageLike[] | EventImageLike | null;
}

interface VenueCapMap { capacity: number | null }

async function enrichEvents(rows: FeedRow[]): Promise<FeedEventItem[]> {
  const venueNames = Array.from(
    new Set(rows.map((r) => r.venue_name).filter((n): n is string => !!n)),
  );

  const venuesByName = new Map<string, VenueCapMap>();
  if (venueNames.length > 0) {
    const { data: venues } = await supabase
      .from('venues')
      .select('name, capacity')
      .in('name', venueNames);
    for (const v of venues ?? []) {
      venuesByName.set(v.name, { capacity: v.capacity });
    }
  }

  const eventIds = rows.map((r) => r.id);
  const listingsByEvent = new Map<string, { quantity: number | null; price: number | null }[]>();
  const salesByEvent = new Map<string, number>();

  if (eventIds.length > 0) {
    const { data: listings } = await supabase
      .from('listings')
      .select('event_id, quantity, price')
      .in('event_id', eventIds)
      .eq('active', true);
    for (const l of listings ?? []) {
      const arr = listingsByEvent.get(l.event_id) ?? [];
      arr.push({ quantity: l.quantity, price: l.price });
      listingsByEvent.set(l.event_id, arr);
    }

    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const { data: sales } = await supabase
      .from('sales')
      .select('event_id, quantity, timestamp')
      .in('event_id', eventIds)
      .gte('timestamp', sevenDaysAgo);
    for (const s of sales ?? []) {
      salesByEvent.set(s.event_id, (salesByEvent.get(s.event_id) ?? 0) + (s.quantity ?? 0));
    }
  }

  return rows.map((row): FeedEventItem => {
    const imgs = Array.isArray(row.event_images) ? row.event_images : row.event_images ? [row.event_images] : [];
    const capacity = row.venue_name ? venuesByName.get(row.venue_name)?.capacity ?? null : null;
    const ls = listingsByEvent.get(row.id) ?? [];
    const activeListings = sumActiveListings(ls.map((l) => ({ active: true, quantity: l.quantity })));
    const prices = ls.map((l) => l.price).filter((p): p is number => typeof p === 'number' && p > 0);
    const liveliness = calcLiveliness(capacity, activeListings);
    const recentSales = salesByEvent.get(row.id) ?? 0;
    const salesVelocity = recentSales / 7;

    const isHot = liveliness !== null ? liveliness >= 95 : false;
    const isSellingFast = liveliness !== null ? liveliness >= 80 : false;
    const isTrending = recentSales >= 25 || salesVelocity >= 5;

    return {
      id: row.id,
      name: row.name,
      venueName: row.venue_name,
      city: row.venue_city,
      source: row.source,
      date: new Date(row.start_date_time),
      imageUrl: pickBestImage(imgs, 'card'),
      heroImageUrl: pickBestImage(imgs, 'hero'),
      capacity,
      activeListings,
      liveliness,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      recentSales,
      isHot,
      isSellingFast,
      isTrending,
    };
  });
}

export function useEventFeed(limit: number = 50) {
  return useQuery<FeedEventItem[]>({
    queryKey: ['event-feed', limit],
    queryFn: async () => {
      console.log('[useEventFeed] fetching');
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          venue_name,
          venue_city,
          source,
          start_date_time,
          event_images ( ${IMG_SELECT} )
        `)
        .gte('start_date_time', new Date().toISOString())
        .order('start_date_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.log('[useEventFeed] error:', error.message);
        throw error;
      }

      return enrichEvents((data ?? []) as unknown as FeedRow[]);
    },
    staleTime: STALE_FEED,
  });
}

/**
 * Returns up to `count` randomly-selected upcoming events (used for "Hot Right Now" carousel).
 * Pulls a wider pool then samples client-side to avoid PostgREST random ordering.
 */
export function useHotEvents(count: number = 10, pool: number = 80) {
  return useQuery<FeedEventItem[]>({
    queryKey: ['hot-events', count, pool],
    queryFn: async () => {
      console.log('[useHotEvents] fetching');
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          venue_name,
          venue_city,
          source,
          start_date_time,
          event_images ( ${IMG_SELECT} )
        `)
        .gte('start_date_time', new Date().toISOString())
        .order('start_date_time', { ascending: true })
        .limit(pool);

      if (error) {
        console.log('[useHotEvents] error:', error.message);
        throw error;
      }

      const rows = (data ?? []) as unknown as FeedRow[];
      const enriched = await enrichEvents(rows);
      const shuffled = [...enriched].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
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
        .filter((p): p is number => typeof p === 'number' && p > 0);

      const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      const { data: sales } = await supabase
        .from('sales')
        .select('quantity')
        .eq('event_id', eventId)
        .gte('timestamp', sevenDaysAgo);
      const recentSales = (sales ?? []).reduce((s, x) => s + (x.quantity ?? 0), 0);
      const salesVelocity = recentSales / 7;

      const liveliness = calcLiveliness(capacity, activeListings);
      const isHot = liveliness !== null ? liveliness >= 95 : false;
      const isSellingFast = liveliness !== null ? liveliness >= 80 : false;
      const isTrending = recentSales >= 25 || salesVelocity >= 5;

      return {
        ...row,
        details,
        images,
        heroImageUrl: pickBestImage(images, 'hero'),
        capacity,
        venueLat: details?.venue_latitude ?? null,
        venueLng: details?.venue_longitude ?? null,
        activeListings,
        liveliness,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        recentSales,
        salesVelocity,
        isHot,
        isSellingFast,
        isTrending,
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
        .select(`id, name, venue_name, venue_city, source, start_date_time, event_images(${IMG_SELECT})`)
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
        event_images: EventImageLike[] | EventImageLike | null;
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
          imageUrl: pickBestImage(imgs, 'card'),
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

/**
 * Lightweight summary helpers for surfacing events in the legacy "Featured" card on the home tab.
 */
export function useFeaturedEvent() {
  const feed = useEventFeed(20);
  const featured = useMemo(() => {
    const items = feed.data ?? [];
    if (items.length === 0) return null;
    const withImages = items.filter((i) => i.heroImageUrl || i.imageUrl);
    const list = withImages.length > 0 ? withImages : items;
    const hot = list.find((i) => i.isHot) ?? list.find((i) => i.isSellingFast) ?? list[0];
    return hot ?? null;
  }, [feed.data]);

  return { featured, isLoading: feed.isLoading, error: feed.error as Error | null };
}
