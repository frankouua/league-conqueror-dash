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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          applied_by: string
          created_at: string
          date: string
          id: string
          points: number
          reason: string
          team_id: string
          type: Database["public"]["Enums"]["card_type"]
        }
        Insert: {
          applied_by: string
          created_at?: string
          date?: string
          id?: string
          points: number
          reason: string
          team_id: string
          type: Database["public"]["Enums"]["card_type"]
        }
        Update: {
          applied_by?: string
          created_at?: string
          date?: string
          id?: string
          points?: number
          reason?: string
          team_id?: string
          type?: Database["public"]["Enums"]["card_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contestations: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          deadline: string
          description: string
          id: string
          related_record_id: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["contestation_status"]
          team_id: string
          title: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          deadline?: string
          description: string
          id?: string
          related_record_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["contestation_status"]
          team_id: string
          title: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          deadline?: string
          description?: string
          id?: string
          related_record_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["contestation_status"]
          team_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contestations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_goals: {
        Row: {
          created_at: string
          id: string
          meta2_goal: number | null
          meta3_goal: number | null
          month: number
          nps_goal: number | null
          referrals_goal: number | null
          revenue_goal: number | null
          team_id: string
          testimonials_goal: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          meta2_goal?: number | null
          meta3_goal?: number | null
          month: number
          nps_goal?: number | null
          referrals_goal?: number | null
          revenue_goal?: number | null
          team_id: string
          testimonials_goal?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          meta2_goal?: number | null
          meta3_goal?: number | null
          month?: number
          nps_goal?: number | null
          referrals_goal?: number | null
          revenue_goal?: number | null
          team_id?: string
          testimonials_goal?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "individual_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_checklist_progress: {
        Row: {
          action_index: number
          completed: boolean
          created_at: string
          id: string
          stage_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          action_index: number
          completed?: boolean
          created_at?: string
          id?: string
          stage_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          action_index?: number
          completed?: boolean
          created_at?: string
          id?: string
          stage_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kanban_checklist_progress: {
        Row: {
          action_index: number
          completed: boolean | null
          completed_by: string
          created_at: string | null
          id: string
          lead_id: string
          stage_key: string
          updated_at: string | null
        }
        Insert: {
          action_index: number
          completed?: boolean | null
          completed_by: string
          created_at?: string | null
          id?: string
          lead_id: string
          stage_key: string
          updated_at?: string | null
        }
        Update: {
          action_index?: number
          completed?: boolean | null
          completed_by?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          stage_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_checklist_progress_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "referral_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          team_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          team_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          team_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_records: {
        Row: {
          attributed_to_user_id: string | null
          cited_member: boolean
          counts_for_individual: boolean
          created_at: string
          date: string
          id: string
          member_name: string | null
          registered_by_admin: boolean
          score: number
          team_id: string
          user_id: string
        }
        Insert: {
          attributed_to_user_id?: string | null
          cited_member?: boolean
          counts_for_individual?: boolean
          created_at?: string
          date: string
          id?: string
          member_name?: string | null
          registered_by_admin?: boolean
          score: number
          team_id: string
          user_id: string
        }
        Update: {
          attributed_to_user_id?: string | null
          cited_member?: boolean
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          id?: string
          member_name?: string | null
          registered_by_admin?: boolean
          score?: number
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      other_indicators: {
        Row: {
          ambassadors: number
          attributed_to_user_id: string | null
          counts_for_individual: boolean
          created_at: string
          date: string
          id: string
          instagram_mentions: number
          registered_by_admin: boolean
          team_id: string
          unilovers: number
          user_id: string
        }
        Insert: {
          ambassadors?: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date: string
          id?: string
          instagram_mentions?: number
          registered_by_admin?: boolean
          team_id: string
          unilovers?: number
          user_id: string
        }
        Update: {
          ambassadors?: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          id?: string
          instagram_mentions?: number
          registered_by_admin?: boolean
          team_id?: string
          unilovers?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_indicators_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id: string
          position: Database["public"]["Enums"]["position_type"] | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id?: string
          position?: Database["public"]["Enums"]["position_type"] | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string
          full_name?: string
          id?: string
          position?: Database["public"]["Enums"]["position_type"] | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_lead_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          lead_id: string
          new_status: Database["public"]["Enums"]["referral_lead_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["referral_lead_status"] | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          lead_id: string
          new_status: Database["public"]["Enums"]["referral_lead_status"]
          note?: string | null
          old_status?:
            | Database["public"]["Enums"]["referral_lead_status"]
            | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: Database["public"]["Enums"]["referral_lead_status"]
          note?: string | null
          old_status?:
            | Database["public"]["Enums"]["referral_lead_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "referral_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_leads: {
        Row: {
          assigned_to: string | null
          consultation_date: string | null
          created_at: string
          id: string
          last_contact_at: string | null
          loss_reason: string | null
          notes: string | null
          photo_url: string | null
          referred_email: string | null
          referred_name: string
          referred_phone: string | null
          referrer_name: string
          referrer_phone: string | null
          registered_by: string
          status: Database["public"]["Enums"]["referral_lead_status"]
          surgery_date: string | null
          team_id: string
          temperature: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          consultation_date?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          photo_url?: string | null
          referred_email?: string | null
          referred_name: string
          referred_phone?: string | null
          referrer_name: string
          referrer_phone?: string | null
          registered_by: string
          status?: Database["public"]["Enums"]["referral_lead_status"]
          surgery_date?: string | null
          team_id: string
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          consultation_date?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          photo_url?: string | null
          referred_email?: string | null
          referred_name?: string
          referred_phone?: string | null
          referrer_name?: string
          referrer_phone?: string | null
          registered_by?: string
          status?: Database["public"]["Enums"]["referral_lead_status"]
          surgery_date?: string | null
          team_id?: string
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_records: {
        Row: {
          attributed_to_user_id: string | null
          collected: number
          counts_for_individual: boolean
          created_at: string
          date: string
          id: string
          patient_name: string | null
          registered_by_admin: boolean
          team_id: string
          to_consultation: number
          to_surgery: number
          user_id: string
        }
        Insert: {
          attributed_to_user_id?: string | null
          collected?: number
          counts_for_individual?: boolean
          created_at?: string
          date: string
          id?: string
          patient_name?: string | null
          registered_by_admin?: boolean
          team_id: string
          to_consultation?: number
          to_surgery?: number
          user_id: string
        }
        Update: {
          attributed_to_user_id?: string | null
          collected?: number
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          id?: string
          patient_name?: string | null
          registered_by_admin?: boolean
          team_id?: string
          to_consultation?: number
          to_surgery?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          amount: number
          attributed_to_user_id: string | null
          counts_for_individual: boolean
          created_at: string
          date: string
          id: string
          notes: string | null
          registered_by_admin: boolean
          team_id: string
          user_id: string
        }
        Insert: {
          amount: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          registered_by_admin?: boolean
          team_id: string
          user_id: string
        }
        Update: {
          amount?: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          registered_by_admin?: boolean
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      special_events: {
        Row: {
          applied_by: string
          category: string
          created_at: string
          date: string
          description: string | null
          event_type: string
          id: string
          multiplier: number | null
          points: number
          team_id: string
        }
        Insert: {
          applied_by: string
          category: string
          created_at?: string
          date?: string
          description?: string | null
          event_type: string
          id?: string
          multiplier?: number | null
          points?: number
          team_id: string
        }
        Update: {
          applied_by?: string
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          event_type?: string
          id?: string
          multiplier?: number | null
          points?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          motto: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          motto?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          motto?: string | null
          name?: string
        }
        Relationships: []
      }
      testimonial_records: {
        Row: {
          attributed_to_user_id: string | null
          counts_for_individual: boolean
          created_at: string
          date: string
          id: string
          link: string | null
          patient_name: string | null
          registered_by_admin: boolean
          team_id: string
          type: Database["public"]["Enums"]["testimonial_type"]
          user_id: string
        }
        Insert: {
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date: string
          id?: string
          link?: string | null
          patient_name?: string | null
          registered_by_admin?: boolean
          team_id: string
          type: Database["public"]["Enums"]["testimonial_type"]
          user_id: string
        }
        Update: {
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          id?: string
          link?: string | null
          patient_name?: string | null
          registered_by_admin?: boolean
          team_id?: string
          type?: Database["public"]["Enums"]["testimonial_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonial_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      winning_streaks: {
        Row: {
          consecutive_wins: number
          created_at: string
          end_month: number
          id: string
          start_month: number
          team_id: string
          team_name: string
          year: number
        }
        Insert: {
          consecutive_wins: number
          created_at?: string
          end_month: number
          id?: string
          start_month: number
          team_id: string
          team_name: string
          year: number
        }
        Update: {
          consecutive_wins?: number
          created_at?: string
          end_month?: number
          id?: string
          start_month?: number
          team_id?: string
          team_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "winning_streaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_team_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "member" | "admin"
      card_type: "blue" | "white" | "yellow" | "red"
      contestation_status: "pending" | "approved" | "rejected"
      department_type:
        | "comercial"
        | "atendimento"
        | "marketing"
        | "administrativo"
        | "clinico"
      lead_temperature: "hot" | "warm" | "cold"
      position_type:
        | "comercial_1_captacao"
        | "comercial_2_closer"
        | "comercial_3_experiencia"
        | "comercial_4_farmer"
        | "sdr"
        | "coordenador"
        | "gerente"
        | "assistente"
        | "outro"
      referral_lead_status:
        | "nova"
        | "em_contato"
        | "sem_interesse"
        | "agendou"
        | "consultou"
        | "operou"
        | "pos_venda"
        | "relacionamento"
        | "ganho"
        | "perdido"
      testimonial_type: "google" | "video" | "gold"
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
      app_role: ["member", "admin"],
      card_type: ["blue", "white", "yellow", "red"],
      contestation_status: ["pending", "approved", "rejected"],
      department_type: [
        "comercial",
        "atendimento",
        "marketing",
        "administrativo",
        "clinico",
      ],
      lead_temperature: ["hot", "warm", "cold"],
      position_type: [
        "comercial_1_captacao",
        "comercial_2_closer",
        "comercial_3_experiencia",
        "comercial_4_farmer",
        "sdr",
        "coordenador",
        "gerente",
        "assistente",
        "outro",
      ],
      referral_lead_status: [
        "nova",
        "em_contato",
        "sem_interesse",
        "agendou",
        "consultou",
        "operou",
        "pos_venda",
        "relacionamento",
        "ganho",
        "perdido",
      ],
      testimonial_type: ["google", "video", "gold"],
    },
  },
} as const
