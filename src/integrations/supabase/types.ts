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
      access_sessions: {
        Row: {
          barber_id: string | null
          barbershop_id: string
          created_at: string
          expires_at: string
          kind: string
          token: string
        }
        Insert: {
          barber_id?: string | null
          barbershop_id: string
          created_at?: string
          expires_at?: string
          kind: string
          token?: string
        }
        Update: {
          barber_id?: string | null
          barbershop_id?: string
          created_at?: string
          expires_at?: string
          kind?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_sessions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_sessions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_sessions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          barber_id: string | null
          barber_name: string
          barbershop_id: string
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          date: string
          duration: number
          end_time: string
          id: string
          notes: string | null
          price: number
          service_id: string | null
          service_name: string
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          barber_id?: string | null
          barber_name: string
          barbershop_id: string
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          date: string
          duration: number
          end_time: string
          id?: string
          notes?: string | null
          price: number
          service_id?: string | null
          service_name: string
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          barber_id?: string | null
          barber_name?: string
          barbershop_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          date?: string
          duration?: number
          end_time?: string
          id?: string
          notes?: string | null
          price?: number
          service_id?: string | null
          service_name?: string
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          actor_kind: string
          actor_label: string | null
          barbershop_id: string | null
          created_at: string
          event: string
          id: string
          ip: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          actor_label?: string | null
          barbershop_id?: string | null
          created_at?: string
          event: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          actor_label?: string | null
          barbershop_id?: string | null
          created_at?: string
          event?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      barbers: {
        Row: {
          access_password_hash: string | null
          access_username: string | null
          active: boolean
          barbershop_id: string
          bio: string | null
          blocked_dates: Json
          breaks: Json
          commission_percent: number
          created_at: string
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          rating: number | null
          services: Json
          specialty: string | null
          updated_at: string
          user_id: string | null
          work_hours: Json
        }
        Insert: {
          access_password_hash?: string | null
          access_username?: string | null
          active?: boolean
          barbershop_id: string
          bio?: string | null
          blocked_dates?: Json
          breaks?: Json
          commission_percent?: number
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          services?: Json
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          work_hours?: Json
        }
        Update: {
          access_password_hash?: string | null
          access_username?: string | null
          active?: boolean
          barbershop_id?: string
          bio?: string | null
          blocked_dates?: Json
          breaks?: Json
          commission_percent?: number
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          services?: Json
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          work_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          barbershop_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          barbershop_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          barbershop_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_invites_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string | null
          admin_password_hash: string | null
          admin_username: string | null
          banner_url: string | null
          blocked_dates: Json
          created_at: string
          custom_domain: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          opening_hours: Json
          phone: string | null
          plan: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_password_hash?: string | null
          admin_username?: string | null
          banner_url?: string | null
          blocked_dates?: Json
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          opening_hours?: Json
          phone?: string | null
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_password_hash?: string | null
          admin_username?: string | null
          banner_url?: string | null
          blocked_dates?: Json
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json
          phone?: string | null
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          barbershop_id: string
          created_at: string
          email: string | null
          id: string
          last_visit: string | null
          loyalty_points: number
          name: string
          notes: string | null
          phone: string
          status: string
          total_spent: number
          updated_at: string
          visits: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number
          name: string
          notes?: string | null
          phone: string
          status?: string
          total_spent?: number
          updated_at?: string
          visits?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string
          status?: string
          total_spent?: number
          updated_at?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string
          slug: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          slug: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          slug?: string
          success?: boolean
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          barbershop_id: string
          category: string
          created_at: string
          description: string | null
          duration: number
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          address: string | null
          banner_url: string | null
          barbershop_id: string
          blocked_dates: Json
          created_at: string
          description: string | null
          differentials: Json
          gallery: Json
          gallery_urls: Json
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_reward: string | null
          loyalty_target: number
          name: string
          phone: string | null
          slot_buffer_min: number
          tagline: string | null
          testimonials: Json
          theme_custom: Json | null
          theme_preset: string
          updated_at: string
          whatsapp: string | null
          work_hours: Json
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          barbershop_id: string
          blocked_dates?: Json
          created_at?: string
          description?: string | null
          differentials?: Json
          gallery?: Json
          gallery_urls?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number
          name?: string
          phone?: string | null
          slot_buffer_min?: number
          tagline?: string | null
          testimonials?: Json
          theme_custom?: Json | null
          theme_preset?: string
          updated_at?: string
          whatsapp?: string | null
          work_hours?: Json
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          barbershop_id?: string
          blocked_dates?: Json
          created_at?: string
          description?: string | null
          differentials?: Json
          gallery?: Json
          gallery_urls?: Json
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number
          name?: string
          phone?: string | null
          slot_buffer_min?: number
          tagline?: string | null
          testimonials?: Json
          theme_custom?: Json | null
          theme_preset?: string
          updated_at?: string
          whatsapp?: string | null
          work_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_barbers: {
        Row: {
          active: boolean | null
          barbershop_id: string | null
          bio: string | null
          blocked_dates: Json | null
          breaks: Json | null
          id: string | null
          name: string | null
          photo_url: string | null
          rating: number | null
          services: Json | null
          specialty: string | null
          work_hours: Json | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id?: string | null
          bio?: string | null
          blocked_dates?: Json | null
          breaks?: Json | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          services?: Json | null
          specialty?: string | null
          work_hours?: Json | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string | null
          bio?: string | null
          blocked_dates?: Json | null
          breaks?: Json | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          services?: Json | null
          specialty?: string | null
          work_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      public_shop_settings: {
        Row: {
          address: string | null
          banner_url: string | null
          barbershop_id: string | null
          blocked_dates: Json | null
          description: string | null
          gallery: Json | null
          gallery_urls: Json | null
          instagram: string | null
          logo_url: string | null
          loyalty_reward: string | null
          loyalty_target: number | null
          name: string | null
          phone: string | null
          slot_buffer_min: number | null
          tagline: string | null
          testimonials: Json | null
          theme_custom: Json | null
          theme_preset: string | null
          whatsapp: string | null
          work_hours: Json | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          barbershop_id?: string | null
          blocked_dates?: Json | null
          description?: string | null
          gallery?: Json | null
          gallery_urls?: Json | null
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number | null
          name?: string | null
          phone?: string | null
          slot_buffer_min?: number | null
          tagline?: string | null
          testimonials?: Json | null
          theme_custom?: Json | null
          theme_preset?: string | null
          whatsapp?: string | null
          work_hours?: Json | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          barbershop_id?: string | null
          blocked_dates?: Json | null
          description?: string | null
          gallery?: Json | null
          gallery_urls?: Json | null
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number | null
          name?: string | null
          phone?: string | null
          slot_buffer_min?: number | null
          tagline?: string | null
          testimonials?: Json | null
          theme_custom?: Json | null
          theme_preset?: string | null
          whatsapp?: string | null
          work_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_barbershop_invite: {
        Args: { _token_hash: string }
        Returns: string
      }
      access_logout: { Args: { _token: string }; Returns: boolean }
      assign_barbershop_admin: {
        Args: { _barbershop_id: string; _email: string }
        Returns: string
      }
      barber_user_owns_appt: {
        Args: { _barber_id: string; _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_barbershop_invite: { Args: { _id: string }; Returns: boolean }
      check_login_rate_limit: {
        Args: { _ip: string; _slug: string }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      claim_superadmin: { Args: never; Returns: boolean }
      create_barbershop_invite: {
        Args: { _barbershop_id: string; _email: string; _token_hash: string }
        Returns: string
      }
      create_public_appointment: {
        Args: {
          _barber_id: string
          _barbershop_id: string
          _client_name: string
          _client_phone: string
          _date: string
          _notes?: string
          _service_id: string
          _time: string
        }
        Returns: string
      }
      get_audit_log: {
        Args: { _barbershop_id: string; _limit?: number }
        Returns: {
          actor_kind: string
          actor_label: string
          barbershop_id: string
          created_at: string
          event: string
          id: string
          ip: string
          metadata: Json
        }[]
      }
      get_invite_by_hash: {
        Args: { _token_hash: string }
        Returns: {
          barbershop_name: string
          barbershop_slug: string
          email: string
          expires_at: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in: {
        Args: {
          _barbershop_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _actor_id: string
          _actor_kind: string
          _actor_label: string
          _barbershop_id: string
          _event: string
          _ip: string
          _metadata: Json
          _user_agent: string
        }
        Returns: undefined
      }
      login_barber: {
        Args: { _password: string; _slug: string; _username: string }
        Returns: string
      }
      login_barber_v2: {
        Args: {
          _ip: string
          _password: string
          _slug: string
          _user_agent: string
          _username: string
        }
        Returns: string
      }
      login_barbershop_admin: {
        Args: { _password: string; _slug: string; _username: string }
        Returns: string
      }
      login_barbershop_admin_v2: {
        Args: {
          _ip: string
          _password: string
          _slug: string
          _user_agent: string
          _username: string
        }
        Returns: string
      }
      public_cancel_my_appointment: {
        Args: { _id: string; _phone: string }
        Returns: boolean
      }
      public_get_client_loyalty: {
        Args: { _barbershop_id: string; _phone: string }
        Returns: {
          loyalty_points: number
          name: string
        }[]
      }
      public_get_my_appointments: {
        Args: { _barbershop_id: string; _phone: string }
        Returns: {
          barber_name: string
          date: string
          duration: number
          end_time: string
          id: string
          price: number
          service_name: string
          status: string
          time: string
        }[]
      }
      public_get_taken_slots: {
        Args: { _barber_id: string; _date: string }
        Returns: {
          end_time: string
          time: string
        }[]
      }
      public_upsert_client: {
        Args: { _barbershop_id: string; _name: string; _phone: string }
        Returns: string
      }
      record_login_attempt: {
        Args: { _ip: string; _slug: string; _success: boolean }
        Returns: undefined
      }
      set_barber_credentials: {
        Args: {
          _admin_token: string
          _barber_id: string
          _password: string
          _username: string
        }
        Returns: boolean
      }
      set_barbershop_admin_credentials: {
        Args: { _barbershop_id: string; _password: string; _username: string }
        Returns: boolean
      }
      shop_barbers_gate_info: {
        Args: { _slug: string }
        Returns: {
          has_any_barber_gate: boolean
        }[]
      }
      update_barbershop_basic: {
        Args: { _id: string; _name: string; _slug: string; _status: string }
        Returns: boolean
      }
      verify_access_token: {
        Args: { _token: string }
        Returns: {
          barber_id: string
          barbershop_id: string
          barbershop_slug: string
          kind: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "barber" | "superadmin"
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
      app_role: ["admin", "barber", "superadmin"],
    },
  },
} as const
