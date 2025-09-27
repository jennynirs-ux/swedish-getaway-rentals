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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          available: boolean
          created_at: string
          date: string
          id: string
          minimum_nights: number | null
          property_id: string
          reason: string | null
          seasonal_price: number | null
        }
        Insert: {
          available?: boolean
          created_at?: string
          date: string
          id?: string
          minimum_nights?: number | null
          property_id: string
          reason?: string | null
          seasonal_price?: number | null
        }
        Update: {
          available?: boolean
          created_at?: string
          date?: string
          id?: string
          minimum_nights?: number | null
          property_id?: string
          reason?: string | null
          seasonal_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_messages: {
        Row: {
          attachment_url: string | null
          booking_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          read_by_guest: boolean
          read_by_host: boolean
          sender_id: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          booking_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          read_by_guest?: boolean
          read_by_host?: boolean
          sender_id?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          read_by_guest?: boolean
          read_by_host?: boolean
          sender_id?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          check_in_date: string
          check_out_date: string
          created_at: string
          currency: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          number_of_guests: number
          property_id: string
          special_requests: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          created_at?: string
          currency?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          number_of_guests: number
          property_id: string
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          currency?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          number_of_guests?: number
          property_id?: string
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_commission: {
        Row: {
          booking_id: string
          commission_rate: number
          created_at: string
          host_amount: number
          id: string
          platform_commission: number
          status: string
          stripe_transfer_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          commission_rate: number
          created_at?: string
          host_amount: number
          id?: string
          platform_commission: number
          status?: string
          stripe_transfer_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          commission_rate?: number
          created_at?: string
          host_amount?: number
          id?: string
          platform_commission?: number
          status?: string
          stripe_transfer_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_commission_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          booking_id: string | null
          coupon_id: string
          discount_amount: number
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          coupon_id: string
          discount_amount: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          coupon_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          currency: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          maximum_discount_amount: number | null
          minimum_amount: number | null
          name: string
          property_id: string | null
          updated_at: string | null
          usage_limit: number | null
          usage_rules: Json | null
          used_count: number | null
          valid_from: string | null
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          currency?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_amount?: number | null
          name: string
          property_id?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          usage_rules?: Json | null
          used_count?: number | null
          valid_from?: string | null
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          currency?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_amount?: number | null
          name?: string
          property_id?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          usage_rules?: Json | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      guest_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          property_id: string | null
          read: boolean
          replied_at: string | null
          reply: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          property_id?: string | null
          read?: boolean
          replied_at?: string | null
          reply?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          property_id?: string | null
          read?: boolean
          replied_at?: string | null
          reply?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      host_applications: {
        Row: {
          admin_notes: string | null
          business_name: string
          contact_phone: string | null
          description: string
          experience: string | null
          id: string
          property_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_name: string
          contact_phone?: string | null
          description: string
          experience?: string | null
          id?: string
          property_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_name?: string
          contact_phone?: string | null
          description?: string
          experience?: string | null
          id?: string
          property_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_feeds: {
        Row: {
          active: boolean
          created_at: string
          error_message: string | null
          id: string
          last_sync: string | null
          name: string
          property_id: string
          sync_status: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync?: string | null
          name: string
          property_id: string
          sync_status?: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync?: string | null
          name?: string
          property_id?: string
          sync_status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          printful_order_id: string | null
          product_data: Json | null
          shipping_address: Json | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          printful_order_id?: string | null
          product_data?: Json | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          printful_order_id?: string | null
          product_data?: Json | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_rate: number | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          guest_rating: number | null
          guest_review_count: number | null
          host_application_date: string | null
          host_approved: boolean
          host_business_name: string | null
          host_description: string | null
          host_onboarding_completed: boolean | null
          id: string
          is_admin: boolean
          is_host: boolean
          location: string | null
          phone: string | null
          provider: string | null
          provider_id: string | null
          stripe_connect_account_id: string | null
          total_stays: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          guest_rating?: number | null
          guest_review_count?: number | null
          host_application_date?: string | null
          host_approved?: boolean
          host_business_name?: string | null
          host_description?: string | null
          host_onboarding_completed?: boolean | null
          id?: string
          is_admin?: boolean
          is_host?: boolean
          location?: string | null
          phone?: string | null
          provider?: string | null
          provider_id?: string | null
          stripe_connect_account_id?: string | null
          total_stays?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          guest_rating?: number | null
          guest_review_count?: number | null
          host_application_date?: string | null
          host_approved?: boolean
          host_business_name?: string | null
          host_description?: string | null
          host_onboarding_completed?: boolean | null
          id?: string
          is_admin?: boolean
          is_host?: boolean
          location?: string | null
          phone?: string | null
          provider?: string | null
          provider_id?: string | null
          stripe_connect_account_id?: string | null
          total_stays?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          active: boolean
          amenities: string[] | null
          amenities_data: Json | null
          amenities_descriptions: Json | null
          availability_text: string | null
          bathrooms: number
          bedrooms: number
          commission_rate: number | null
          contact_response_time: string | null
          created_at: string
          currency: string
          description: string | null
          featured_amenities: Json | null
          footer_quick_links: Json | null
          gallery_images: string[] | null
          gallery_metadata: Json | null
          get_in_touch_info: Json | null
          guidebook_sections: Json | null
          hero_image_url: string | null
          host_id: string | null
          ical_export_secret: string | null
          id: string
          introduction_text: string | null
          location: string | null
          max_guests: number
          pending_approval: boolean
          price_per_night: number
          pricing_table: Json | null
          review_count: number | null
          review_rating: number | null
          special_highlights: Json | null
          tagline_line1: string | null
          tagline_line2: string | null
          title: string
          updated_at: string
          video_metadata: Json | null
          video_urls: string[] | null
          what_makes_special: string | null
        }
        Insert: {
          active?: boolean
          amenities?: string[] | null
          amenities_data?: Json | null
          amenities_descriptions?: Json | null
          availability_text?: string | null
          bathrooms?: number
          bedrooms?: number
          commission_rate?: number | null
          contact_response_time?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_amenities?: Json | null
          footer_quick_links?: Json | null
          gallery_images?: string[] | null
          gallery_metadata?: Json | null
          get_in_touch_info?: Json | null
          guidebook_sections?: Json | null
          hero_image_url?: string | null
          host_id?: string | null
          ical_export_secret?: string | null
          id?: string
          introduction_text?: string | null
          location?: string | null
          max_guests?: number
          pending_approval?: boolean
          price_per_night: number
          pricing_table?: Json | null
          review_count?: number | null
          review_rating?: number | null
          special_highlights?: Json | null
          tagline_line1?: string | null
          tagline_line2?: string | null
          title: string
          updated_at?: string
          video_metadata?: Json | null
          video_urls?: string[] | null
          what_makes_special?: string | null
        }
        Update: {
          active?: boolean
          amenities?: string[] | null
          amenities_data?: Json | null
          amenities_descriptions?: Json | null
          availability_text?: string | null
          bathrooms?: number
          bedrooms?: number
          commission_rate?: number | null
          contact_response_time?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_amenities?: Json | null
          footer_quick_links?: Json | null
          gallery_images?: string[] | null
          gallery_metadata?: Json | null
          get_in_touch_info?: Json | null
          guidebook_sections?: Json | null
          hero_image_url?: string | null
          host_id?: string | null
          ical_export_secret?: string | null
          id?: string
          introduction_text?: string | null
          location?: string | null
          max_guests?: number
          pending_approval?: boolean
          price_per_night?: number
          pricing_table?: Json | null
          review_count?: number | null
          review_rating?: number | null
          special_highlights?: Json | null
          tagline_line1?: string | null
          tagline_line2?: string | null
          title?: string
          updated_at?: string
          video_metadata?: Json | null
          video_urls?: string[] | null
          what_makes_special?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties_pricing_rules: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_per_night: boolean
          name: string
          price: number
          property_id: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_per_night?: boolean
          name: string
          price: number
          property_id: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_per_night?: boolean
          name?: string
          price?: number
          property_id?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_pricing_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: string | null
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          rating?: number
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          additional_images_override: string[] | null
          created_at: string
          currency: string
          custom_description: string | null
          custom_price: number | null
          description: string | null
          description_override: string | null
          id: string
          image_url: string | null
          is_visible_home: boolean | null
          is_visible_shop: boolean | null
          main_image_override: string | null
          price: number
          price_override: number | null
          printful_data: Json | null
          printful_product_id: string
          printful_sync_variant_id: string | null
          sort_order: number | null
          title: string
          title_override: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          additional_images_override?: string[] | null
          created_at?: string
          currency?: string
          custom_description?: string | null
          custom_price?: number | null
          description?: string | null
          description_override?: string | null
          id?: string
          image_url?: string | null
          is_visible_home?: boolean | null
          is_visible_shop?: boolean | null
          main_image_override?: string | null
          price: number
          price_override?: number | null
          printful_data?: Json | null
          printful_product_id: string
          printful_sync_variant_id?: string | null
          sort_order?: number | null
          title: string
          title_override?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          additional_images_override?: string[] | null
          created_at?: string
          currency?: string
          custom_description?: string | null
          custom_price?: number | null
          description?: string | null
          description_override?: string | null
          id?: string
          image_url?: string | null
          is_visible_home?: boolean | null
          is_visible_shop?: boolean | null
          main_image_override?: string | null
          price?: number
          price_override?: number | null
          printful_data?: Json | null
          printful_product_id?: string
          printful_sync_variant_id?: string | null
          sort_order?: number | null
          title?: string
          title_override?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_host_application: {
        Args: { application_id: string }
        Returns: undefined
      }
      calculate_commission_split: {
        Args: { commission_rate_param?: number; total_amount_param: number }
        Returns: {
          host_amount: number
          platform_commission: number
        }[]
      }
      check_booking_conflict: {
        Args: {
          booking_id_param?: string
          check_in_param: string
          check_out_param: string
          property_id_param: string
        }
        Returns: boolean
      }
      check_enhanced_rate_limit: {
        Args: {
          action_type: string
          identifier: string
          max_requests?: number
          progressive_backoff?: boolean
          window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          identifier: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_user_rate_limit: {
        Args: {
          max_requests?: number
          table_name: string
          time_window_minutes?: number
          user_identifier: string
        }
        Returns: boolean
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin_secure: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_booking_accessible: {
        Args: { booking_id: string }
        Returns: boolean
      }
      is_user_admin_safe: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: {
          booking_amount?: number
          coupon_code: string
          property_id_param?: string
          user_id_param?: string
        }
        Returns: {
          coupon_id: string
          discount_amount: number
          message: string
          valid: boolean
        }[]
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
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
