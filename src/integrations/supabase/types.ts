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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      booking_email_reconcile_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          resolved_count: number
          retried_count: number
          retry_scheduled: number
          sent_count: number
          started_at: string
          status: string
          timed_out_count: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          resolved_count?: number
          retried_count?: number
          retry_scheduled?: number
          sent_count?: number
          started_at?: string
          status?: string
          timed_out_count?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          resolved_count?: number
          retried_count?: number
          retry_scheduled?: number
          sent_count?: number
          started_at?: string
          status?: string
          timed_out_count?: number
        }
        Relationships: []
      }
      booking_email_send_attempts: {
        Row: {
          attempt: number
          booking_id: string
          created_at: string
          http_status: number | null
          id: string
          last_error: string | null
          next_retry_at: string | null
          request_id: number | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt?: number
          booking_id: string
          created_at?: string
          http_status?: number | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          request_id?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt?: number
          booking_id?: string
          created_at?: string
          http_status?: number | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          request_id?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_email_send_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          address: string | null
          admin_notes: string | null
          created_at: string
          description: string
          email: string
          id: string
          name: string
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          service_type: string
          status: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          created_at?: string
          description: string
          email: string
          id?: string
          name: string
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_type: string
          status?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          created_at?: string
          description?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_type?: string
          status?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          driver_id: string
          estimate_request_id: string
          id: string
          notes: string | null
          stage: string
          started_at: string | null
          updated_at: string
          vehicle_label: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          driver_id: string
          estimate_request_id: string
          id?: string
          notes?: string | null
          stage?: string
          started_at?: string | null
          updated_at?: string
          vehicle_label?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          driver_id?: string
          estimate_request_id?: string
          id?: string
          notes?: string | null
          stage?: string
          started_at?: string | null
          updated_at?: string
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_estimate_request_id_fkey"
            columns: ["estimate_request_id"]
            isOneToOne: false
            referencedRelation: "estimate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy_m: number | null
          assignment_id: string
          heading: number | null
          id: number
          lat: number
          lng: number
          recorded_at: string
          speed_mph: number | null
        }
        Insert: {
          accuracy_m?: number | null
          assignment_id: string
          heading?: number | null
          id?: number
          lat: number
          lng: number
          recorded_at?: string
          speed_mph?: number | null
        }
        Update: {
          accuracy_m?: number | null
          assignment_id?: string
          heading?: number | null
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
          speed_mph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "driver_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      estimate_email_send_attempts: {
        Row: {
          attempt: number
          created_at: string
          estimate_id: string
          id: string
          last_error: string | null
          request_id: number | null
          status: string
          template: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          estimate_id: string
          id?: string
          last_error?: string | null
          request_id?: number | null
          status?: string
          template: string
        }
        Update: {
          attempt?: number
          created_at?: string
          estimate_id?: string
          id?: string
          last_error?: string | null
          request_id?: number | null
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_email_send_attempts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_requests: {
        Row: {
          address: string
          admin_notes: string | null
          balance_due_cents: number | null
          created_at: string
          deposit_amount_cents: number | null
          distance_miles: number
          email: string | null
          final_price_cents: number | null
          id: string
          item_dimensions: string | null
          item_quantity: number
          item_weight_lbs: number | null
          last_payment_link_sent_at: string | null
          last_payment_link_type: string | null
          name: string | null
          notes: string | null
          paid_at: string | null
          payment_status: string
          payment_token: string
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          public_code: string
          service_direction: string
          service_type: string
          status: string
          stops: Json
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tracking_token: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          balance_due_cents?: number | null
          created_at?: string
          deposit_amount_cents?: number | null
          distance_miles: number
          email?: string | null
          final_price_cents?: number | null
          id?: string
          item_dimensions?: string | null
          item_quantity?: number
          item_weight_lbs?: number | null
          last_payment_link_sent_at?: string | null
          last_payment_link_type?: string | null
          name?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          payment_token: string
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          public_code?: string
          service_direction?: string
          service_type: string
          status?: string
          stops?: Json
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_token?: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          balance_due_cents?: number | null
          created_at?: string
          deposit_amount_cents?: number | null
          distance_miles?: number
          email?: string | null
          final_price_cents?: number | null
          id?: string
          item_dimensions?: string | null
          item_quantity?: number
          item_weight_lbs?: number | null
          last_payment_link_sent_at?: string | null
          last_payment_link_type?: string | null
          name?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          payment_token?: string
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          public_code?: string
          service_direction?: string
          service_type?: string
          status?: string
          stops?: Json
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_token?: string
        }
        Relationships: []
      }
      mapbox_rate_hits: {
        Row: {
          hit_at: string
          id: number
          ip_hash: string
          scope: string
        }
        Insert: {
          hit_at?: string
          id?: number
          ip_hash: string
          scope: string
        }
        Update: {
          hit_at?: string
          id?: number
          ip_hash?: string
          scope?: string
        }
        Relationships: []
      }
      order_status_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          id: string
          new_status: string
          old_status: string | null
          order_id: string
          order_type: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          order_id: string
          order_type: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          order_id?: string
          order_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          error_message: string | null
          estimate_request_id: string | null
          event_id: string | null
          event_type: string | null
          http_status: number
          id: string
          outcome: string
          payload_summary: Json | null
          received_at: string
          signature_verified: boolean
        }
        Insert: {
          error_message?: string | null
          estimate_request_id?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status: number
          id?: string
          outcome: string
          payload_summary?: Json | null
          received_at?: string
          signature_verified: boolean
        }
        Update: {
          error_message?: string | null
          estimate_request_id?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status?: number
          id?: string
          outcome?: string
          payload_summary?: Json | null
          received_at?: string
          signature_verified?: boolean
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_send_logs: {
        Row: {
          chat_id: string | null
          created_at: string
          error: string | null
          estimate_request_id: string | null
          http_status: number | null
          id: string
          message_id: number | null
          source: string
          status: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          error?: string | null
          estimate_request_id?: string | null
          http_status?: number | null
          id?: string
          message_id?: number | null
          source: string
          status: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          error?: string | null
          estimate_request_id?: string | null
          http_status?: number | null
          id?: string
          message_id?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      tracking_auth_attempts: {
        Row: {
          attempted_at: string
          id: number
          key_hash: string
          kind: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: number
          key_hash: string
          kind: string
          success: boolean
        }
        Update: {
          attempted_at?: string
          id?: number
          key_hash?: string
          kind?: string
          success?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_mapbox_rate_limit: {
        Args: {
          _ip_hash: string
          _max: number
          _scope: string
          _window_seconds: number
        }
        Returns: boolean
      }
      claim_admin_if_none: { Args: never; Returns: boolean }
      claim_driver_role: { Args: never; Returns: boolean }
      cleanup_mapbox_rate_hits: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_estimate_code: { Args: never; Returns: string }
      generate_tracking_token: { Args: never; Returns: string }
      get_aikido_credentials_status: { Args: never; Returns: Json }
      get_customer_orders: {
        Args: { _email: string; _phone_last4: string }
        Returns: {
          balance_due_cents: number
          created_at: string
          deposit_amount_cents: number
          destination_summary: string
          final_price_cents: number
          paid_at: string
          payable_link_type: string
          payable_token: string
          payment_status: string
          preferred_date: string
          preferred_time: string
          public_code: string
          service_direction: string
          service_type: string
          status: string
          tracking_token: string
        }[]
      }
      get_estimate_status: {
        Args: { _code: string; _phone_last4: string }
        Returns: {
          created_at: string
          preferred_date: string
          preferred_time: string
          public_code: string
          service_direction: string
          service_type: string
          status: string
        }[]
      }
      get_tracking_by_token: {
        Args: { _phone_last4: string; _token: string }
        Returns: {
          dest_area: string
          driver_first_name: string
          heading: number
          is_live: boolean
          lat: number
          lng: number
          recorded_at: string
          service_direction: string
          service_type: string
          speed_mph: number
          stage: string
          started_at: string
          vehicle_label: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_active_driver_topic: { Args: { _topic: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reconcile_booking_email_attempts: { Args: never; Returns: string }
      send_booking_email_attempt: {
        Args: { _attempt: number; _booking_id: string }
        Returns: string
      }
      send_estimate_email_attempt: {
        Args: { _estimate_id: string; _recipient: string; _template: string }
        Returns: string
      }
      set_aikido_credentials: {
        Args: { _client_id: string; _client_secret: string }
        Returns: undefined
      }
      set_email_message_vt: {
        Args: {
          message_id: number
          queue_name: string
          vt_offset_seconds: number
        }
        Returns: boolean
      }
      submit_estimate_request: {
        Args: {
          _address: string
          _distance_miles: number
          _email: string
          _item_dimensions: string
          _item_quantity: number
          _item_weight_lbs: number
          _name: string
          _notes: string
          _phone: string
          _preferred_date: string
          _preferred_time: string
          _service_direction: string
          _service_type: string
          _stops: Json
        }
        Returns: {
          id: string
          public_code: string
          tracking_token: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "driver"
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
    Enums: {
      app_role: ["admin", "driver"],
    },
  },
} as const
