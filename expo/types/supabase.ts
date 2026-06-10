export type EventSource = 'ticketmaster' | 'seatdata';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          phone: string;
          bio: string;
          location: string;
          avatar_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string;
          email?: string;
          phone?: string;
          bio?: string;
          location?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          email?: string;
          phone?: string;
          bio?: string;
          location?: string;
          avatar_url?: string;
          updated_at?: string;
        };
      };
      vibes: {
        Row: {
          id: string;
          user_id: string;
          privacy: string;
          energy: number;
          caption: string;
          venue: string;
          neighborhood: string;
          vibe_label: string;
          tags: Record<string, string[]>;
          media_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          privacy?: string;
          energy?: number;
          caption?: string;
          venue?: string;
          neighborhood?: string;
          vibe_label?: string;
          tags?: Record<string, string[]>;
          media_url?: string;
          created_at?: string;
        };
        Update: {
          privacy?: string;
          energy?: number;
          caption?: string;
          venue?: string;
          neighborhood?: string;
          vibe_label?: string;
          tags?: Record<string, string[]>;
          media_url?: string;
        };
      };
      saved_spots: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          name: string;
          category: string;
          neighborhood: string;
          note: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          name: string;
          category?: string;
          neighborhood?: string;
          note?: string;
          saved_at?: string;
        };
        Update: {
          venue_id?: string;
          name?: string;
          category?: string;
          neighborhood?: string;
          note?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          category: string;
          vibe_score: number;
          open_status: string;
          address: string;
          neighborhood: string;
          capacity: number | null;
          music_style: string | null;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          latitude: number;
          longitude: number;
          category?: string;
          vibe_score?: number;
          open_status?: string;
          address?: string;
          neighborhood?: string;
          capacity?: number | null;
          music_style?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          latitude?: number;
          longitude?: number;
          category?: string;
          vibe_score?: number;
          open_status?: string;
          address?: string;
          neighborhood?: string;
          capacity?: number | null;
          music_style?: string | null;
          website?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          name: string;
          url: string | null;
          start_date_time: string;
          venue_name: string | null;
          venue_city: string | null;
          venue_state: string | null;
          postal_code: string | null;
          source: EventSource;
          ticketmaster_id: string | null;
          seatdata_id: string | null;
          dedupe_key: string;
          raw_json: Record<string, unknown> | null;
          inserted_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          url?: string | null;
          start_date_time: string;
          venue_name?: string | null;
          venue_city?: string | null;
          venue_state?: string | null;
          postal_code?: string | null;
          source: EventSource;
          ticketmaster_id?: string | null;
          seatdata_id?: string | null;
          dedupe_key: string;
          raw_json?: Record<string, unknown> | null;
          inserted_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          url?: string | null;
          start_date_time?: string;
          venue_name?: string | null;
          venue_city?: string | null;
          venue_state?: string | null;
          postal_code?: string | null;
          source?: EventSource;
          ticketmaster_id?: string | null;
          seatdata_id?: string | null;
          dedupe_key?: string;
          raw_json?: Record<string, unknown> | null;
          updated_at?: string;
        };
      };
      event_details: {
        Row: {
          id: string;
          description: string | null;
          info: string | null;
          venue_latitude: number | null;
          venue_longitude: number | null;
          venue_id: string | null;
          venue_address: string | null;
          venue_state_code: string | null;
          venue_country_code: string | null;
          timezone: string | null;
          status_code: string | null;
          local_date: string | null;
          local_time: string | null;
          seatmap_static_url: string | null;
          accessibility_info: string | null;
          ticket_limit_info: string | null;
          raw_json: Record<string, unknown> | null;
          inserted_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          description?: string | null;
          info?: string | null;
          venue_latitude?: number | null;
          venue_longitude?: number | null;
          venue_id?: string | null;
          venue_address?: string | null;
          venue_state_code?: string | null;
          venue_country_code?: string | null;
          timezone?: string | null;
          status_code?: string | null;
          local_date?: string | null;
          local_time?: string | null;
          seatmap_static_url?: string | null;
          accessibility_info?: string | null;
          ticket_limit_info?: string | null;
          raw_json?: Record<string, unknown> | null;
          inserted_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_details']['Insert']>;
      };
      event_images: {
        Row: {
          id: number;
          event_id: string;
          url: string;
          ratio: string | null;
          width: number | null;
          height: number | null;
          fallback: boolean | null;
          inserted_at: string;
        };
        Insert: {
          id?: number;
          event_id: string;
          url: string;
          ratio?: string | null;
          width?: number | null;
          height?: number | null;
          fallback?: boolean | null;
          inserted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_images']['Insert']>;
      };
      listings: {
        Row: {
          id: number;
          event_id: string;
          listing_id: number;
          active: boolean;
          zone: string | null;
          section: string | null;
          row: string | null;
          quantity_start: number | null;
          quantity: number | null;
          price: number | null;
          snapshot_timestamp: number | null;
          inserted_at: string;
        };
        Insert: {
          id?: number;
          event_id: string;
          listing_id: number;
          active?: boolean;
          zone?: string | null;
          section?: string | null;
          row?: string | null;
          quantity_start?: number | null;
          quantity?: number | null;
          price?: number | null;
          snapshot_timestamp?: number | null;
          inserted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listings']['Insert']>;
      };
      sales: {
        Row: {
          id: number;
          event_id: string;
          timestamp: number;
          quantity: number | null;
          price: number | null;
          zone: string | null;
          section: string | null;
          row: string | null;
          inserted_at: string;
        };
        Insert: {
          id?: number;
          event_id: string;
          timestamp: number;
          quantity?: number | null;
          price?: number | null;
          zone?: string | null;
          section?: string | null;
          row?: string | null;
          inserted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          venue_name: string;
          neighborhood: string;
          photo_url: string | null;
          photo_visibility: boolean;
          quip: string | null;
          captured_at: string;
          inserted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          venue_name: string;
          neighborhood: string;
          photo_url?: string | null;
          photo_visibility?: boolean;
          quip?: string | null;
          captured_at?: string;
          inserted_at?: string;
        };
        Update: {
          photo_visibility?: boolean;
          quip?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
