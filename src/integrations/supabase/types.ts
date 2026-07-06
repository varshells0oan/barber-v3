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
      barbers: {
        Row: {
          active: boolean
          barbershop_id: string
          bio: string | null
          blocked_dates: Json
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
          active?: boolean
          barbershop_id: string
          bio?: string | null
          blocked_dates?: Json
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
          active?: boolean
          barbershop_id?: string
          bio?: string | null
          blocked_dates?: Json
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
      barbershops: {
        Row: {
          address: string | null
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
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_reward: string | null
          loyalty_target: number
          name: string
          phone: string | null
          slot_buffer_min: number
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
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number
          name?: string
          phone?: string | null
          slot_buffer_min?: number
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
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_reward?: string | null
          loyalty_target?: number
          name?: string
          phone?: string | null
          slot_buffer_min?: number
          updated_at?: string
          whatsapp?: string | null
          work_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
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
      [_ in never]: never
    }
    Functions: {
      barber_user_owns_appt: {
        Args: { _barber_id: string; _barbershop_id: string; _user_id: string }
        Returns: boolean
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
