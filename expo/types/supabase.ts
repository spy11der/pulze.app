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
          updated_at?: string;
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
