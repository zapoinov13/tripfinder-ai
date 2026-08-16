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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_searches: {
        Row: {
          created_at: string
          id: string
          original_query: string
          parsed: Json
          results_count: number
          search_params: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_query: string
          parsed?: Json
          results_count?: number
          search_params?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_query?: string
          parsed?: Json
          results_count?: number
          search_params?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          currency: string
          external_booking_id: string | null
          id: string
          operator_id: string
          organization_id: string | null
          passengers: Json
          payment_status: string
          price: number
          status: string
          tour_offer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          external_booking_id?: string | null
          id?: string
          operator_id: string
          organization_id?: string | null
          passengers?: Json
          payment_status?: string
          price: number
          status?: string
          tour_offer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          external_booking_id?: string | null
          id?: string
          operator_id?: string
          organization_id?: string | null
          passengers?: Json
          payment_status?: string
          price?: number
          status?: string
          tour_offer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_offer_id_fkey"
            columns: ["tour_offer_id"]
            isOneToOne: false
            referencedRelation: "tour_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          tour_ids: string[]
          user_id: string
        }
        Insert: {
          tour_ids?: string[]
          user_id: string
        }
        Update: {
          tour_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          blurb: string
          city: string
          country: string
          flag: string
          id: string
          image_key: string
          tours_count: number
        }
        Insert: {
          blurb?: string
          city: string
          country: string
          flag?: string
          id: string
          image_key?: string
          tours_count?: number
        }
        Update: {
          blurb?: string
          city?: string
          country?: string
          flag?: string
          id?: string
          image_key?: string
          tours_count?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          tour_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tour_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tour_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: string[]
          beach_line: number
          city: string
          country: string
          destination_id: string
          distance_to_sea: number
          district: string
          flag: string
          id: string
          image_key: string
          name: string
          rating: number
          reviews: number
          stars: number
        }
        Insert: {
          amenities?: string[]
          beach_line?: number
          city: string
          country: string
          destination_id: string
          distance_to_sea?: number
          district?: string
          flag?: string
          id: string
          image_key?: string
          name: string
          rating?: number
          reviews?: number
          stars?: number
        }
        Update: {
          amenities?: string[]
          beach_line?: number
          city?: string
          country?: string
          destination_id?: string
          distance_to_sea?: number
          district?: string
          flag?: string
          id?: string
          image_key?: string
          name?: string
          rating?: number
          reviews?: number
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotels_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          payload: Json
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_api_connections: {
        Row: {
          api_key_encrypted: string
          api_key_masked: string
          auth_type: string
          currency: string
          endpoint: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          secret_encrypted: string
          secret_masked: string
          status: string
          sync_interval_min: number
        }
        Insert: {
          api_key_encrypted?: string
          api_key_masked?: string
          auth_type?: string
          currency?: string
          endpoint: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider?: string
          secret_encrypted?: string
          secret_masked?: string
          status?: string
          sync_interval_min?: number
        }
        Update: {
          api_key_encrypted?: string
          api_key_masked?: string
          auth_type?: string
          currency?: string
          endpoint?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          secret_encrypted?: string
          secret_masked?: string
          status?: string
          sync_interval_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "operator_api_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_api_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          id: string
          name: string
          organization_id: string | null
          rating: number
          tours_count: number
        }
        Insert: {
          id: string
          name: string
          organization_id?: string | null
          rating?: number
          tours_count?: number
        }
        Update: {
          id?: string
          name?: string
          organization_id?: string | null
          rating?: number
          tours_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "operators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          additional_tour_limit: number
          address: string
          advertising_balance: number
          city: string
          contact_person: string
          country: string
          created_at: string
          email: string
          id: string
          legal_name: string
          name: string
          phone: string
          plan_code: string
          promotion_balance: number
          registration_number: string
          status: string
          website: string
        }
        Insert: {
          additional_tour_limit?: number
          address?: string
          advertising_balance?: number
          city?: string
          contact_person?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          legal_name?: string
          name: string
          phone?: string
          plan_code?: string
          promotion_balance?: number
          registration_number?: string
          status?: string
          website?: string
        }
        Update: {
          additional_tour_limit?: number
          address?: string
          advertising_balance?: number
          city?: string
          contact_person?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          legal_name?: string
          name?: string
          phone?: string
          plan_code?: string
          promotion_balance?: number
          registration_number?: string
          status?: string
          website?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          organization_id: string | null
          provider: string
          provider_payment_id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          provider?: string
          provider_payment_id: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          provider?: string
          provider_payment_id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          id: number
          operator_plans: Json
          premium_currency: string
          premium_monthly_price: number
          promotion_prices: Json
          ranking_weights: Json
          updated_at: string
        }
        Insert: {
          id?: number
          operator_plans?: Json
          premium_currency?: string
          premium_monthly_price?: number
          promotion_prices?: Json
          ranking_weights?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          operator_plans?: Json
          premium_currency?: string
          premium_monthly_price?: number
          promotion_prices?: Json
          ranking_weights?: Json
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          currency: string
          current_price: number
          id: string
          status: string
          target_price: number
          tour_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_price: number
          id?: string
          status?: string
          target_price: number
          tour_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_price?: number
          id?: string
          status?: string
          target_price?: number
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tour_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          email: string
          id: string
          name?: string
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          currency: string
          duration_days: number
          expires_at: string
          id: string
          organization_id: string
          price: number
          started_at: string
          status: string
          tour_offer_id: string
          type: string
        }
        Insert: {
          currency?: string
          duration_days: number
          expires_at: string
          id?: string
          organization_id: string
          price: number
          started_at?: string
          status?: string
          tour_offer_id: string
          type: string
        }
        Update: {
          currency?: string
          duration_days?: number
          expires_at?: string
          id?: string
          organization_id?: string
          price?: number
          started_at?: string
          status?: string
          tour_offer_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_tour_offer_id_fkey"
            columns: ["tour_offer_id"]
            isOneToOne: false
            referencedRelation: "tour_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          expires_at: string
          id: string
          organization_id: string | null
          plan_id: string
          provider_subscription_id: string | null
          started_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          expires_at: string
          id?: string
          organization_id?: string | null
          plan_id: string
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          expires_at?: string
          id?: string
          organization_id?: string | null
          plan_id?: string
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          organization_id: string
          status: string
          tours_imported: number
          tours_removed: number
          tours_updated: number
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          organization_id: string
          status: string
          tours_imported?: number
          tours_removed?: number
          tours_updated?: number
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          organization_id?: string
          status?: string
          tours_imported?: number
          tours_removed?: number
          tours_updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_offers: {
        Row: {
          adults: number
          availability: number
          bookings: number
          children: number
          created_at: string
          currency: string
          date_end: string
          date_start: string
          departure: string
          external_id: string
          from_city: string
          hotel_id: string
          id: string
          last_synced_at: string
          meal: string
          meal_code: string
          nights: number
          old_price: number | null
          operator_id: string
          operator_org_id: string | null
          premium_price: number | null
          price: number
          room_type: string
          status: string
          tags: string[]
          transfer: boolean
          updated_at: string
          views: number
        }
        Insert: {
          adults?: number
          availability?: number
          bookings?: number
          children?: number
          created_at?: string
          currency?: string
          date_end: string
          date_start: string
          departure: string
          external_id?: string
          from_city: string
          hotel_id: string
          id: string
          last_synced_at?: string
          meal: string
          meal_code: string
          nights: number
          old_price?: number | null
          operator_id: string
          operator_org_id?: string | null
          premium_price?: number | null
          price: number
          room_type?: string
          status?: string
          tags?: string[]
          transfer?: boolean
          updated_at?: string
          views?: number
        }
        Update: {
          adults?: number
          availability?: number
          bookings?: number
          children?: number
          created_at?: string
          currency?: string
          date_end?: string
          date_start?: string
          departure?: string
          external_id?: string
          from_city?: string
          hotel_id?: string
          id?: string
          last_synced_at?: string
          meal?: string
          meal_code?: string
          nights?: number
          old_price?: number | null
          operator_id?: string
          operator_org_id?: string | null
          premium_price?: number | null
          price?: number
          room_type?: string
          status?: string
          tags?: string[]
          transfer?: boolean
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_offers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_offers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_offers_operator_org_id_fkey"
            columns: ["operator_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_offers_operator_org_id_fkey"
            columns: ["operator_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organizations_public: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string | null
          name: string | null
          plan_code: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          plan_code?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          plan_code?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      platform_config_public: {
        Row: {
          id: number | null
          operator_plans: Json | null
          premium_currency: string | null
          premium_monthly_price: number | null
        }
        Insert: {
          id?: number | null
          operator_plans?: Json | null
          premium_currency?: string | null
          premium_monthly_price?: number | null
        }
        Update: {
          id?: number | null
          operator_plans?: Json | null
          premium_currency?: string | null
          premium_monthly_price?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
