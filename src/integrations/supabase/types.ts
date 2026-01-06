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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_favorite: boolean
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          send_email: boolean | null
          send_whatsapp: boolean | null
          target_team_id: string | null
          target_type: string | null
          target_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          target_team_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          target_team_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_actions: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          order_index: number
          title: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_actions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_alerts: {
        Row: {
          alert_type: string
          campaign_id: string
          id: string
          message: string | null
          sent_at: string
        }
        Insert: {
          alert_type: string
          campaign_id: string
          id?: string
          message?: string | null
          sent_at?: string
        }
        Update: {
          alert_type?: string
          campaign_id?: string
          id?: string
          message?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_checklist_progress: {
        Row: {
          action_id: string
          campaign_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id: string
          campaign_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_id?: string
          campaign_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_checklist_progress_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "campaign_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_checklist_progress_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_materials: {
        Row: {
          campaign_id: string
          content: string | null
          created_at: string
          created_by: string
          id: string
          material_type: string
          order_index: number
          title: string
          url: string | null
        }
        Insert: {
          campaign_id: string
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          material_type: string
          order_index?: number
          title: string
          url?: string | null
        }
        Update: {
          campaign_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          material_type?: string
          order_index?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_materials_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_suggestions: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string | null
          id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          suggested_goal: string | null
          suggested_prize: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          suggested_goal?: string | null
          suggested_prize?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          suggested_goal?: string | null
          suggested_prize?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          alert_days_before: number | null
          campaign_type: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          goal_description: string | null
          goal_metric: string | null
          goal_value: number | null
          id: string
          is_active: boolean
          is_template: boolean
          name: string
          prize_description: string | null
          prize_value: number | null
          start_date: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          alert_days_before?: number | null
          campaign_type: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          goal_description?: string | null
          goal_metric?: string | null
          goal_value?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          prize_description?: string | null
          prize_value?: number | null
          start_date: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_days_before?: number | null
          campaign_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          goal_description?: string | null
          goal_metric?: string | null
          goal_value?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          prize_description?: string | null
          prize_value?: number | null
          start_date?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_history: {
        Row: {
          action: string
          cancellation_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["cancellation_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["cancellation_status"] | null
          performed_by: string
        }
        Insert: {
          action: string
          cancellation_id: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["cancellation_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["cancellation_status"] | null
          performed_by: string
        }
        Update: {
          action?: string
          cancellation_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["cancellation_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["cancellation_status"] | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_history_cancellation_id_fkey"
            columns: ["cancellation_id"]
            isOneToOne: false
            referencedRelation: "cancellations"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          apply_fine: boolean
          cancellation_request_date: string
          contract_signed: boolean | null
          contract_url: string | null
          contract_value: number
          created_at: string
          credit_used_at: string | null
          credit_used_for: string | null
          credit_valid_until: string | null
          fine_amount: number | null
          fine_percentage: number
          id: string
          original_sale_date: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string | null
          procedure_name: string
          reason: Database["public"]["Enums"]["cancellation_reason"]
          reason_details: string | null
          refund_amount: number | null
          refund_completed: boolean | null
          refund_completed_at: string | null
          refund_deadline: string | null
          retained_at: string | null
          retained_by: string | null
          retention_attempts: number
          retention_notes: string | null
          status: Database["public"]["Enums"]["cancellation_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_fine?: boolean
          cancellation_request_date?: string
          contract_signed?: boolean | null
          contract_url?: string | null
          contract_value: number
          created_at?: string
          credit_used_at?: string | null
          credit_used_for?: string | null
          credit_valid_until?: string | null
          fine_amount?: number | null
          fine_percentage?: number
          id?: string
          original_sale_date?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone?: string | null
          procedure_name: string
          reason: Database["public"]["Enums"]["cancellation_reason"]
          reason_details?: string | null
          refund_amount?: number | null
          refund_completed?: boolean | null
          refund_completed_at?: string | null
          refund_deadline?: string | null
          retained_at?: string | null
          retained_by?: string | null
          retention_attempts?: number
          retention_notes?: string | null
          status?: Database["public"]["Enums"]["cancellation_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_fine?: boolean
          cancellation_request_date?: string
          contract_signed?: boolean | null
          contract_url?: string | null
          contract_value?: number
          created_at?: string
          credit_used_at?: string | null
          credit_used_for?: string | null
          credit_valid_until?: string | null
          fine_amount?: number | null
          fine_percentage?: number
          id?: string
          original_sale_date?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string | null
          procedure_name?: string
          reason?: Database["public"]["Enums"]["cancellation_reason"]
          reason_details?: string | null
          refund_amount?: number | null
          refund_completed?: boolean | null
          refund_completed_at?: string | null
          refund_deadline?: string | null
          retained_at?: string | null
          retained_by?: string | null
          retention_attempts?: number
          retention_notes?: string | null
          status?: Database["public"]["Enums"]["cancellation_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
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
      department_goals: {
        Row: {
          created_at: string
          department_name: string
          id: string
          meta1_goal: number
          meta2_goal: number
          meta3_goal: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          department_name: string
          id?: string
          meta1_goal?: number
          meta2_goal?: number
          meta3_goal?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          department_name?: string
          id?: string
          meta1_goal?: number
          meta2_goal?: number
          meta3_goal?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      executed_records: {
        Row: {
          amount: number
          attributed_to_user_id: string | null
          counts_for_individual: boolean
          created_at: string
          date: string
          department: string | null
          executor_name: string | null
          id: string
          influencer_name: string | null
          notes: string | null
          origin: string | null
          patient_cpf: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_prontuario: string | null
          procedure_name: string | null
          referral_name: string | null
          registered_by_admin: boolean
          source_fingerprint: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          amount: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date: string
          department?: string | null
          executor_name?: string | null
          id?: string
          influencer_name?: string | null
          notes?: string | null
          origin?: string | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          procedure_name?: string | null
          referral_name?: string | null
          registered_by_admin?: boolean
          source_fingerprint?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          amount?: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          department?: string | null
          executor_name?: string | null
          id?: string
          influencer_name?: string | null
          notes?: string | null
          origin?: string | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          procedure_name?: string | null
          referral_name?: string | null
          registered_by_admin?: boolean
          source_fingerprint?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executed_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feegow_sync_logs: {
        Row: {
          completed_at: string | null
          date_end: string | null
          date_start: string | null
          error_message: string | null
          errors: number | null
          id: string
          inserted: number | null
          paid_accounts: number | null
          sellers_not_found: string[] | null
          skipped: number | null
          started_at: string
          status: string
          total_accounts: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          date_end?: string | null
          date_start?: string | null
          error_message?: string | null
          errors?: number | null
          id?: string
          inserted?: number | null
          paid_accounts?: number | null
          sellers_not_found?: string[] | null
          skipped?: number | null
          started_at?: string
          status?: string
          total_accounts?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          date_end?: string | null
          date_start?: string | null
          error_message?: string | null
          errors?: number | null
          id?: string
          inserted?: number | null
          paid_accounts?: number | null
          sellers_not_found?: string[] | null
          skipped?: number | null
          started_at?: string
          status?: string
          total_accounts?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      feegow_user_mapping: {
        Row: {
          created_at: string
          created_by: string | null
          feegow_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feegow_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feegow_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      icp_analysis: {
        Row: {
          age_range: string | null
          analysis_date: string | null
          average_ticket: number | null
          barriers: string[] | null
          conversion_rate: number | null
          created_at: string
          created_by: string | null
          customer_count: number | null
          gender: string | null
          id: string
          income_range: string | null
          location: string | null
          main_influencers: string[] | null
          main_origins: string[] | null
          main_procedures: string[] | null
          motivations: string[] | null
          objectives: string[] | null
          pain_points: string[] | null
          profession: string | null
          purchase_frequency: string | null
          raw_data: Json | null
          segment_name: string | null
          segment_type: string | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          analysis_date?: string | null
          average_ticket?: number | null
          barriers?: string[] | null
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          customer_count?: number | null
          gender?: string | null
          id?: string
          income_range?: string | null
          location?: string | null
          main_influencers?: string[] | null
          main_origins?: string[] | null
          main_procedures?: string[] | null
          motivations?: string[] | null
          objectives?: string[] | null
          pain_points?: string[] | null
          profession?: string | null
          purchase_frequency?: string | null
          raw_data?: Json | null
          segment_name?: string | null
          segment_type?: string | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          analysis_date?: string | null
          average_ticket?: number | null
          barriers?: string[] | null
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          customer_count?: number | null
          gender?: string | null
          id?: string
          income_range?: string | null
          location?: string | null
          main_influencers?: string[] | null
          main_origins?: string[] | null
          main_procedures?: string[] | null
          motivations?: string[] | null
          objectives?: string[] | null
          pain_points?: string[] | null
          profession?: string | null
          purchase_frequency?: string | null
          raw_data?: Json | null
          segment_name?: string | null
          segment_type?: string | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      individual_goals: {
        Row: {
          created_at: string
          department_name: string | null
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
          department_name?: string | null
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
          department_name?: string | null
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
      patient_data: {
        Row: {
          address: string | null
          age: number | null
          birth_date: string | null
          cep: string | null
          children_count: number | null
          city: string | null
          country: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_source: string | null
          desires: string | null
          dreams: string | null
          email: string | null
          expectations: string | null
          fears: string | null
          first_contact_date: string | null
          first_purchase_date: string | null
          gender: string | null
          has_children: boolean | null
          height_cm: number | null
          id: string
          influencer_name: string | null
          instagram_handle: string | null
          last_contact_date: string | null
          last_purchase_date: string | null
          main_objective: string | null
          marital_status: string | null
          name: string
          nationality: string | null
          neighborhood: string | null
          origin: string | null
          origin_detail: string | null
          phone: string | null
          preferred_procedures: string | null
          profession: string | null
          prontuario: string | null
          referral_name: string | null
          state: string | null
          total_procedures: number | null
          total_value_executed: number | null
          total_value_sold: number | null
          updated_at: string
          weight_kg: number | null
          whatsapp: string | null
          why_not_done_yet: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          cep?: string | null
          children_count?: number | null
          city?: string | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          desires?: string | null
          dreams?: string | null
          email?: string | null
          expectations?: string | null
          fears?: string | null
          first_contact_date?: string | null
          first_purchase_date?: string | null
          gender?: string | null
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          influencer_name?: string | null
          instagram_handle?: string | null
          last_contact_date?: string | null
          last_purchase_date?: string | null
          main_objective?: string | null
          marital_status?: string | null
          name: string
          nationality?: string | null
          neighborhood?: string | null
          origin?: string | null
          origin_detail?: string | null
          phone?: string | null
          preferred_procedures?: string | null
          profession?: string | null
          prontuario?: string | null
          referral_name?: string | null
          state?: string | null
          total_procedures?: number | null
          total_value_executed?: number | null
          total_value_sold?: number | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp?: string | null
          why_not_done_yet?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          cep?: string | null
          children_count?: number | null
          city?: string | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          desires?: string | null
          dreams?: string | null
          email?: string | null
          expectations?: string | null
          fears?: string | null
          first_contact_date?: string | null
          first_purchase_date?: string | null
          gender?: string | null
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          influencer_name?: string | null
          instagram_handle?: string | null
          last_contact_date?: string | null
          last_purchase_date?: string | null
          main_objective?: string | null
          marital_status?: string | null
          name?: string
          nationality?: string | null
          neighborhood?: string | null
          origin?: string | null
          origin_detail?: string | null
          phone?: string | null
          preferred_procedures?: string | null
          profession?: string | null
          prontuario?: string | null
          referral_name?: string | null
          state?: string | null
          total_procedures?: number | null
          total_value_executed?: number | null
          total_value_sold?: number | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp?: string | null
          why_not_done_yet?: string | null
        }
        Relationships: []
      }
      period_locks: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          locked_at: string
          locked_by: string
          month: number
          notes: string | null
          record_type: string
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          locked_at?: string
          locked_by: string
          month: number
          notes?: string | null
          record_type: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          locked_at?: string
          locked_by?: string
          month?: number
          notes?: string | null
          record_type?: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      predefined_goals: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          contest_reason: string | null
          contested: boolean
          created_at: string
          department: string
          first_name: string
          id: string
          matched_user_id: string | null
          meta1_goal: number
          meta2_goal: number
          meta3_goal: number
          month: number
          position: string
          updated_at: string
          year: number
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          contest_reason?: string | null
          contested?: boolean
          created_at?: string
          department: string
          first_name: string
          id?: string
          matched_user_id?: string | null
          meta1_goal?: number
          meta2_goal?: number
          meta3_goal?: number
          month: number
          position: string
          updated_at?: string
          year: number
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          contest_reason?: string | null
          contested?: boolean
          created_at?: string
          department?: string
          first_name?: string
          id?: string
          matched_user_id?: string | null
          meta1_goal?: number
          meta2_goal?: number
          meta3_goal?: number
          month?: number
          position?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id: string
          is_approved: boolean | null
          phone: string | null
          position: Database["public"]["Enums"]["position_type"] | null
          team_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          position?: Database["public"]["Enums"]["position_type"] | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string
          full_name?: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          position?: Database["public"]["Enums"]["position_type"] | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
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
      protocol_offers: {
        Row: {
          converted_at: string | null
          converted_value: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_segment: string | null
          id: string
          message_sent: string | null
          offer_channel: string | null
          offered_by: string
          offered_by_name: string | null
          protocol_id: string
          response_notes: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          converted_value?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_segment?: string | null
          id?: string
          message_sent?: string | null
          offer_channel?: string | null
          offered_by: string
          offered_by_name?: string | null
          protocol_id: string
          response_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          converted_value?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_segment?: string | null
          id?: string
          message_sent?: string | null
          offer_channel?: string | null
          offered_by?: string
          offered_by_name?: string | null
          protocol_id?: string
          response_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_offers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "rfv_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_offers_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          benefits: string[] | null
          campaign_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_days: number | null
          id: string
          included_items: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          materials: Json | null
          name: string
          price: number | null
          promotional_price: number | null
          protocol_type: string
          sales_script: string | null
          target_audience: string | null
          target_segments: string[] | null
          updated_at: string
          whatsapp_scripts: Json | null
        }
        Insert: {
          benefits?: string[] | null
          campaign_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_days?: number | null
          id?: string
          included_items?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          materials?: Json | null
          name: string
          price?: number | null
          promotional_price?: number | null
          protocol_type: string
          sales_script?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          updated_at?: string
          whatsapp_scripts?: Json | null
        }
        Update: {
          benefits?: string[] | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          included_items?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          materials?: Json | null
          name?: string
          price?: number | null
          promotional_price?: number | null
          protocol_type?: string
          sales_script?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          updated_at?: string
          whatsapp_scripts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
          department: string | null
          executor_name: string | null
          id: string
          influencer_name: string | null
          notes: string | null
          origin: string | null
          patient_cpf: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_prontuario: string | null
          procedure_name: string | null
          referral_name: string | null
          registered_by_admin: boolean
          source_fingerprint: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          amount: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date: string
          department?: string | null
          executor_name?: string | null
          id?: string
          influencer_name?: string | null
          notes?: string | null
          origin?: string | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          procedure_name?: string | null
          referral_name?: string | null
          registered_by_admin?: boolean
          source_fingerprint?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          amount?: number
          attributed_to_user_id?: string | null
          counts_for_individual?: boolean
          created_at?: string
          date?: string
          department?: string | null
          executor_name?: string | null
          id?: string
          influencer_name?: string | null
          notes?: string | null
          origin?: string | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          procedure_name?: string | null
          referral_name?: string | null
          registered_by_admin?: boolean
          source_fingerprint?: string | null
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
      rfv_action_history: {
        Row: {
          action_type: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          notes: string | null
          performed_by: string
          performed_by_name: string | null
          result: string | null
          scheduled_callback: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          performed_by: string
          performed_by_name?: string | null
          result?: string | null
          scheduled_callback?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          performed_by?: string
          performed_by_name?: string | null
          result?: string | null
          scheduled_callback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfv_action_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "rfv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfv_customers: {
        Row: {
          average_ticket: number
          children_count: number | null
          country: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          days_since_last_purchase: number
          email: string | null
          first_purchase_date: string
          frequency_score: number
          has_children: boolean | null
          height_cm: number | null
          id: string
          last_purchase_date: string
          main_objective: string | null
          name: string
          phone: string | null
          profession: string | null
          prontuario: string | null
          recency_score: number
          segment: string
          total_purchases: number
          total_value: number
          updated_at: string
          value_score: number
          weight_kg: number | null
          whatsapp: string | null
          why_not_done_yet: string | null
        }
        Insert: {
          average_ticket?: number
          children_count?: number | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          days_since_last_purchase?: number
          email?: string | null
          first_purchase_date: string
          frequency_score?: number
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          last_purchase_date: string
          main_objective?: string | null
          name: string
          phone?: string | null
          profession?: string | null
          prontuario?: string | null
          recency_score?: number
          segment?: string
          total_purchases?: number
          total_value?: number
          updated_at?: string
          value_score?: number
          weight_kg?: number | null
          whatsapp?: string | null
          why_not_done_yet?: string | null
        }
        Update: {
          average_ticket?: number
          children_count?: number | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          days_since_last_purchase?: number
          email?: string | null
          first_purchase_date?: string
          frequency_score?: number
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          last_purchase_date?: string
          main_objective?: string | null
          name?: string
          phone?: string | null
          profession?: string | null
          prontuario?: string | null
          recency_score?: number
          segment?: string
          total_purchases?: number
          total_value?: number
          updated_at?: string
          value_score?: number
          weight_kg?: number | null
          whatsapp?: string | null
          why_not_done_yet?: string | null
        }
        Relationships: []
      }
      rfv_upload_logs: {
        Row: {
          created_at: string
          data_reference_date: string | null
          file_name: string | null
          id: string
          notes: string | null
          segment_breakdown: Json | null
          total_customers: number
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          data_reference_date?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          segment_breakdown?: Json | null
          total_customers?: number
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          created_at?: string
          data_reference_date?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          segment_breakdown?: Json | null
          total_customers?: number
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: []
      }
      sales_upload_logs: {
        Row: {
          date_range_end: string | null
          date_range_start: string | null
          error_rows: number
          file_name: string
          id: string
          imported_rows: number
          notes: string | null
          sheet_name: string | null
          skipped_rows: number
          status: string
          total_revenue_paid: number
          total_revenue_sold: number
          total_rows: number
          upload_type: string
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          date_range_end?: string | null
          date_range_start?: string | null
          error_rows?: number
          file_name: string
          id?: string
          imported_rows?: number
          notes?: string | null
          sheet_name?: string | null
          skipped_rows?: number
          status?: string
          total_revenue_paid?: number
          total_revenue_sold?: number
          total_rows?: number
          upload_type?: string
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          date_range_end?: string | null
          date_range_start?: string | null
          error_rows?: number
          file_name?: string
          id?: string
          imported_rows?: number
          notes?: string | null
          sheet_name?: string | null
          skipped_rows?: number
          status?: string
          total_revenue_paid?: number
          total_revenue_sold?: number
          total_rows?: number
          upload_type?: string
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: []
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
      team_prizes: {
        Row: {
          amount: number
          awarded_at: string
          awarded_by: string
          created_at: string
          extra_rewards: string | null
          id: string
          items: string[] | null
          notes: string | null
          period_month: number | null
          period_semester: number | null
          prize_type: string
          team_id: string
          year: number
        }
        Insert: {
          amount?: number
          awarded_at?: string
          awarded_by: string
          created_at?: string
          extra_rewards?: string | null
          id?: string
          items?: string[] | null
          notes?: string | null
          period_month?: number | null
          period_semester?: number | null
          prize_type: string
          team_id: string
          year: number
        }
        Update: {
          amount?: number
          awarded_at?: string
          awarded_by?: string
          created_at?: string
          extra_rewards?: string | null
          id?: string
          items?: string[] | null
          notes?: string | null
          period_month?: number | null
          period_semester?: number | null
          prize_type?: string
          team_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_prizes_team_id_fkey"
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
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          metadata: Json | null
          month: number | null
          points_value: number | null
          team_id: string | null
          unlocked_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          month?: number | null
          points_value?: number | null
          team_id?: string | null
          unlocked_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          month?: number | null
          points_value?: number | null
          team_id?: string | null
          unlocked_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_approval_requests: {
        Row: {
          id: string
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
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
      approve_user: { Args: { _user_id: string }; Returns: undefined }
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
      reject_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "member" | "admin"
      cancellation_reason:
        | "financial"
        | "health"
        | "dissatisfaction"
        | "changed_mind"
        | "competitor"
        | "scheduling"
        | "personal"
        | "other"
      cancellation_status:
        | "pending_retention"
        | "retention_attempt"
        | "retained"
        | "cancelled_with_fine"
        | "cancelled_no_fine"
        | "credit_used"
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
      cancellation_reason: [
        "financial",
        "health",
        "dissatisfaction",
        "changed_mind",
        "competitor",
        "scheduling",
        "personal",
        "other",
      ],
      cancellation_status: [
        "pending_retention",
        "retention_attempt",
        "retained",
        "cancelled_with_fine",
        "cancelled_no_fine",
        "credit_used",
      ],
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
