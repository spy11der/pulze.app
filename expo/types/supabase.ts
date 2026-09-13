export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      algorithm_weights: {
        Row: {
          active_visitor_weight: number | null
          recent_arrival_weight: number | null
          velocity_weight: number | null
          venue_category: string
          vibe_post_weight: number | null
        }
        Insert: {
          active_visitor_weight?: number | null
          recent_arrival_weight?: number | null
          velocity_weight?: number | null
          venue_category: string
          vibe_post_weight?: number | null
        }
        Update: {
          active_visitor_weight?: number | null
          recent_arrival_weight?: number | null
          velocity_weight?: number | null
          venue_category?: string
          vibe_post_weight?: number | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          bucket: string
          count: number
          reset_at: string
        }
        Insert: {
          bucket: string
          count?: number
          reset_at: string
        }
        Update: {
          bucket?: string
          count?: number
          reset_at?: string
        }
        Relationships: []
      }
      bluetooth_proximity_events: {
        Row: {
          created_at: string
          detected_at: string
          id: string
          nearby_device_count: number
          signal_strength_avg: number | null
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          detected_at: string
          id?: string
          nearby_device_count?: number
          signal_strength_avg?: number | null
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          detected_at?: string
          id?: string
          nearby_device_count?: number
          signal_strength_avg?: number | null
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bluetooth_proximity_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "bluetooth_proximity_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "bluetooth_proximity_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "bluetooth_proximity_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluetooth_proximity_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      check_ins: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_deleted: boolean
          photo_url: string | null
          stamp_scale: number | null
          stamp_x: number | null
          stamp_y: number | null
          user_id: string
          venue_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          photo_url?: string | null
          stamp_scale?: number | null
          stamp_x?: number | null
          stamp_y?: number | null
          user_id: string
          venue_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          photo_url?: string | null
          stamp_scale?: number | null
          stamp_x?: number | null
          stamp_y?: number | null
          user_id?: string
          venue_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      consent_audit_log: {
        Row: {
          action: string
          consent_type: string | null
          details: Json | null
          id: number
          purpose: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          action: string
          consent_type?: string | null
          details?: Json | null
          id?: number
          purpose?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          action?: string
          consent_type?: string | null
          details?: Json | null
          id?: number
          purpose?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_presence_cache: {
        Row: {
          created_at: string
          entered_at: string
          entered_venue_at: string
          expires_at: string
          friend_user_id: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          entered_at: string
          entered_venue_at?: string
          expires_at?: string
          friend_user_id: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          entered_venue_at?: string
          expires_at?: string
          friend_user_id?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_presence_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "friend_presence_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "friend_presence_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "friend_presence_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_presence_cache_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      geofence_candidates: {
        Row: {
          distance_m: number | null
          id: string
          last_computed_at: string | null
          priority_score: number | null
          user_id: string
          venue_id: string | null
        }
        Insert: {
          distance_m?: number | null
          id?: string
          last_computed_at?: string | null
          priority_score?: number | null
          user_id: string
          venue_id?: string | null
        }
        Update: {
          distance_m?: number | null
          id?: string
          last_computed_at?: string | null
          priority_score?: number | null
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "geofence_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "geofence_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "geofence_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      location_pings: {
        Row: {
          accuracy_meters: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string | null
          speed_mps: number | null
          user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string | null
          speed_mps?: number | null
          user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          speed_mps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          base_activity_multiplier: number | null
          boundary: unknown
          id: string
          location: unknown
          name: string | null
        }
        Insert: {
          base_activity_multiplier?: number | null
          boundary?: unknown
          id?: string
          location?: unknown
          name?: string | null
        }
        Update: {
          base_activity_multiplier?: number | null
          boundary?: unknown
          id?: string
          location?: unknown
          name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_consent_states: {
        Row: {
          consent_ads_and_tracking: boolean
          consent_core_app: boolean
          consent_location_gps: boolean
          consent_personalized_recommendations: boolean
          consent_proximity_bluetooth: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_ads_and_tracking?: boolean
          consent_core_app?: boolean
          consent_location_gps?: boolean
          consent_personalized_recommendations?: boolean
          consent_proximity_bluetooth?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_ads_and_tracking?: boolean
          consent_core_app?: boolean
          consent_location_gps?: boolean
          consent_personalized_recommendations?: boolean
          consent_proximity_bluetooth?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_demographics: {
        Row: {
          created_at: string
          date_of_birth: string
          established_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          established_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          established_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_friendships: {
        Row: {
          allow_a_sees_b_location: boolean
          allow_b_sees_a_location: boolean
          created_at: string
          id: string
          is_close_friend_a_to_b: boolean | null
          is_close_friend_b_to_a: boolean | null
          status: string
          updated_at: string
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          allow_a_sees_b_location?: boolean
          allow_b_sees_a_location?: boolean
          created_at?: string
          id?: string
          is_close_friend_a_to_b?: boolean | null
          is_close_friend_b_to_a?: boolean | null
          status?: string
          updated_at?: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          allow_a_sees_b_location?: boolean
          allow_b_sees_a_location?: boolean
          created_at?: string
          id?: string
          is_close_friend_a_to_b?: boolean | null
          is_close_friend_b_to_a?: boolean | null
          status?: string
          updated_at?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      user_privacy_prefs: {
        Row: {
          consented_to_privacy_policy_at: string | null
          consented_to_privacy_policy_version: string | null
          created_at: string
          hide_from_friend_presence: boolean
          id: string
          location_retention_days: number
          max_nudges_per_day: number
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consented_to_privacy_policy_at?: string | null
          consented_to_privacy_policy_version?: string | null
          created_at?: string
          hide_from_friend_presence?: boolean
          id?: string
          location_retention_days?: number
          max_nudges_per_day?: number
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consented_to_privacy_policy_at?: string | null
          consented_to_privacy_policy_version?: string | null
          created_at?: string
          hide_from_friend_presence?: boolean
          id?: string
          location_retention_days?: number
          max_nudges_per_day?: number
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_searches: {
        Row: {
          created_at: string
          id: string
          result_clicked_venue_id: string | null
          search_term: string
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_clicked_venue_id?: string | null
          search_term: string
          search_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_clicked_venue_id?: string | null
          search_term?: string
          search_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_searches_result_clicked_venue_id_fkey"
            columns: ["result_clicked_venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_searches_result_clicked_venue_id_fkey"
            columns: ["result_clicked_venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_searches_result_clicked_venue_id_fkey"
            columns: ["result_clicked_venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_searches_result_clicked_venue_id_fkey"
            columns: ["result_clicked_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_searches_result_clicked_venue_id_fkey"
            columns: ["result_clicked_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      user_venue_saves: {
        Row: {
          created_at: string
          id: string
          save_type: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          save_type?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          save_type?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_venue_saves_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_saves_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_saves_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "user_venue_saves_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_venue_saves_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          created_at: string
          id: string
          provider: string | null
          provider_photo_id: string | null
          provider_photo_metadata: Json | null
          resolved_url: string | null
          source: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider?: string | null
          provider_photo_id?: string | null
          provider_photo_metadata?: Json | null
          resolved_url?: string | null
          source: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string | null
          provider_photo_id?: string | null
          provider_photo_metadata?: Json | null
          resolved_url?: string | null
          source?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_provider_links: {
        Row: {
          created_at: string
          id: string
          last_refreshed_at: string
          provider: string
          provider_venue_id: string
          raw_metadata: Json | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_refreshed_at?: string
          provider: string
          provider_venue_id: string
          raw_metadata?: Json | null
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_refreshed_at?: string
          provider?: string
          provider_venue_id?: string
          raw_metadata?: Json | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_provider_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_provider_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_provider_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_provider_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_provider_links_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          ble_beacon_id: string | null
          ble_uuid: string | null
          capacity: number | null
          category: string | null
          city: string | null
          created_at: string | null
          geofence_radius_meters: number | null
          geom: unknown
          hysteresis_buffer_meters: number | null
          id: string
          importance_score: number | null
          is_active: boolean | null
          latitude: number
          legacy_mock_id: string | null
          location: unknown
          longitude: number
          music_style: string | null
          name: string
          neighborhood_id: string | null
          phone: string | null
          price_level: number | null
          rating: number | null
          website: string | null
          wifi_fingerprint: string | null
          wifi_fingerprint_hash: string | null
        }
        Insert: {
          address?: string | null
          ble_beacon_id?: string | null
          ble_uuid?: string | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          geofence_radius_meters?: number | null
          geom?: unknown
          hysteresis_buffer_meters?: number | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          latitude: number
          legacy_mock_id?: string | null
          location?: unknown
          longitude: number
          music_style?: string | null
          name: string
          neighborhood_id?: string | null
          phone?: string | null
          price_level?: number | null
          rating?: number | null
          website?: string | null
          wifi_fingerprint?: string | null
          wifi_fingerprint_hash?: string | null
        }
        Update: {
          address?: string | null
          ble_beacon_id?: string | null
          ble_uuid?: string | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          geofence_radius_meters?: number | null
          geom?: unknown
          hysteresis_buffer_meters?: number | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          latitude?: number
          legacy_mock_id?: string | null
          location?: unknown
          longitude?: number
          music_style?: string | null
          name?: string
          neighborhood_id?: string | null
          phone?: string | null
          price_level?: number | null
          rating?: number | null
          website?: string | null
          wifi_fingerprint?: string | null
          wifi_fingerprint_hash?: string | null
        }
        Relationships: []
      }
      visit_sessions: {
        Row: {
          avg_velocity_mph: number | null
          duration_minutes: number | null
          entered_at: string
          entry_method: string | null
          exited_at: string | null
          id: string
          is_confirmed_dwell: boolean | null
          user_id: string
          venue_id: string | null
        }
        Insert: {
          avg_velocity_mph?: number | null
          duration_minutes?: number | null
          entered_at?: string
          entry_method?: string | null
          exited_at?: string | null
          id?: string
          is_confirmed_dwell?: boolean | null
          user_id: string
          venue_id?: string | null
        }
        Update: {
          avg_velocity_mph?: number | null
          duration_minutes?: number | null
          entered_at?: string
          entry_method?: string | null
          exited_at?: string | null
          id?: string
          is_confirmed_dwell?: boolean | null
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
    }
    Views: {
      avg_dwell_time_view: {
        Row: {
          avg_dwell_minutes: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      baseline_activity_view: {
        Row: {
          day_of_week: number | null
          expected_activity: number | null
          hour_of_day: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      crowd_forecast_view: {
        Row: {
          forecast_label: string | null
          last_hour: number | null
          previous_hour: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      live_venue_metrics: {
        Row: {
          active_visitors: number | null
          name: string | null
          recent_arrivals: number | null
          velocity_multiplier: number | null
          venue_id: string | null
        }
        Relationships: []
      }
      live_venue_scores: {
        Row: {
          activity_vs_baseline: number | null
          confidence_score: number | null
          occupancy_proxy: number | null
          pulze_score: number | null
          quiet_score: number | null
          score_reason: Json | null
          trend_label: string | null
          trend_score: number | null
          unique_users_recent: number | null
          venue_id: string | null
        }
        Relationships: []
      }
      neighborhood_drain_stats: {
        Row: {
          drain_status: string | null
          name: string | null
          net_flow: number | null
          recent_entries: number | null
          recent_exits: number | null
        }
        Relationships: []
      }
      neighborhood_trends: {
        Row: {
          current_window_arrivals: number | null
          growth_rate_pct: number | null
          name: string | null
          previous_window_arrivals: number | null
        }
        Relationships: []
      }
      pulze_master_scores: {
        Row: {
          active_visitors: number | null
          activity_score: number | null
          name: string | null
          recent_arrivals: number | null
          velocity_multiplier: number | null
          venue_category: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      v_checkin_signals_recent: {
        Row: {
          anti_spam_weight: number | null
          bin_10m: string | null
          created_at: string | null
          decayed_weight: number | null
          id: string | null
          rn: number | null
          user_id: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      v_recent_checkin_metrics: {
        Row: {
          checkin_unique_users_60: number | null
          checkins_15: number | null
          checkins_180: number | null
          checkins_60: number | null
          decayed_checkin_signal: number | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_micro_surges: {
        Row: {
          current_arrivals: number | null
          micro_surge_multiplier: number | null
          neighborhood_avg: number | null
          neighborhood_name: string | null
          venue_name: string | null
        }
        Relationships: []
      }
      venues_with_scores: {
        Row: {
          category: string | null
          city: string | null
          is_active: boolean | null
          legacy_mock_id: string | null
          name: string | null
          pulze_score: number | null
          quiet_score: number | null
          trend_label: string | null
          venue_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      check_and_increment_login_attempts: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      cleanup_friend_presence_cache: { Args: never; Returns: undefined }
      cleanup_location_data_by_retention: { Args: never; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_current_user_age: { Args: never; Returns: number }
      get_nearby_geofence_candidates:
        | {
            Args: { p_lat: number; p_limit?: number; p_lng: number }
            Returns: {
              location_lat: number
              location_lng: number
              name: string
              priority_score: number
              radius: number
              venue_id: string
            }[]
          }
        | {
            Args: {
              p_lat: number
              p_limit?: number
              p_lng: number
              p_user_id: string
            }
            Returns: {
              priority_score: number
              venue_id: string
            }[]
          }
      gettransactionid: { Args: never; Returns: unknown }
      handle_geofence_transition: {
        Args: { p_lat: number; p_lng: number; p_user_id: string }
        Returns: string
      }
      handle_smart_geofence: {
        Args: {
          p_ble_id?: string
          p_lat: number
          p_lng: number
          p_user_id: string
          p_velocity_mph: number
          p_wifi_hash?: string
        }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      pulze_clamp01: { Args: { v: number }; Returns: number }
      pulze_decay: {
        Args: { age_minutes: number; half_life_minutes: number }
        Returns: number
      }
      rank_nearby_venues: {
        Args: {
          p_desired_mode: string
          p_radius_m: number
          p_user_lat: number
          p_user_lon: number
        }
        Returns: {
          activity_vs_baseline: number
          category: string
          city: string
          confidence_score: number
          distance_m: number
          legacy_mock_id: string
          occupancy_proxy: number
          pulze_score: number
          quiet_score: number
          rank_score: number
          score_reason: Json
          trend_label: string
          trend_score: number
          unique_users_recent: number
          venue_id: string
          venue_name: string
        }[]
      }
      record_geofence_event: {
        Args: {
          p_event_type: string
          p_source?: string
          p_user_id: string
          p_venue_id: string
        }
        Returns: undefined
      }
      resolve_login_email: { Args: { p_username: string }; Returns: string }
      set_my_date_of_birth: { Args: { p_dob: string }; Returns: number }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      trending_in_city: {
        Args: { p_city: string; p_limit?: number }
        Returns: {
          category: string
          confidence_score: number
          pulze_score: number
          quiet_score: number
          trend_label: string
          venue_id: string
          venue_name: string
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_cell_scores: {
        Args: never
        Returns: {
          cell_id: string
          energy_score: number
          vibe_status: string
        }[]
      }
      update_friend_presence: {
        Args: { p_user_id: string; p_venue_id: string }
        Returns: undefined
      }
      update_venue_scores: {
        Args: never
        Returns: {
          confidence_label: string
          new_score: number
          venue_name: string
        }[]
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
