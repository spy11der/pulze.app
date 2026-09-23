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
      admin_audit_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          diff: Json
          id: number
          occurred_at: string
          reason: string | null
          target_id: string | null
          target_kind: string | null
          venue_id: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          diff?: Json
          id?: number
          occurred_at?: string
          reason?: string | null
          target_id?: string | null
          target_kind?: string | null
          venue_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          diff?: Json
          id?: number
          occurred_at?: string
          reason?: string | null
          target_id?: string | null
          target_kind?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "admin_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "admin_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "admin_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
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
      app_events: {
        Row: {
          client_ts: string | null
          event_type: string
          id: number
          properties: Json
          purpose: string
          server_ts: string
          subject_id: string | null
          subject_type: string | null
          user_id: string
        }
        Insert: {
          client_ts?: string | null
          event_type: string
          id?: never
          properties?: Json
          purpose: string
          server_ts?: string
          subject_id?: string | null
          subject_type?: string | null
          user_id: string
        }
        Update: {
          client_ts?: string | null
          event_type?: string
          id?: never
          properties?: Json
          purpose?: string
          server_ts?: string
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string
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
      billing_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          provider_credit_note_id: string | null
          reason: string
          venue_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          provider_credit_note_id?: string | null
          reason: string
          venue_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          provider_credit_note_id?: string | null
          reason?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_adjustments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_adjustments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_adjustments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      billing_invoice_line_clicks: {
        Row: {
          charged_cpc: number
          click_id: string
          created_at: string
          invoice_id: string
        }
        Insert: {
          charged_cpc: number
          click_id: string
          created_at?: string
          invoice_id: string
        }
        Update: {
          charged_cpc?: number
          click_id?: string
          created_at?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoice_line_clicks_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: true
            referencedRelation: "promotion_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoice_line_clicks_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          adjustments: number
          amount_due: number
          charge_attempts: number
          charge_claimed_at: string | null
          click_count: number
          created_at: string
          currency: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          finalized_at: string | null
          id: string
          last_charge_attempt_at: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          provider_invoice_id: string | null
          provider_payment_intent_id: string | null
          status: string
          subtotal: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          adjustments?: number
          amount_due?: number
          charge_attempts?: number
          charge_claimed_at?: string | null
          click_count?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finalized_at?: string | null
          id?: string
          last_charge_attempt_at?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          provider_invoice_id?: string | null
          provider_payment_intent_id?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          adjustments?: number
          amount_due?: number
          charge_attempts?: number
          charge_claimed_at?: string | null
          click_count?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          finalized_at?: string | null
          id?: string
          last_charge_attempt_at?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          provider_invoice_id?: string | null
          provider_payment_intent_id?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_invoices_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_invoices_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_invoices_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          error: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          status: string
          type: string
          venue_id: string | null
        }
        Insert: {
          error?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          received_at?: string
          status?: string
          type: string
          venue_id?: string | null
        }
        Update: {
          error?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          status?: string
          type?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_webhook_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_webhook_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_webhook_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "billing_webhook_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_webhook_events_venue_id_fkey"
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
      promotion_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          daily_budget: number
          ended_at: string | null
          ends_at: string | null
          id: string
          name: string
          starts_at: string
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_by_pulze: boolean
          suspension_reason: string | null
          total_budget: number | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_budget: number
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          name: string
          starts_at: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_by_pulze?: boolean
          suspension_reason?: string | null
          total_budget?: number | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_budget?: number
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_by_pulze?: boolean
          suspension_reason?: string | null
          total_budget?: number | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      promotion_click_rejections: {
        Row: {
          campaign_id: string | null
          details: Json
          id: number
          impression_id: string | null
          occurred_at: string
          reason: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          details?: Json
          id?: number
          impression_id?: string | null
          occurred_at?: string
          reason: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          details?: Json
          id?: number
          impression_id?: string | null
          occurred_at?: string
          reason?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_click_rejections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_click_rejections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_click_rejections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_click_rejections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_click_rejections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_click_rejections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      promotion_clicks: {
        Row: {
          base_cpc: number
          billable: boolean
          campaign_id: string
          charged_cpc: number
          clicked_at: string
          created_at: string
          dedupe_key: string
          event_id: number | null
          id: string
          impression_id: string | null
          late_night_multiplier: number
          local_clicked_at: string
          local_date: string | null
          local_day_of_week: number
          non_billable_reason: string | null
          pricing_schedule: string
          rate_card_id: string
          user_id: string | null
          venue_id: string
          venue_timezone: string
          weekend_multiplier: number
        }
        Insert: {
          base_cpc: number
          billable?: boolean
          campaign_id: string
          charged_cpc: number
          clicked_at: string
          created_at?: string
          dedupe_key: string
          event_id?: number | null
          id?: string
          impression_id?: string | null
          late_night_multiplier: number
          local_clicked_at: string
          local_date?: string | null
          local_day_of_week: number
          non_billable_reason?: string | null
          pricing_schedule: string
          rate_card_id: string
          user_id?: string | null
          venue_id: string
          venue_timezone: string
          weekend_multiplier: number
        }
        Update: {
          base_cpc?: number
          billable?: boolean
          campaign_id?: string
          charged_cpc?: number
          clicked_at?: string
          created_at?: string
          dedupe_key?: string
          event_id?: number | null
          id?: string
          impression_id?: string | null
          late_night_multiplier?: number
          local_clicked_at?: string
          local_date?: string | null
          local_day_of_week?: number
          non_billable_reason?: string | null
          pricing_schedule?: string
          rate_card_id?: string
          user_id?: string | null
          venue_id?: string
          venue_timezone?: string
          weekend_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotion_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "app_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "demographic_aggregate_events_eligible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "personalization_events_eligible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_impression_id_fkey"
            columns: ["impression_id"]
            isOneToOne: false
            referencedRelation: "promotion_impressions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "promotion_rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_clicks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_clicks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_clicks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_clicks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      promotion_daily_stats: {
        Row: {
          campaign_id: string
          clicks: number
          impressions: number
          local_date: string
          spend: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          impressions?: number
          local_date: string
          spend?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          impressions?: number
          local_date?: string
          spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_daily_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_impressions: {
        Row: {
          campaign_id: string
          consumed_at: string | null
          expires_at: string
          id: string
          issued_at: string
          surface: string
          user_id: string
          venue_id: string
        }
        Insert: {
          campaign_id: string
          consumed_at?: string | null
          expires_at: string
          id?: string
          issued_at?: string
          surface: string
          user_id: string
          venue_id: string
        }
        Update: {
          campaign_id?: string
          consumed_at?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          surface?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_impressions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_impressions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_impressions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "promotion_impressions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_impressions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      promotion_rate_card_days: {
        Row: {
          base_cpc: number
          day_of_week: number
          rate_card_id: string
          weekend_multiplier_applies: boolean
        }
        Insert: {
          base_cpc: number
          day_of_week: number
          rate_card_id: string
          weekend_multiplier_applies?: boolean
        }
        Update: {
          base_cpc?: number
          day_of_week?: number
          rate_card_id?: string
          weekend_multiplier_applies?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rate_card_days_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "promotion_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_rate_cards: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          late_night_end: string
          late_night_multiplier: number
          late_night_start: string
          notes: string | null
          schedule: string
          version: number
          weekend_multiplier: number
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_until?: string | null
          id?: string
          late_night_end: string
          late_night_multiplier: number
          late_night_start: string
          notes?: string | null
          schedule: string
          version: number
          weekend_multiplier: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          late_night_end?: string
          late_night_multiplier?: number
          late_night_start?: string
          notes?: string | null
          schedule?: string
          version?: number
          weekend_multiplier?: number
        }
        Relationships: []
      }
      pulze_staff: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
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
          consent_demographic_analytics: boolean
          consent_location_gps: boolean
          consent_personalized_recommendations: boolean
          consent_proximity_bluetooth: boolean
          created_at: string
          id: string
          personalization_consent_granted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_ads_and_tracking?: boolean
          consent_core_app?: boolean
          consent_demographic_analytics?: boolean
          consent_location_gps?: boolean
          consent_personalized_recommendations?: boolean
          consent_proximity_bluetooth?: boolean
          created_at?: string
          id?: string
          personalization_consent_granted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_ads_and_tracking?: boolean
          consent_core_app?: boolean
          consent_demographic_analytics?: boolean
          consent_location_gps?: boolean
          consent_personalized_recommendations?: boolean
          consent_proximity_bluetooth?: boolean
          created_at?: string
          id?: string
          personalization_consent_granted_at?: string | null
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
          gender_identity: string | null
          gender_updated_at: string | null
          optional_step_completed_at: string | null
          race_ethnicity: string[] | null
          race_ethnicity_established_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          established_at?: string
          gender_identity?: string | null
          gender_updated_at?: string | null
          optional_step_completed_at?: string | null
          race_ethnicity?: string[] | null
          race_ethnicity_established_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          established_at?: string
          gender_identity?: string | null
          gender_updated_at?: string | null
          optional_step_completed_at?: string | null
          race_ethnicity?: string[] | null
          race_ethnicity_established_at?: string | null
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
      venue_audit_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          diff: Json
          id: number
          occurred_at: string
          target_id: string | null
          target_table: string | null
          venue_id: string | null
          venue_ref: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          diff?: Json
          id?: number
          occurred_at?: string
          target_id?: string | null
          target_table?: string | null
          venue_id?: string | null
          venue_ref: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          diff?: Json
          id?: number
          occurred_at?: string
          target_id?: string | null
          target_table?: string | null
          venue_id?: string | null
          venue_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_audit_log_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_billing_accounts: {
        Row: {
          blocked_by_pulze: boolean
          blocked_reason: string | null
          created_at: string
          currency: string
          delinquent: boolean
          last_provider_sync_at: string | null
          payment_method_id: string | null
          pm_brand: string | null
          pm_exp_month: number | null
          pm_exp_year: number | null
          pm_last4: string | null
          provider: string
          provider_customer_id: string | null
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          blocked_by_pulze?: boolean
          blocked_reason?: string | null
          created_at?: string
          currency?: string
          delinquent?: boolean
          last_provider_sync_at?: string | null
          payment_method_id?: string | null
          pm_brand?: string | null
          pm_exp_month?: number | null
          pm_exp_year?: number | null
          pm_last4?: string | null
          provider?: string
          provider_customer_id?: string | null
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          blocked_by_pulze?: boolean
          blocked_reason?: string | null
          created_at?: string
          currency?: string
          delinquent?: boolean
          last_provider_sync_at?: string | null
          payment_method_id?: string | null
          pm_brand?: string | null
          pm_exp_month?: number | null
          pm_exp_year?: number | null
          pm_last4?: string | null
          provider?: string
          provider_customer_id?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_billing_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_billing_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_billing_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_billing_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_billing_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_claims: {
        Row: {
          business_email: string
          claimant_name: string
          claimant_title: string
          claimant_user_id: string
          created_at: string
          granted_member_id: string | null
          id: string
          phone: string
          proof_details: string | null
          proof_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          venue_id: string
          verification_evidence: Json
          verification_method: string
        }
        Insert: {
          business_email: string
          claimant_name: string
          claimant_title: string
          claimant_user_id: string
          created_at?: string
          granted_member_id?: string | null
          id?: string
          phone: string
          proof_details?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          venue_id: string
          verification_evidence?: Json
          verification_method?: string
        }
        Update: {
          business_email?: string
          claimant_name?: string
          claimant_title?: string
          claimant_user_id?: string
          created_at?: string
          granted_member_id?: string | null
          id?: string
          phone?: string
          proof_details?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          venue_id?: string
          verification_evidence?: Json
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_claims_granted_member_id_fkey"
            columns: ["granted_member_id"]
            isOneToOne: false
            referencedRelation: "venue_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_field_provenance: {
        Row: {
          field: string
          method: string
          recorded_at: string
          recorded_by: string | null
          source_note: string
          source_url: string | null
          venue_id: string
        }
        Insert: {
          field: string
          method: string
          recorded_at?: string
          recorded_by?: string | null
          source_note: string
          source_url?: string | null
          venue_id: string
        }
        Update: {
          field?: string
          method?: string
          recorded_at?: string
          recorded_by?: string | null
          source_note?: string
          source_url?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_field_provenance_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_field_provenance_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_field_provenance_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_field_provenance_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_field_provenance_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_happy_hours: {
        Row: {
          authority: string
          created_at: string
          days_of_week: number[]
          description: string | null
          drink_specials: string[] | null
          effective_from: string | null
          effective_until: string | null
          end_time: string
          food_specials: string[] | null
          id: string
          is_active: boolean
          last_verified_at: string
          source: string
          source_provider_ref: string | null
          source_url: string | null
          start_time: string
          updated_at: string
          venue_id: string
          verified_by: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          authority?: string
          created_at?: string
          days_of_week: number[]
          description?: string | null
          drink_specials?: string[] | null
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          food_specials?: string[] | null
          id?: string
          is_active?: boolean
          last_verified_at?: string
          source: string
          source_provider_ref?: string | null
          source_url?: string | null
          start_time: string
          updated_at?: string
          venue_id: string
          verified_by?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          authority?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          drink_specials?: string[] | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          food_specials?: string[] | null
          id?: string
          is_active?: boolean
          last_verified_at?: string
          source?: string
          source_provider_ref?: string | null
          source_url?: string | null
          start_time?: string
          updated_at?: string
          venue_id?: string
          verified_by?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_hours: {
        Row: {
          authority: string
          closes_at: string | null
          created_at: string
          crosses_midnight: boolean | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          is_closed: boolean
          last_verified_at: string
          opens_at: string | null
          source: string
          updated_at: string
          venue_id: string
          verified_by: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          authority?: string
          closes_at?: string | null
          created_at?: string
          crosses_midnight?: boolean | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          last_verified_at?: string
          opens_at?: string | null
          source?: string
          updated_at?: string
          venue_id: string
          verified_by?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          authority?: string
          closes_at?: string | null
          created_at?: string
          crosses_midnight?: boolean | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          last_verified_at?: string
          opens_at?: string | null
          source?: string
          updated_at?: string
          venue_id?: string
          verified_by?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_listing_requests: {
        Row: {
          category: string | null
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contact_title: string
          created_venue_id: string | null
          dedupe_key: string | null
          id: string
          notes: string | null
          postal_code: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string
          street_address: string
          submitted_at: string
          venue_name: string
          venue_phone: string
          website: string | null
        }
        Insert: {
          category?: string | null
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contact_title: string
          created_venue_id?: string | null
          dedupe_key?: string | null
          id?: string
          notes?: string | null
          postal_code?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: string
          street_address: string
          submitted_at?: string
          venue_name: string
          venue_phone: string
          website?: string | null
        }
        Update: {
          category?: string | null
          city?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          contact_title?: string
          created_venue_id?: string | null
          dedupe_key?: string | null
          id?: string
          notes?: string | null
          postal_code?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string
          street_address?: string
          submitted_at?: string
          venue_name?: string
          venue_phone?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_listing_requests_created_venue_id_fkey"
            columns: ["created_venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_listing_requests_created_venue_id_fkey"
            columns: ["created_venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_listing_requests_created_venue_id_fkey"
            columns: ["created_venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_listing_requests_created_venue_id_fkey"
            columns: ["created_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_listing_requests_created_venue_id_fkey"
            columns: ["created_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          revoked_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_members_venue_id_fkey"
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
      venue_profile_overrides: {
        Row: {
          actor_user_id: string | null
          authority: string
          field: string
          set_at: string
          venue_id: string
        }
        Insert: {
          actor_user_id?: string | null
          authority?: string
          field: string
          set_at?: string
          venue_id: string
        }
        Update: {
          actor_user_id?: string | null
          authority?: string
          field?: string
          set_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_profile_overrides_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_profile_overrides_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_profile_overrides_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_profile_overrides_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_profile_overrides_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_promotion_accounts: {
        Row: {
          billing_ready: boolean
          created_at: string
          launch_rate_ends_at: string | null
          launch_rate_starts_at: string | null
          notes: string | null
          override_rate_card_id: string | null
          override_reason: string | null
          override_set_at: string | null
          override_set_by: string | null
          pricing_plan: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          billing_ready?: boolean
          created_at?: string
          launch_rate_ends_at?: string | null
          launch_rate_starts_at?: string | null
          notes?: string | null
          override_rate_card_id?: string | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          pricing_plan?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          billing_ready?: boolean
          created_at?: string
          launch_rate_ends_at?: string | null
          launch_rate_starts_at?: string | null
          notes?: string | null
          override_rate_card_id?: string | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          pricing_plan?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_promotion_accounts_override_rate_card_id_fkey"
            columns: ["override_rate_card_id"]
            isOneToOne: false
            referencedRelation: "promotion_rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_promotion_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_promotion_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_promotion_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_promotion_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_promotion_accounts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
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
          deactivated_at: string | null
          deactivated_by: string | null
          deactivated_reason: string | null
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
          timezone: string
          verification_notes: string | null
          verification_state: string
          verified_at: string | null
          verified_by: string | null
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
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivated_reason?: string | null
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
          timezone?: string
          verification_notes?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
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
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivated_reason?: string | null
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
          timezone?: string
          verification_notes?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          wifi_fingerprint?: string | null
          wifi_fingerprint_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
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
      demographic_aggregate_events_eligible: {
        Row: {
          client_ts: string | null
          event_type: string | null
          id: number | null
          properties: Json | null
          server_ts: string | null
          subject_id: string | null
          subject_type: string | null
          user_id: string | null
        }
        Relationships: []
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
      personalization_events_eligible: {
        Row: {
          client_ts: string | null
          event_type: string | null
          id: number | null
          properties: Json | null
          server_ts: string | null
          subject_id: string | null
          subject_type: string | null
          user_id: string | null
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
      v_active_happy_hours: {
        Row: {
          days_of_week: number[] | null
          description: string | null
          drink_specials: string[] | null
          effective_from: string | null
          effective_until: string | null
          end_time: string | null
          food_specials: string[] | null
          happy_hour_id: string | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          source: string | null
          source_url: string | null
          start_time: string | null
          venue_category: string | null
          venue_id: string | null
          venue_name: string | null
          venue_neighborhood_id: string | null
          venue_timezone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_metrics"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "live_venue_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "pulze_master_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_happy_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_with_scores"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venues_neighborhood_id_fkey"
            columns: ["venue_neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
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
      admin_add_staff: {
        Args: { p_reason: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      admin_assign_pricing_plan: {
        Args: {
          p_months?: number
          p_plan: string
          p_reason: string
          p_starts_at?: string
          p_venue_id: string
        }
        Returns: Json
      }
      admin_audit: {
        Args: {
          p_action: string
          p_actor_role: string
          p_diff?: Json
          p_reason?: string
          p_target_id?: string
          p_target_kind?: string
          p_venue_id?: string
        }
        Returns: number
      }
      admin_billing_reconciliation: { Args: never; Returns: Json }
      admin_bootstrap_first_super_admin: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_can: {
        Args: { p_capability: string; p_role: string }
        Returns: boolean
      }
      admin_create_venue: {
        Args: { p_reason: string; p_venue: Json }
        Returns: string
      }
      admin_current_aal: { Args: never; Returns: string }
      admin_get_venue: { Args: { p_venue_id: string }; Returns: Json }
      admin_list_adjustments: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_list_billing_accounts: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_list_campaigns: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      admin_list_claims: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      admin_list_invoices: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      admin_list_listing_requests: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      admin_list_pricing_assignments: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_list_rate_cards: { Args: never; Returns: Json }
      admin_list_staff: { Args: never; Returns: Json }
      admin_list_venues: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      admin_open_invoice: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_venue_id: string
        }
        Returns: Json
      }
      admin_overview: { Args: never; Returns: Json }
      admin_publish_rate_card: {
        Args: {
          p_days: Json
          p_effective_from: string
          p_late_night_end: string
          p_late_night_multiplier: number
          p_late_night_start: string
          p_reason: string
          p_schedule: string
          p_weekend_multiplier: number
        }
        Returns: Json
      }
      admin_read_audit: {
        Args: {
          p_action?: string
          p_actor?: string
          p_facets?: boolean
          p_limit?: number
          p_offset?: number
          p_since?: string
          p_target_kind?: string
          p_until?: string
          p_venue_id?: string
        }
        Returns: Json
      }
      admin_record_adjustment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_reason: string
          p_venue_id: string
        }
        Returns: Json
      }
      admin_require: { Args: { p_capability: string }; Returns: string }
      admin_require_reason: { Args: { p_reason: string }; Returns: string }
      admin_review_claim: {
        Args: { p_claim_id: string; p_decision: string; p_reason?: string }
        Returns: Json
      }
      admin_review_listing_request: {
        Args: {
          p_decision: string
          p_reason?: string
          p_request_id: string
          p_venue_id?: string
        }
        Returns: Json
      }
      admin_run_invoicing: { Args: { p_minimum?: number }; Returns: Json }
      admin_session_state: { Args: never; Returns: Json }
      admin_set_billing_blocked: {
        Args: { p_blocked: boolean; p_reason: string; p_venue_id: string }
        Returns: Json
      }
      admin_set_pricing_override: {
        Args: { p_rate_card_id: string; p_reason: string; p_venue_id: string }
        Returns: Json
      }
      admin_set_staff_role: {
        Args: { p_reason: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      admin_set_staff_status: {
        Args: { p_reason: string; p_status: string; p_user_id: string }
        Returns: Json
      }
      admin_set_venue_active: {
        Args: { p_active: boolean; p_reason: string; p_venue_id: string }
        Returns: Json
      }
      admin_set_venue_verification: {
        Args: { p_reason?: string; p_state: string; p_venue_id: string }
        Returns: Json
      }
      admin_suspend_campaign: {
        Args: { p_campaign_id: string; p_reason: string; p_suspend: boolean }
        Returns: Json
      }
      admin_venue_notice: {
        Args: {
          p_action: string
          p_diff?: Json
          p_table?: string
          p_target?: string
          p_venue_id: string
        }
        Returns: undefined
      }
      billing_apply_provider_state: {
        Args: {
          p_customer_id: string
          p_payment_method_id?: string
          p_pm_brand?: string
          p_pm_exp_month?: number
          p_pm_exp_year?: number
          p_pm_last4?: string
          p_venue_id: string
        }
        Returns: Json
      }
      billing_attach_payment_intent: {
        Args: { p_invoice_id: string; p_payment_intent_id: string }
        Returns: Json
      }
      billing_chargeable: { Args: { p_venue_id: string }; Returns: boolean }
      billing_claim_invoice_for_charge: {
        Args: { p_invoice_id: string; p_stale_after?: string }
        Returns: Json
      }
      billing_claim_webhook_event: {
        Args: { p_event_id: string; p_payload: Json; p_type: string }
        Returns: boolean
      }
      billing_derive_status: {
        Args: {
          p_blocked: boolean
          p_customer: string
          p_delinquent: boolean
          p_pm: string
        }
        Returns: string
      }
      billing_due_invoices: {
        Args: {
          p_limit?: number
          p_max_attempts?: number
          p_retry_after?: string
        }
        Returns: Json
      }
      billing_evaluate_ready: { Args: { p_venue_id: string }; Returns: boolean }
      billing_finish_webhook_event: {
        Args: {
          p_error?: string
          p_event_id: string
          p_status: string
          p_venue_id?: string
        }
        Returns: undefined
      }
      billing_mark_payment_failed: {
        Args: { p_code?: string; p_invoice_id: string; p_message?: string }
        Returns: Json
      }
      billing_mark_payment_succeeded: {
        Args: { p_invoice_id: string; p_provider_payment_intent_id?: string }
        Returns: Json
      }
      billing_open_invoice: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_venue_id: string
        }
        Returns: Json
      }
      billing_recompute_ready: { Args: { p_venue_id: string }; Returns: Json }
      billing_record_adjustment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_reason: string
          p_venue_id: string
        }
        Returns: string
      }
      billing_release_invoice_claim: {
        Args: { p_error?: string; p_invoice_id: string }
        Returns: Json
      }
      billing_run_invoicing: {
        Args: { p_minimum?: number; p_now?: string }
        Returns: Json
      }
      billing_set_blocked: {
        Args: { p_blocked: boolean; p_reason?: string; p_venue_id: string }
        Returns: Json
      }
      check_and_increment_login_attempts: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      cleanup_app_events_by_retention: { Args: never; Returns: undefined }
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
      get_happy_hours_happening_now: {
        Args: { p_now?: string }
        Returns: {
          description: string
          drink_specials: string[]
          ends_at_local: string
          food_specials: string[]
          happy_hour_id: string
          is_overnight: boolean
          last_verified_at: string
          latitude: number
          longitude: number
          source: string
          venue_category: string
          venue_id: string
          venue_name: string
          venue_neighborhood_id: string
          venue_timezone: string
        }[]
      }
      get_happy_hours_upcoming_today: {
        Args: { p_now?: string }
        Returns: {
          description: string
          drink_specials: string[]
          ends_at_local: string
          food_specials: string[]
          happy_hour_id: string
          is_overnight: boolean
          last_verified_at: string
          latitude: number
          longitude: number
          source: string
          starts_at_local: string
          venue_category: string
          venue_id: string
          venue_name: string
          venue_neighborhood_id: string
          venue_timezone: string
        }[]
      }
      get_personalization_features_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_venue_weekly_happy_hours: {
        Args: { p_venue_id: string }
        Returns: {
          days_of_week: number[]
          description: string
          drink_specials: string[]
          ends_at_local: string
          food_specials: string[]
          happy_hour_id: string
          is_overnight: boolean
          last_verified_at: string
          source: string
          starts_at_local: string
          venue_id: string
          venue_name: string
          venue_timezone: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      happy_hour_authority_rank: {
        Args: { p_authority: string }
        Returns: number
      }
      is_happy_hour_row_fresh: {
        Args: { p_last_verified_at: string; p_now?: string; p_source: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_optional_demographics_skipped: { Args: never; Returns: undefined }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      portal_accept_invite: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      portal_admin_review_claim: {
        Args: {
          p_claim_id: string
          p_decision: string
          p_notes?: string
          p_reviewer?: string
        }
        Returns: Json
      }
      portal_admin_review_listing_request: {
        Args: {
          p_decision: string
          p_notes?: string
          p_request_id: string
          p_reviewer?: string
          p_venue_id?: string
        }
        Returns: Json
      }
      portal_audit: {
        Args: {
          p_action: string
          p_diff: Json
          p_role: string
          p_table: string
          p_target: string
          p_venue_id: string
        }
        Returns: undefined
      }
      portal_can: {
        Args: { p_capability: string; p_role: string }
        Returns: boolean
      }
      portal_cancel_claim: { Args: { p_claim_id: string }; Returns: undefined }
      portal_claim_target: {
        Args: { p_venue_id: string }
        Returns: {
          address: string
          category: string
          city: string
          claim_state: string
          name: string
          neighborhood: string
          venue_id: string
        }[]
      }
      portal_decline_invite: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      portal_delete_hours: {
        Args: { p_id: string; p_venue_id: string }
        Returns: undefined
      }
      portal_get_analytics: {
        Args: { p_days?: number; p_venue_id: string }
        Returns: Json
      }
      portal_get_billing: { Args: { p_venue_id: string }; Returns: Json }
      portal_get_promotions: { Args: { p_venue_id: string }; Returns: Json }
      portal_get_venue: { Args: { p_venue_id: string }; Returns: Json }
      portal_invite_member: {
        Args: { p_email: string; p_role: string; p_venue_id: string }
        Returns: string
      }
      portal_list_happy_hours: {
        Args: { p_venue_id: string }
        Returns: {
          authority: string
          created_at: string
          days_of_week: number[]
          description: string | null
          drink_specials: string[] | null
          effective_from: string | null
          effective_until: string | null
          end_time: string
          food_specials: string[] | null
          id: string
          is_active: boolean
          last_verified_at: string
          source: string
          source_provider_ref: string | null
          source_url: string | null
          start_time: string
          updated_at: string
          venue_id: string
          verified_by: string | null
          verified_by_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "venue_happy_hours"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      portal_list_hours: {
        Args: { p_venue_id: string }
        Returns: {
          authority: string
          closes_at: string | null
          created_at: string
          crosses_midnight: boolean | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          is_closed: boolean
          last_verified_at: string
          opens_at: string | null
          source: string
          updated_at: string
          venue_id: string
          verified_by: string | null
          verified_by_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "venue_hours"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      portal_list_members: {
        Args: { p_venue_id: string }
        Returns: {
          accepted_at: string
          display_name: string
          invited_at: string
          member_id: string
          role: string
          status: string
          user_id: string
          username: string
        }[]
      }
      portal_list_my_venues: {
        Args: never
        Returns: {
          category: string
          city: string
          member_status: string
          name: string
          neighborhood: string
          role: string
          timezone: string
          venue_id: string
        }[]
      }
      portal_my_claims: {
        Args: never
        Returns: {
          claim_id: string
          review_notes: string
          reviewed_at: string
          status: string
          submitted_at: string
          venue_id: string
          venue_name: string
        }[]
      }
      portal_my_invites: {
        Args: never
        Returns: {
          invited_at: string
          member_id: string
          role: string
          venue_city: string
          venue_id: string
          venue_name: string
        }[]
      }
      portal_my_listing_requests: {
        Args: never
        Returns: {
          city: string
          created_venue_id: string
          created_venue_name: string
          request_id: string
          review_notes: string
          reviewed_at: string
          state: string
          status: string
          street_address: string
          submitted_at: string
          venue_name: string
        }[]
      }
      portal_promotion_quote: {
        Args: { p_at?: string; p_venue_id: string }
        Returns: Json
      }
      portal_remove_member: {
        Args: { p_member_id: string; p_venue_id: string }
        Returns: undefined
      }
      portal_require: {
        Args: { p_capability: string; p_venue_id: string }
        Returns: string
      }
      portal_role: { Args: { p_venue_id: string }; Returns: string }
      portal_search_venues: {
        Args: { p_city?: string; p_limit?: number; p_query: string }
        Returns: {
          address: string
          category: string
          city: string
          claim_state: string
          name: string
          neighborhood: string
          venue_id: string
        }[]
      }
      portal_set_campaign_status: {
        Args: { p_id: string; p_status: string; p_venue_id: string }
        Returns: undefined
      }
      portal_set_happy_hour_active: {
        Args: { p_active: boolean; p_id: string; p_venue_id: string }
        Returns: undefined
      }
      portal_set_member_role: {
        Args: { p_member_id: string; p_role: string; p_venue_id: string }
        Returns: undefined
      }
      portal_submit_claim: {
        Args: { p_claim: Json; p_venue_id: string }
        Returns: string
      }
      portal_submit_listing_request: {
        Args: { p_request: Json }
        Returns: string
      }
      portal_transfer_ownership: {
        Args: { p_to_user_id: string; p_venue_id: string }
        Returns: undefined
      }
      portal_update_venue_profile: {
        Args: { p_patch: Json; p_venue_id: string }
        Returns: Json
      }
      portal_upsert_campaign: {
        Args: { p_campaign: Json; p_venue_id: string }
        Returns: string
      }
      portal_upsert_happy_hour: {
        Args: { p_hh: Json; p_venue_id: string }
        Returns: string
      }
      portal_upsert_hours: {
        Args: { p_venue_id: string; p_window: Json }
        Returns: string
      }
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
      promotion_effective_schedule: {
        Args: { p_at: string; p_venue_id: string }
        Returns: string
      }
      promotion_grant_launch_pricing: {
        Args: {
          p_months?: number
          p_notes?: string
          p_starts_at?: string
          p_venue_id: string
        }
        Returns: Json
      }
      promotion_issue_impression: {
        Args: {
          p_campaign_id: string
          p_surface: string
          p_ttl_seconds?: number
          p_user_id: string
        }
        Returns: string
      }
      promotion_price_click: {
        Args: { p_at?: string; p_venue_id: string }
        Returns: Json
      }
      promotion_rate_card_json: {
        Args: { p_at?: string; p_schedule: string }
        Returns: Json
      }
      promotion_record_click: {
        Args: {
          p_campaign_id: string
          p_clicked_at?: string
          p_event_id?: number
          p_impression_id: string
          p_user_id: string
        }
        Returns: Json
      }
      pulze_clamp01: { Args: { v: number }; Returns: number }
      pulze_decay: {
        Args: { age_minutes: number; half_life_minutes: number }
        Returns: number
      }
      pulze_discover_feed: {
        Args: {
          p_filters?: Json
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_radius_m?: number
          p_surface?: string
          p_user_id?: string
        }
        Returns: Json
      }
      pulze_min_busyness_confidence: { Args: never; Returns: number }
      pulze_organic_score: {
        Args: {
          p_busyness_percent: number
          p_confidence_score: number
          p_distance_m: number
          p_happy_hour: string
          p_min_confidence: number
          p_open_state: string
          p_radius_m: number
          p_surface: string
        }
        Returns: number
      }
      pulze_record_presence: {
        Args: { p_lat: number; p_lng: number }
        Returns: Json
      }
      pulze_venue_open_state: {
        Args: { p_at?: string; p_venue_id: string }
        Returns: string
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
      rank_personalized_venues_for_user: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: Json
      }
      record_app_event: {
        Args: {
          p_client_ts: string
          p_event_type: string
          p_properties: Json
          p_purpose: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: number
      }
      resolve_login_email: { Args: { p_username: string }; Returns: string }
      sanitize_event_properties: { Args: { p: Json }; Returns: Json }
      set_my_date_of_birth: { Args: { p_dob: string }; Returns: number }
      set_my_demographic_analytics_consent: {
        Args: { p_granted: boolean }
        Returns: undefined
      }
      set_my_optional_demographics: {
        Args: { p_consent: boolean; p_gender: string; p_race: string[] }
        Returns: undefined
      }
      set_my_personalization_consent: {
        Args: { p_granted: boolean }
        Returns: undefined
      }
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
      update_my_gender_identity: {
        Args: { p_gender: string }
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
      venue_locked_profile_fields: {
        Args: { p_venue_id: string }
        Returns: string[]
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
