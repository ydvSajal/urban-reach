export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      councils: {
        Row: {
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          council_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          council_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          council_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
        ]
      }
      report_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["report_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["report_status"] | null
          report_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["report_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["report_status"] | null
          report_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["report_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["report_status"] | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_status_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          assigned_worker_id: string | null
          category: Database["public"]["Enums"]["report_category"]
          citizen_id: string
          council_id: string
          created_at: string
          description: string
          id: string
          images: string[] | null
          latitude: number | null
          location_address: string
          longitude: number | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          report_number: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_worker_id?: string | null
          category: Database["public"]["Enums"]["report_category"]
          citizen_id: string
          council_id: string
          created_at?: string
          description: string
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_address: string
          longitude?: number | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          report_number: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_worker_id?: string | null
          category?: Database["public"]["Enums"]["report_category"]
          citizen_id?: string
          council_id?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_address?: string
          longitude?: number | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          report_number?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          avg_completion_time: number | null
          council_id: string
          created_at: string
          current_workload: number | null
          email: string
          full_name: string
          id: string
          is_available: boolean | null
          max_workload: number | null
          performance_rating: number | null
          phone: string | null
          specialty: string | null
          total_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_completion_time?: number | null
          council_id: string
          created_at?: string
          current_workload?: number | null
          email: string
          full_name: string
          id?: string
          is_available?: boolean | null
          max_workload?: number | null
          performance_rating?: number | null
          phone?: string | null
          specialty?: string | null
          total_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_completion_time?: number | null
          council_id?: string
          created_at?: string
          current_workload?: number | null
          email?: string
          full_name?: string
          id?: string
          is_available?: boolean | null
          max_workload?: number | null
          performance_rating?: number | null
          phone?: string | null
          specialty?: string | null
          total_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_specialties: {
        Row: {
          category_mapping: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category_mapping?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category_mapping?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      worker_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          worker_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_assignments: boolean
          email_new_reports: boolean
          email_status_changes: boolean
          id: string
          push_assignments: boolean
          push_new_reports: boolean
          push_status_changes: boolean
          sms_urgent_only: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_assignments?: boolean
          email_new_reports?: boolean
          email_status_changes?: boolean
          id?: string
          push_assignments?: boolean
          push_new_reports?: boolean
          push_status_changes?: boolean
          sms_urgent_only?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_assignments?: boolean
          email_new_reports?: boolean
          email_status_changes?: boolean
          id?: string
          push_assignments?: boolean
          push_new_reports?: boolean
          push_status_changes?: boolean
          sms_urgent_only?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      worker_performance_metrics: {
        Row: {
          active_reports: number | null
          actual_avg_completion_hours: number | null
          avg_completion_time: number | null
          completed_reports: number | null
          current_workload: number | null
          full_name: string | null
          id: string | null
          is_available: boolean | null
          max_workload: number | null
          pending_reports: number | null
          performance_rating: number | null
          specialty: string | null
          total_assigned: number | null
          total_completed: number | null
          workload_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_assign_worker: {
        Args: {
          report_id: string
        }
        Returns: string
      }
      calculate_worker_performance: {
        Args: {
          worker_id: string
        }
        Returns: number
      }
      generate_report_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_workers_for_category: {
        Args: {
          report_category: string
        }
        Returns: {
          current_workload: number
          full_name: string
          max_workload: number
          performance_rating: number
          specialty: string
          worker_id: string
          workload_percentage: number
        }[]
      }
      get_user_council: {
        Args: {
          user_uuid: string
        }
        Returns: string
      }
      get_user_role: {
        Args: {
          user_uuid: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_all_worker_performance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      priority_level: "low" | "medium" | "high"
      report_category:
        | "roads"
        | "sanitation"
        | "water_supply"
        | "electricity"
        | "public_safety"
        | "parks"
        | "drainage"
        | "waste_management"
        | "street_lights"
        | "other"
      report_status:
        | "pending"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "closed"
      user_role: "citizen" | "admin" | "worker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never