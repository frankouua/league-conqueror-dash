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
      action_batches: {
        Row: {
          action_type: string
          channel: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          filter_criteria: Json | null
          id: string
          name: string | null
          response_count: number | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          template_id: string | null
          total_leads: number | null
          total_points_generated: number | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          channel: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          filter_criteria?: Json | null
          id?: string
          name?: string | null
          response_count?: number | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_leads?: number | null
          total_points_generated?: number | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          filter_criteria?: Json | null
          id?: string
          name?: string | null
          response_count?: number | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_leads?: number | null
          total_points_generated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_batches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "action_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      action_dispatches: {
        Row: {
          action_type: string
          batch_id: string | null
          bonus_earned: number | null
          channel: string
          created_at: string | null
          id: string
          lead_id: string
          message_content: string | null
          points_earned: number | null
          response_at: string | null
          response_content: string | null
          response_received: boolean | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          variables_used: Json | null
        }
        Insert: {
          action_type: string
          batch_id?: string | null
          bonus_earned?: number | null
          channel?: string
          created_at?: string | null
          id?: string
          lead_id: string
          message_content?: string | null
          points_earned?: number | null
          response_at?: string | null
          response_content?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          variables_used?: Json | null
        }
        Update: {
          action_type?: string
          batch_id?: string | null
          bonus_earned?: number | null
          channel?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          message_content?: string | null
          points_earned?: number | null
          response_at?: string | null
          response_content?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "action_dispatches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_dispatches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "action_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      action_responses: {
        Row: {
          bonus_earned: number | null
          bonus_reason: string | null
          created_at: string | null
          dispatch_id: string | null
          id: string
          lead_id: string
          nps_score: number | null
          points_earned: number | null
          response_data: Json | null
          response_type: string
        }
        Insert: {
          bonus_earned?: number | null
          bonus_reason?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          id?: string
          lead_id: string
          nps_score?: number | null
          points_earned?: number | null
          response_data?: Json | null
          response_type: string
        }
        Update: {
          bonus_earned?: number | null
          bonus_reason?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          id?: string
          lead_id?: string
          nps_score?: number | null
          points_earned?: number | null
          response_data?: Json | null
          response_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_responses_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "action_dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      action_templates: {
        Row: {
          bonus_condition: string | null
          bonus_points: number | null
          category: string
          channel: string
          created_at: string | null
          created_by: string | null
          description: string | null
          form_fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          points_value: number | null
          template_text: string
          type: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          bonus_condition?: string | null
          bonus_points?: number | null
          category?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          points_value?: number | null
          template_text: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          bonus_condition?: string | null
          bonus_points?: number | null
          category?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_value?: number | null
          template_text?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
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
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          automation_type: string
          completed_at: string | null
          created_at: string
          errors: string[] | null
          id: string
          results: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          automation_type: string
          completed_at?: string | null
          created_at?: string
          errors?: string[] | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          automation_type?: string
          completed_at?: string | null
          created_at?: string
          errors?: string[] | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      automation_schedules: {
        Row: {
          automation_name: string
          created_at: string
          cron_expression: string
          description: string | null
          function_name: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          automation_name: string
          created_at?: string
          cron_expression: string
          description?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          automation_name?: string
          created_at?: string
          cron_expression?: string
          description?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bulk_action_logs: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          id: string
          lead_ids: string[]
          parameters: Json | null
          started_at: string | null
          status: string | null
          success_count: number | null
          total_leads: number | null
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          id?: string
          lead_ids: string[]
          parameters?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_leads?: number | null
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          id?: string
          lead_ids?: string[]
          parameters?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_leads?: number | null
        }
        Relationships: []
      }
      calendar_event_invitations: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          responded_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_team_event: boolean | null
          location: string | null
          start_date: string
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_team_event?: boolean | null
          location?: string | null
          start_date: string
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_team_event?: boolean | null
          location?: string | null
          start_date?: string
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
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
      contract_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          contract_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coordinator_validation_checklist: {
        Row: {
          contracts_signed: boolean | null
          created_at: string | null
          entry_payment_received: boolean | null
          id: string
          lead_id: string | null
          notes: string | null
          patient_data_complete: boolean | null
          payment_plan_confirmed: boolean | null
          surgery_date_confirmed: boolean | null
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          contracts_signed?: boolean | null
          created_at?: string | null
          entry_payment_received?: boolean | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_data_complete?: boolean | null
          payment_plan_confirmed?: boolean | null
          surgery_date_confirmed?: boolean | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          contracts_signed?: boolean | null
          created_at?: string | null
          entry_payment_received?: boolean | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_data_complete?: boolean | null
          payment_plan_confirmed?: boolean | null
          surgery_date_confirmed?: boolean | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_validation_checklist_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_achievements: {
        Row: {
          badge_level: string | null
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          name: string
          points_reward: number | null
          requirement_period: string | null
          requirement_type: string
          requirement_value: number
          updated_at: string | null
        }
        Insert: {
          badge_level?: string | null
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          name: string
          points_reward?: number | null
          requirement_period?: string | null
          requirement_type: string
          requirement_value: number
          updated_at?: string | null
        }
        Update: {
          badge_level?: string | null
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          name?: string
          points_reward?: number | null
          requirement_period?: string | null
          requirement_type?: string
          requirement_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_alert_config: {
        Row: {
          alert_type: string
          condition_config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string | null
          notify_channels: string[] | null
          notify_roles: string[] | null
          priority: string | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          condition_config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          notify_channels?: string[] | null
          notify_roles?: string[] | null
          priority?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          condition_config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          notify_channels?: string[] | null
          notify_roles?: string[] | null
          priority?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_automation_logs: {
        Row: {
          actions_executed: Json | null
          automation_id: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string
        }
        Insert: {
          actions_executed?: Json | null
          automation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
        }
        Update: {
          actions_executed?: Json | null
          automation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "crm_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automations: {
        Row: {
          actions: Json
          conditions: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          pipeline_id: string | null
          run_count: number | null
          stage_id: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          pipeline_id?: string | null
          run_count?: number | null
          stage_id?: string | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          pipeline_id?: string | null
          run_count?: number | null
          stage_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_automations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadence_executions: {
        Row: {
          cadence_id: string | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          result: Json | null
          scheduled_at: string
          status: string | null
        }
        Insert: {
          cadence_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          result?: Json | null
          scheduled_at: string
          status?: string | null
        }
        Update: {
          cadence_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          result?: Json | null
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadence_executions_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "crm_cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cadence_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadences: {
        Row: {
          action_type: string
          channel: string
          created_at: string | null
          created_by: string | null
          day_offset: number | null
          description: string | null
          escalation_rule: Json | null
          id: string
          is_active: boolean | null
          message_template: string | null
          message_variables: Json | null
          name: string
          order_index: number | null
          pipeline_id: string | null
          stage_id: string | null
          time_of_day: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          action_type?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          day_offset?: number | null
          description?: string | null
          escalation_rule?: Json | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          message_variables?: Json | null
          name: string
          order_index?: number | null
          pipeline_id?: string | null
          stage_id?: string | null
          time_of_day?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          day_offset?: number | null
          description?: string | null
          escalation_rule?: Json | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          message_variables?: Json | null
          name?: string
          order_index?: number | null
          pipeline_id?: string | null
          stage_id?: string | null
          time_of_day?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadences_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cadences_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_chat_messages: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          lead_id: string
          message_type: string | null
          metadata: Json | null
          sender_id: string
          sender_name: string | null
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          lead_id: string
          message_type?: string | null
          metadata?: Json | null
          sender_id: string
          sender_name?: string | null
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          lead_id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_chat_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cross_sell_opportunities: {
        Row: {
          assigned_to: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          estimated_value: number | null
          id: string
          lead_id: string | null
          priority: string | null
          source_procedure: string | null
          status: string | null
          suggested_procedure: string
          suggestion_reason: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          source_procedure?: string | null
          status?: string | null
          suggested_procedure: string
          suggestion_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          source_procedure?: string | null
          status?: string | null
          suggested_procedure?: string
          suggestion_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cross_sell_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_escalation_rules: {
        Row: {
          action_config: Json | null
          action_type: string | null
          condition_config: Json
          condition_type: string
          created_at: string | null
          description: string | null
          escalation_level: number | null
          id: string
          is_active: boolean | null
          name: string
          notify_roles: string[] | null
          notify_user_ids: string[] | null
          pipeline_id: string | null
          stage_id: string | null
          threshold_hours: number | null
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type?: string | null
          condition_config?: Json
          condition_type: string
          created_at?: string | null
          description?: string | null
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          pipeline_id?: string | null
          stage_id?: string | null
          threshold_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string | null
          condition_config?: Json
          condition_type?: string
          created_at?: string | null
          description?: string | null
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          pipeline_id?: string | null
          stage_id?: string | null
          threshold_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_escalation_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_escalation_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_form_responses: {
        Row: {
          campaign_name: string | null
          created_at: string
          form_name: string
          form_source: string | null
          id: string
          ip_address: string | null
          lead_id: string | null
          processed_at: string | null
          raw_payload: Json | null
          responses: Json
          submitted_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          form_name: string
          form_source?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          responses?: Json
          submitted_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          form_name?: string
          form_source?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          responses?: Json
          submitted_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_form_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_gamification_achievements: {
        Row: {
          badge_image_url: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          requirement_period: string | null
          requirement_type: string
          requirement_value: number
          xp_reward: number | null
        }
        Insert: {
          badge_image_url?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requirement_period?: string | null
          requirement_type: string
          requirement_value: number
          xp_reward?: number | null
        }
        Update: {
          badge_image_url?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requirement_period?: string | null
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number | null
        }
        Relationships: []
      }
      crm_gamification_points: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          multiplier: number | null
          period_month: number
          period_year: number
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          multiplier?: number | null
          period_month: number
          period_year: number
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          multiplier?: number | null
          period_month?: number
          period_year?: number
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_gamification_points_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_gamification_rules: {
        Row: {
          action_type: string
          base_points: number
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          multiplier_conditions: Json | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          base_points?: number
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          multiplier_conditions?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          base_points?: number
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          multiplier_conditions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_lead_checklist_progress: {
        Row: {
          action_index: number
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          lead_id: string
          stage_key: string
          updated_at: string
        }
        Insert: {
          action_index: number
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          stage_key: string
          updated_at?: string
        }
        Update: {
          action_index?: number
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_checklist_progress_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_history: {
        Row: {
          action_type: string
          ai_analysis: Json | null
          created_at: string
          description: string | null
          from_pipeline_id: string | null
          from_stage_id: string | null
          id: string
          lead_id: string
          metadata: Json | null
          performed_by: string
          title: string | null
          to_pipeline_id: string | null
          to_stage_id: string | null
        }
        Insert: {
          action_type: string
          ai_analysis?: Json | null
          created_at?: string
          description?: string | null
          from_pipeline_id?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          performed_by: string
          title?: string | null
          to_pipeline_id?: string | null
          to_stage_id?: string | null
        }
        Update: {
          action_type?: string
          ai_analysis?: Json | null
          created_at?: string
          description?: string | null
          from_pipeline_id?: string | null
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          performed_by?: string
          title?: string | null
          to_pipeline_id?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_history_from_pipeline_id_fkey"
            columns: ["from_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_history_to_pipeline_id_fkey"
            columns: ["to_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_interactions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_seconds: number | null
          id: string
          intention: string | null
          lead_id: string
          next_action: string | null
          outcome: string | null
          sentiment: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          intention?: string | null
          lead_id: string
          next_action?: string | null
          outcome?: string | null
          sentiment?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          intention?: string | null
          lead_id?: string
          next_action?: string | null
          outcome?: string | null
          sentiment?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_surgery_checklist: {
        Row: {
          checklist_id: string | null
          completed_at: string | null
          completed_by: string | null
          completed_items: Json | null
          completion_percentage: number | null
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_items?: Json | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_items?: Json | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_surgery_checklist_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "crm_surgery_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_surgery_checklist_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          ai_analyzed_at: string | null
          ai_churn_probability: number | null
          ai_intent: string | null
          ai_next_action: string | null
          ai_sentiment: string | null
          ai_summary: string | null
          assigned_to: string | null
          authority_score: number | null
          before_after_photo_delivered: boolean | null
          birth_date: string | null
          budget_score: number | null
          checklist_completed: number | null
          checklist_overdue: number | null
          checklist_total: number | null
          churn_analyzed_at: string | null
          churn_risk_level: string | null
          companion_info: Json | null
          contract_value: number | null
          coordinator_validated: boolean | null
          coordinator_validated_at: string | null
          coordinator_validated_by: string | null
          cpf: string | null
          created_at: string
          created_by: string
          cross_sell_offered: boolean | null
          cross_sell_suggestions: string[] | null
          current_weight: number | null
          custom_fields: Json | null
          days_in_stage: number | null
          days_without_closing: number | null
          diet_restrictions: string | null
          discharge_completed: boolean | null
          discharge_completed_at: string | null
          discharge_date: string | null
          discount_projects_count: number | null
          email: string | null
          emergency_contact: Json | null
          escalated: boolean | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          estimated_value: number | null
          feegow_data: Json | null
          feegow_id: string | null
          first_contact_at: string | null
          future_letter_written: boolean | null
          gamification_points_total: number | null
          google_review_requested: boolean | null
          help_score: number | null
          help_score_updated_at: string | null
          id: string
          initial_weight: number | null
          interested_procedures: string[] | null
          is_priority: boolean | null
          is_recurrence_lead: boolean | null
          is_stale: boolean | null
          landing_page: string | null
          last_activity_at: string | null
          last_feegow_sync: string | null
          last_nps_at: string | null
          last_procedure_date: string | null
          last_procedure_name: string | null
          last_recovery_at: string | null
          lead_score: number | null
          lost_at: string | null
          lost_reason: string | null
          lost_reason_id: string | null
          name: string
          need_score: number | null
          needs_travel: boolean | null
          needs_weight_loss: boolean | null
          notes: string | null
          nps_category: string | null
          nps_score: number | null
          patient_data_id: string | null
          phone: string | null
          pipeline_id: string
          post_surgery_checklist_completed: boolean | null
          pre_surgery_checklist_completed: boolean | null
          preferred_contact_day: string | null
          preferred_contact_time: string | null
          prontuario: string | null
          recovery_attempts: number | null
          recovery_status: string | null
          recurrence_days_overdue: number | null
          recurrence_due_date: string | null
          recurrence_group: string | null
          referral_lead_id: string | null
          referrer_url: string | null
          rfv_customer_id: string | null
          sla_violated: boolean | null
          source: string | null
          source_detail: string | null
          stage_changed_at: string | null
          stage_id: string
          stale_since: string | null
          surgery_date: string | null
          surgery_location: string | null
          surgery_notes: string | null
          tags: string[] | null
          target_weight: number | null
          team_id: string | null
          temperature: string | null
          temperature_updated_at: string | null
          testimonial_collected: boolean | null
          timing_score: number | null
          total_discount_percentage: number | null
          total_interactions: number | null
          travel_info: Json | null
          travel_organized: boolean | null
          unique_necklace_delivered: boolean | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          weight_loss_deadline: string | null
          whatsapp: string | null
          won_at: string | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_churn_probability?: number | null
          ai_intent?: string | null
          ai_next_action?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          authority_score?: number | null
          before_after_photo_delivered?: boolean | null
          birth_date?: string | null
          budget_score?: number | null
          checklist_completed?: number | null
          checklist_overdue?: number | null
          checklist_total?: number | null
          churn_analyzed_at?: string | null
          churn_risk_level?: string | null
          companion_info?: Json | null
          contract_value?: number | null
          coordinator_validated?: boolean | null
          coordinator_validated_at?: string | null
          coordinator_validated_by?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          cross_sell_offered?: boolean | null
          cross_sell_suggestions?: string[] | null
          current_weight?: number | null
          custom_fields?: Json | null
          days_in_stage?: number | null
          days_without_closing?: number | null
          diet_restrictions?: string | null
          discharge_completed?: boolean | null
          discharge_completed_at?: string | null
          discharge_date?: string | null
          discount_projects_count?: number | null
          email?: string | null
          emergency_contact?: Json | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          estimated_value?: number | null
          feegow_data?: Json | null
          feegow_id?: string | null
          first_contact_at?: string | null
          future_letter_written?: boolean | null
          gamification_points_total?: number | null
          google_review_requested?: boolean | null
          help_score?: number | null
          help_score_updated_at?: string | null
          id?: string
          initial_weight?: number | null
          interested_procedures?: string[] | null
          is_priority?: boolean | null
          is_recurrence_lead?: boolean | null
          is_stale?: boolean | null
          landing_page?: string | null
          last_activity_at?: string | null
          last_feegow_sync?: string | null
          last_nps_at?: string | null
          last_procedure_date?: string | null
          last_procedure_name?: string | null
          last_recovery_at?: string | null
          lead_score?: number | null
          lost_at?: string | null
          lost_reason?: string | null
          lost_reason_id?: string | null
          name: string
          need_score?: number | null
          needs_travel?: boolean | null
          needs_weight_loss?: boolean | null
          notes?: string | null
          nps_category?: string | null
          nps_score?: number | null
          patient_data_id?: string | null
          phone?: string | null
          pipeline_id: string
          post_surgery_checklist_completed?: boolean | null
          pre_surgery_checklist_completed?: boolean | null
          preferred_contact_day?: string | null
          preferred_contact_time?: string | null
          prontuario?: string | null
          recovery_attempts?: number | null
          recovery_status?: string | null
          recurrence_days_overdue?: number | null
          recurrence_due_date?: string | null
          recurrence_group?: string | null
          referral_lead_id?: string | null
          referrer_url?: string | null
          rfv_customer_id?: string | null
          sla_violated?: boolean | null
          source?: string | null
          source_detail?: string | null
          stage_changed_at?: string | null
          stage_id: string
          stale_since?: string | null
          surgery_date?: string | null
          surgery_location?: string | null
          surgery_notes?: string | null
          tags?: string[] | null
          target_weight?: number | null
          team_id?: string | null
          temperature?: string | null
          temperature_updated_at?: string | null
          testimonial_collected?: boolean | null
          timing_score?: number | null
          total_discount_percentage?: number | null
          total_interactions?: number | null
          travel_info?: Json | null
          travel_organized?: boolean | null
          unique_necklace_delivered?: boolean | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          weight_loss_deadline?: string | null
          whatsapp?: string | null
          won_at?: string | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_churn_probability?: number | null
          ai_intent?: string | null
          ai_next_action?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          authority_score?: number | null
          before_after_photo_delivered?: boolean | null
          birth_date?: string | null
          budget_score?: number | null
          checklist_completed?: number | null
          checklist_overdue?: number | null
          checklist_total?: number | null
          churn_analyzed_at?: string | null
          churn_risk_level?: string | null
          companion_info?: Json | null
          contract_value?: number | null
          coordinator_validated?: boolean | null
          coordinator_validated_at?: string | null
          coordinator_validated_by?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          cross_sell_offered?: boolean | null
          cross_sell_suggestions?: string[] | null
          current_weight?: number | null
          custom_fields?: Json | null
          days_in_stage?: number | null
          days_without_closing?: number | null
          diet_restrictions?: string | null
          discharge_completed?: boolean | null
          discharge_completed_at?: string | null
          discharge_date?: string | null
          discount_projects_count?: number | null
          email?: string | null
          emergency_contact?: Json | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          estimated_value?: number | null
          feegow_data?: Json | null
          feegow_id?: string | null
          first_contact_at?: string | null
          future_letter_written?: boolean | null
          gamification_points_total?: number | null
          google_review_requested?: boolean | null
          help_score?: number | null
          help_score_updated_at?: string | null
          id?: string
          initial_weight?: number | null
          interested_procedures?: string[] | null
          is_priority?: boolean | null
          is_recurrence_lead?: boolean | null
          is_stale?: boolean | null
          landing_page?: string | null
          last_activity_at?: string | null
          last_feegow_sync?: string | null
          last_nps_at?: string | null
          last_procedure_date?: string | null
          last_procedure_name?: string | null
          last_recovery_at?: string | null
          lead_score?: number | null
          lost_at?: string | null
          lost_reason?: string | null
          lost_reason_id?: string | null
          name?: string
          need_score?: number | null
          needs_travel?: boolean | null
          needs_weight_loss?: boolean | null
          notes?: string | null
          nps_category?: string | null
          nps_score?: number | null
          patient_data_id?: string | null
          phone?: string | null
          pipeline_id?: string
          post_surgery_checklist_completed?: boolean | null
          pre_surgery_checklist_completed?: boolean | null
          preferred_contact_day?: string | null
          preferred_contact_time?: string | null
          prontuario?: string | null
          recovery_attempts?: number | null
          recovery_status?: string | null
          recurrence_days_overdue?: number | null
          recurrence_due_date?: string | null
          recurrence_group?: string | null
          referral_lead_id?: string | null
          referrer_url?: string | null
          rfv_customer_id?: string | null
          sla_violated?: boolean | null
          source?: string | null
          source_detail?: string | null
          stage_changed_at?: string | null
          stage_id?: string
          stale_since?: string | null
          surgery_date?: string | null
          surgery_location?: string | null
          surgery_notes?: string | null
          tags?: string[] | null
          target_weight?: number | null
          team_id?: string | null
          temperature?: string | null
          temperature_updated_at?: string | null
          testimonial_collected?: boolean | null
          timing_score?: number | null
          total_discount_percentage?: number | null
          total_interactions?: number | null
          travel_info?: Json | null
          travel_organized?: boolean | null
          unique_necklace_delivered?: boolean | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          weight_loss_deadline?: string | null
          whatsapp?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_lost_reason_id_fkey"
            columns: ["lost_reason_id"]
            isOneToOne: false
            referencedRelation: "crm_lost_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_patient_data_id_fkey"
            columns: ["patient_data_id"]
            isOneToOne: false
            referencedRelation: "patient_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_referral_lead_id_fkey"
            columns: ["referral_lead_id"]
            isOneToOne: false
            referencedRelation: "referral_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_rfv_customer_id_fkey"
            columns: ["rfv_customer_id"]
            isOneToOne: false
            referencedRelation: "rfv_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lost_reasons: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_recoverable: boolean | null
          name: string
          order_index: number | null
          recovery_days: number | null
          recovery_strategy: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recoverable?: boolean | null
          name: string
          order_index?: number | null
          recovery_days?: number | null
          recovery_strategy?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recoverable?: boolean | null
          name?: string
          order_index?: number | null
          recovery_days?: number | null
          recovery_strategy?: string | null
        }
        Relationships: []
      }
      crm_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          lead_id: string | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          team_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          team_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          team_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_nps_responses: {
        Row: {
          category: string | null
          created_at: string | null
          feedback: string | null
          follow_up_by: string | null
          follow_up_completed_at: string | null
          follow_up_required: boolean | null
          id: string
          improvement_areas: Json | null
          lead_id: string | null
          patient_data_id: string | null
          score: number
          sentiment_ai: string | null
          touchpoint: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          feedback?: string | null
          follow_up_by?: string | null
          follow_up_completed_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          improvement_areas?: Json | null
          lead_id?: string | null
          patient_data_id?: string | null
          score: number
          sentiment_ai?: string | null
          touchpoint?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          feedback?: string | null
          follow_up_by?: string | null
          follow_up_completed_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          improvement_areas?: Json | null
          lead_id?: string | null
          patient_data_id?: string | null
          score?: number
          sentiment_ai?: string | null
          touchpoint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_nps_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          pipeline_type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          pipeline_type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          pipeline_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_sla_config: {
        Row: {
          business_end: string | null
          business_hours_only: boolean | null
          business_start: string | null
          created_at: string | null
          critical_hours: number | null
          exclude_weekends: boolean | null
          id: string
          is_active: boolean | null
          max_hours: number
          pipeline_id: string | null
          stage_id: string | null
          updated_at: string | null
          warning_hours: number | null
        }
        Insert: {
          business_end?: string | null
          business_hours_only?: boolean | null
          business_start?: string | null
          created_at?: string | null
          critical_hours?: number | null
          exclude_weekends?: boolean | null
          id?: string
          is_active?: boolean | null
          max_hours?: number
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
          warning_hours?: number | null
        }
        Update: {
          business_end?: string | null
          business_hours_only?: boolean | null
          business_start?: string | null
          created_at?: string | null
          critical_hours?: number | null
          exclude_weekends?: boolean | null
          id?: string
          is_active?: boolean | null
          max_hours?: number
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
          warning_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sla_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sla_config_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          auto_actions: Json | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_lost_stage: boolean | null
          is_win_stage: boolean | null
          name: string
          order_index: number | null
          pipeline_id: string
          required_fields: Json | null
          sla_hours: number | null
          updated_at: string
        }
        Insert: {
          auto_actions?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_lost_stage?: boolean | null
          is_win_stage?: boolean | null
          name: string
          order_index?: number | null
          pipeline_id: string
          required_fields?: Json | null
          sla_hours?: number | null
          updated_at?: string
        }
        Update: {
          auto_actions?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_lost_stage?: boolean | null
          is_win_stage?: boolean | null
          name?: string
          order_index?: number | null
          pipeline_id?: string
          required_fields?: Json | null
          sla_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_surgery_checklist: {
        Row: {
          auto_actions: Json | null
          checklist_type: string
          created_at: string | null
          day_offset: number
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          items: Json
          name: string
          notify_team: boolean | null
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          auto_actions?: Json | null
          checklist_type: string
          created_at?: string | null
          day_offset: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          items?: Json
          name: string
          notify_team?: boolean | null
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_actions?: Json | null
          checklist_type?: string
          created_at?: string | null
          day_offset?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          items?: Json
          name?: string
          notify_team?: boolean | null
          order_index?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          escalated: boolean | null
          id: string
          is_completed: boolean | null
          is_overdue: boolean | null
          lead_id: string
          priority: string | null
          reminder_at: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          escalated?: boolean | null
          id?: string
          is_completed?: boolean | null
          is_overdue?: boolean | null
          lead_id: string
          priority?: string | null
          reminder_at?: string | null
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          escalated?: boolean | null
          id?: string
          is_completed?: boolean | null
          is_overdue?: boolean | null
          lead_id?: string
          priority?: string | null
          reminder_at?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team_routine: {
        Row: {
          achievements: Json | null
          completed_activities: Json | null
          created_at: string | null
          goals: Json | null
          id: string
          mood_score: number | null
          notes: string | null
          planned_activities: Json | null
          productivity_score: number | null
          routine_date: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json | null
          completed_activities?: Json | null
          created_at?: string | null
          goals?: Json | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          planned_activities?: Json | null
          productivity_score?: number | null
          routine_date: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json | null
          completed_activities?: Json | null
          created_at?: string | null
          goals?: Json | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          planned_activities?: Json | null
          productivity_score?: number | null
          routine_date?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_user_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "crm_gamification_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          created_at: string
          created_by: string
          default_assigned_to: string | null
          default_pipeline_id: string | null
          default_stage_id: string | null
          description: string | null
          field_mapping: Json | null
          form_source: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          webhook_key: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_assigned_to?: string | null
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          description?: string | null
          field_mapping?: Json | null
          form_source?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          webhook_key?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_assigned_to?: string | null
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          description?: string | null
          field_mapping?: Json | null
          form_source?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          webhook_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhooks_default_stage_id_fkey"
            columns: ["default_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_whatsapp_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          has_media: boolean | null
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          name: string
          pipeline_id: string | null
          stage_id: string | null
          success_rate: number | null
          template_text: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          has_media?: boolean | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name: string
          pipeline_id?: string | null
          stage_id?: string | null
          success_rate?: number | null
          template_text: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          has_media?: boolean | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string
          pipeline_id?: string | null
          stage_id?: string | null
          success_rate?: number | null
          template_text?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_whatsapp_templates_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_whatsapp_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_backups: {
        Row: {
          backup_data: Json
          backup_date: string | null
          backup_name: string
          backup_type: string
          created_at: string | null
          created_by: string | null
          executed_records_count: number | null
          expires_at: string | null
          id: string
          restored_at: string | null
          revenue_records_count: number | null
          rfv_customers_count: number | null
          status: string | null
          tables_backed_up: string[] | null
        }
        Insert: {
          backup_data?: Json
          backup_date?: string | null
          backup_name: string
          backup_type: string
          created_at?: string | null
          created_by?: string | null
          executed_records_count?: number | null
          expires_at?: string | null
          id?: string
          restored_at?: string | null
          revenue_records_count?: number | null
          rfv_customers_count?: number | null
          status?: string | null
          tables_backed_up?: string[] | null
        }
        Update: {
          backup_data?: Json
          backup_date?: string | null
          backup_name?: string
          backup_type?: string
          created_at?: string | null
          created_by?: string | null
          executed_records_count?: number | null
          expires_at?: string | null
          id?: string
          restored_at?: string | null
          revenue_records_count?: number | null
          rfv_customers_count?: number | null
          status?: string | null
          tables_backed_up?: string[] | null
        }
        Relationships: []
      }
      data_import_logs: {
        Row: {
          backup_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duplicate_rows: number | null
          duplicates_removed: Json | null
          duration_seconds: number | null
          error_rows: number | null
          errors: Json | null
          file_name: string | null
          file_type: string
          id: string
          import_id: string | null
          imported_rows: number | null
          period_end: string | null
          period_start: string | null
          rfv_recalculated: boolean | null
          skipped_rows: number | null
          status: string | null
          total_rows: number | null
          updated_rows: number | null
          validation_warnings: Json | null
        }
        Insert: {
          backup_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_rows?: number | null
          duplicates_removed?: Json | null
          duration_seconds?: number | null
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          file_type: string
          id?: string
          import_id?: string | null
          imported_rows?: number | null
          period_end?: string | null
          period_start?: string | null
          rfv_recalculated?: boolean | null
          skipped_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_rows?: number | null
          validation_warnings?: Json | null
        }
        Update: {
          backup_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_rows?: number | null
          duplicates_removed?: Json | null
          duration_seconds?: number | null
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          file_type?: string
          id?: string
          import_id?: string | null
          imported_rows?: number | null
          period_end?: string | null
          period_start?: string | null
          rfv_recalculated?: boolean | null
          skipped_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_rows?: number | null
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_logs_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "data_import_backups"
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
      department_quantity_goals: {
        Row: {
          created_at: string
          department_name: string
          id: string
          month: number
          quantity_goal: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          department_name: string
          id?: string
          month: number
          quantity_goal?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          department_name?: string
          id?: string
          month?: number
          quantity_goal?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      discount_projects: {
        Row: {
          created_at: string | null
          current_participants: number | null
          description: string | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_config: {
        Row: {
          api_key: string | null
          created_at: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_active: boolean | null
          provider: string
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_dispatch_queue: {
        Row: {
          body: string
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_dispatch_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
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
          upload_id: string | null
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
          upload_id?: string | null
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
          upload_id?: string | null
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
          {
            foreignKeyName: "executed_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "sales_upload_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_onboarding_reads: {
        Row: {
          feature_key: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          feature_key: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          feature_key?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
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
      form_links: {
        Row: {
          created_at: string
          created_by: string | null
          current_submissions: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          lead_id: string | null
          max_submissions: number | null
          patient_cpf: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_prontuario: string | null
          template_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_submissions?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          max_submissions?: number | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          template_id: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_submissions?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          max_submissions?: number | null
          patient_cpf?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          template_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_at: string
          form_source: string
          form_type: string
          id: string
          is_processed: boolean | null
          lead_id: string | null
          metadata: Json | null
          nps_category: string | null
          nps_score: number | null
          patient_cpf: string | null
          patient_data_id: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_prontuario: string | null
          processed_at: string | null
          responses: Json
          submitted_at: string
          task_created_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          form_source?: string
          form_type: string
          id?: string
          is_processed?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          nps_category?: string | null
          nps_score?: number | null
          patient_cpf?: string | null
          patient_data_id?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          processed_at?: string | null
          responses?: Json
          submitted_at?: string
          task_created_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          form_source?: string
          form_type?: string
          id?: string
          is_processed?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          nps_category?: string | null
          nps_score?: number | null
          patient_cpf?: string | null
          patient_data_id?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_prontuario?: string | null
          processed_at?: string | null
          responses?: Json
          submitted_at?: string
          task_created_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_patient_data_id_fkey"
            columns: ["patient_data_id"]
            isOneToOne: false
            referencedRelation: "patient_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          create_task: boolean | null
          created_at: string
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_active: boolean | null
          name: string
          notify_team: boolean | null
          slug: string
          task_template: Json | null
          updated_at: string
        }
        Insert: {
          create_task?: boolean | null
          created_at?: string
          description?: string | null
          fields?: Json
          form_type: string
          id?: string
          is_active?: boolean | null
          name: string
          notify_team?: boolean | null
          slug: string
          task_template?: Json | null
          updated_at?: string
        }
        Update: {
          create_task?: boolean | null
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notify_team?: boolean | null
          slug?: string
          task_template?: Json | null
          updated_at?: string
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
      knowledge_base: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          atualizado_por: string | null
          avaliacoes_negativas: number | null
          avaliacoes_positivas: number | null
          categoria: string | null
          conteudo: string
          conteudo_estruturado: Json | null
          criado_em: string | null
          criado_por: string | null
          departamento: string | null
          etapa_funil: string | null
          id: string
          prioridade: number | null
          procedimentos_relacionados: string[] | null
          tags: string[] | null
          tipo: string
          titulo: string
          visualizacoes: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          avaliacoes_negativas?: number | null
          avaliacoes_positivas?: number | null
          categoria?: string | null
          conteudo: string
          conteudo_estruturado?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          departamento?: string | null
          etapa_funil?: string | null
          id?: string
          prioridade?: number | null
          procedimentos_relacionados?: string[] | null
          tags?: string[] | null
          tipo: string
          titulo: string
          visualizacoes?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          avaliacoes_negativas?: number | null
          avaliacoes_positivas?: number | null
          categoria?: string | null
          conteudo?: string
          conteudo_estruturado?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          departamento?: string | null
          etapa_funil?: string | null
          id?: string
          prioridade?: number | null
          procedimentos_relacionados?: string[] | null
          tags?: string[] | null
          tipo?: string
          titulo?: string
          visualizacoes?: number | null
        }
        Relationships: []
      }
      knowledge_base_reads: {
        Row: {
          article_id: string
          completed: boolean | null
          id: string
          read_at: string
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          article_id: string
          completed?: boolean | null
          id?: string
          read_at?: string
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          article_id?: string
          completed?: boolean | null
          id?: string
          read_at?: string
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_article"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_action_stats: {
        Row: {
          created_at: string | null
          engagement_score: number | null
          id: string
          last_action_at: string | null
          last_nps_date: string | null
          last_nps_score: number | null
          last_response_at: string | null
          lead_id: string
          nps_average: number | null
          response_rate: number | null
          total_actions_received: number | null
          total_bonus: number | null
          total_points: number | null
          total_purchases_from_actions: number | null
          total_referrals: number | null
          total_responses: number | null
          total_revenue_from_actions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_action_at?: string | null
          last_nps_date?: string | null
          last_nps_score?: number | null
          last_response_at?: string | null
          lead_id: string
          nps_average?: number | null
          response_rate?: number | null
          total_actions_received?: number | null
          total_bonus?: number | null
          total_points?: number | null
          total_purchases_from_actions?: number | null
          total_referrals?: number | null
          total_responses?: number | null
          total_revenue_from_actions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_action_at?: string | null
          last_nps_date?: string | null
          last_nps_score?: number | null
          last_response_at?: string | null
          lead_id?: string
          nps_average?: number | null
          response_rate?: number | null
          total_actions_received?: number | null
          total_bonus?: number | null
          total_points?: number | null
          total_purchases_from_actions?: number | null
          total_referrals?: number | null
          total_responses?: number | null
          total_revenue_from_actions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_action_stats_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          is_completed: boolean
          is_custom: boolean
          is_overdue: boolean
          lead_id: string
          order_index: number
          stage_id: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          is_overdue?: boolean
          lead_id: string
          order_index?: number
          stage_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          is_completed?: boolean
          is_custom?: boolean
          is_overdue?: boolean
          lead_id?: string
          order_index?: number
          stage_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_checklist_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_checklist_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "stage_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contracts: {
        Row: {
          cancelled_at: string | null
          clicksign_document_key: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          id: string
          lead_id: string | null
          sent_at: string | null
          signed_at: string | null
          signed_document_url: string | null
          signer_email: string | null
          signer_phone: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          clicksign_document_key?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          signer_email?: string | null
          signer_phone?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          clicksign_document_key?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          signer_email?: string | null
          signer_phone?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_projects: {
        Row: {
          committed_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          committed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          committed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "discount_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recurrence_history: {
        Row: {
          created_at: string
          id: string
          last_procedure_date: string
          lead_id: string | null
          next_procedure_date: string | null
          notes: string | null
          notification_channel: string | null
          notification_sent_at: string | null
          notification_status: string
          patient_data_id: string | null
          recurrent_procedure_id: string
          task_created_id: string | null
          trigger_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_procedure_date: string
          lead_id?: string | null
          next_procedure_date?: string | null
          notes?: string | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          patient_data_id?: string | null
          recurrent_procedure_id: string
          task_created_id?: string | null
          trigger_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_procedure_date?: string
          lead_id?: string | null
          next_procedure_date?: string | null
          notes?: string | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          patient_data_id?: string | null
          recurrent_procedure_id?: string
          task_created_id?: string | null
          trigger_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_recurrence_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recurrence_history_patient_data_id_fkey"
            columns: ["patient_data_id"]
            isOneToOne: false
            referencedRelation: "patient_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recurrence_history_recurrent_procedure_id_fkey"
            columns: ["recurrent_procedure_id"]
            isOneToOne: false
            referencedRelation: "recurrent_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recurrence_history_task_created_id_fkey"
            columns: ["task_created_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_spa_preferences: {
        Row: {
          aromatherapy_preference: string | null
          created_at: string | null
          dietary_restrictions: string | null
          drinks_preference: string | null
          favorite_foods: string | null
          food_allergies: string | null
          form_submitted: boolean | null
          form_submitted_at: string | null
          id: string
          lead_id: string | null
          massage_type: string | null
          music_preference: string | null
          room_temperature: string | null
          spa_experience_notes: string | null
          special_requests: string | null
          updated_at: string | null
        }
        Insert: {
          aromatherapy_preference?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          drinks_preference?: string | null
          favorite_foods?: string | null
          food_allergies?: string | null
          form_submitted?: boolean | null
          form_submitted_at?: string | null
          id?: string
          lead_id?: string | null
          massage_type?: string | null
          music_preference?: string | null
          room_temperature?: string | null
          spa_experience_notes?: string | null
          special_requests?: string | null
          updated_at?: string | null
        }
        Update: {
          aromatherapy_preference?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          drinks_preference?: string | null
          favorite_foods?: string | null
          food_allergies?: string | null
          form_submitted?: boolean | null
          form_submitted_at?: string | null
          id?: string
          lead_id?: string | null
          massage_type?: string | null
          music_preference?: string | null
          room_temperature?: string | null
          spa_experience_notes?: string | null
          special_requests?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_spa_preferences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_travel: {
        Row: {
          all_confirmed: boolean | null
          arrival_date: string | null
          arrival_flight: string | null
          arrival_time: string | null
          companion_name: string | null
          companion_phone: string | null
          companion_relationship: string | null
          created_at: string | null
          departure_date: string | null
          departure_flight: string | null
          departure_time: string | null
          driver_confirmed: boolean | null
          driver_name: string | null
          driver_phone: string | null
          has_companion: boolean | null
          home_care_days: number | null
          home_care_nurse: string | null
          home_care_phone: string | null
          hotel_address: string | null
          hotel_check_in: string | null
          hotel_check_out: string | null
          hotel_confirmed: boolean | null
          hotel_name: string | null
          id: string
          lead_id: string | null
          needs_home_care: boolean | null
          notes: string | null
          origin_city: string | null
          origin_state: string | null
          updated_at: string | null
        }
        Insert: {
          all_confirmed?: boolean | null
          arrival_date?: string | null
          arrival_flight?: string | null
          arrival_time?: string | null
          companion_name?: string | null
          companion_phone?: string | null
          companion_relationship?: string | null
          created_at?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          departure_time?: string | null
          driver_confirmed?: boolean | null
          driver_name?: string | null
          driver_phone?: string | null
          has_companion?: boolean | null
          home_care_days?: number | null
          home_care_nurse?: string | null
          home_care_phone?: string | null
          hotel_address?: string | null
          hotel_check_in?: string | null
          hotel_check_out?: string | null
          hotel_confirmed?: boolean | null
          hotel_name?: string | null
          id?: string
          lead_id?: string | null
          needs_home_care?: boolean | null
          notes?: string | null
          origin_city?: string | null
          origin_state?: string | null
          updated_at?: string | null
        }
        Update: {
          all_confirmed?: boolean | null
          arrival_date?: string | null
          arrival_flight?: string | null
          arrival_time?: string | null
          companion_name?: string | null
          companion_phone?: string | null
          companion_relationship?: string | null
          created_at?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          departure_time?: string | null
          driver_confirmed?: boolean | null
          driver_name?: string | null
          driver_phone?: string | null
          has_companion?: boolean | null
          home_care_days?: number | null
          home_care_nurse?: string | null
          home_care_phone?: string | null
          hotel_address?: string | null
          hotel_check_in?: string | null
          hotel_check_out?: string | null
          hotel_confirmed?: boolean | null
          hotel_name?: string | null
          id?: string
          lead_id?: string | null
          needs_home_care?: boolean | null
          notes?: string | null
          origin_city?: string | null
          origin_state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_travel_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_weight_tracking: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          target_weight: number | null
          weight: number
          weight_loss_goal: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          target_weight?: number | null
          weight: number
          weight_loss_goal?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          target_weight?: number | null
          weight?: number
          weight_loss_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_weight_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
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
          data_cadastro_feegow: string | null
          data_source: string | null
          desires: string | null
          dreams: string | null
          email: string | null
          expectations: string | null
          fears: string | null
          first_contact_date: string | null
          first_purchase_date: string | null
          foto_url: string | null
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
          no_show_count: number | null
          nome_mae: string | null
          nome_pai: string | null
          observacoes_feegow: string | null
          origem_id: number | null
          origem_nome: string | null
          origin: string | null
          origin_detail: string | null
          phone: string | null
          preferred_procedures: string | null
          profession: string | null
          prontuario: string | null
          referral_name: string | null
          responsavel_legal: string | null
          rg: string | null
          state: string | null
          total_agendamentos: number | null
          total_procedures: number | null
          total_value_executed: number | null
          total_value_sold: number | null
          ultimo_atendimento: string | null
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
          data_cadastro_feegow?: string | null
          data_source?: string | null
          desires?: string | null
          dreams?: string | null
          email?: string | null
          expectations?: string | null
          fears?: string | null
          first_contact_date?: string | null
          first_purchase_date?: string | null
          foto_url?: string | null
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
          no_show_count?: number | null
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes_feegow?: string | null
          origem_id?: number | null
          origem_nome?: string | null
          origin?: string | null
          origin_detail?: string | null
          phone?: string | null
          preferred_procedures?: string | null
          profession?: string | null
          prontuario?: string | null
          referral_name?: string | null
          responsavel_legal?: string | null
          rg?: string | null
          state?: string | null
          total_agendamentos?: number | null
          total_procedures?: number | null
          total_value_executed?: number | null
          total_value_sold?: number | null
          ultimo_atendimento?: string | null
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
          data_cadastro_feegow?: string | null
          data_source?: string | null
          desires?: string | null
          dreams?: string | null
          email?: string | null
          expectations?: string | null
          fears?: string | null
          first_contact_date?: string | null
          first_purchase_date?: string | null
          foto_url?: string | null
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
          no_show_count?: number | null
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes_feegow?: string | null
          origem_id?: number | null
          origem_nome?: string | null
          origin?: string | null
          origin_detail?: string | null
          phone?: string | null
          preferred_procedures?: string | null
          profession?: string | null
          prontuario?: string | null
          referral_name?: string | null
          responsavel_legal?: string | null
          rg?: string | null
          state?: string | null
          total_agendamentos?: number | null
          total_procedures?: number | null
          total_value_executed?: number | null
          total_value_sold?: number | null
          ultimo_atendimento?: string | null
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
      procedures: {
        Row: {
          category: string | null
          code: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          imported_from: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number | null
          promotional_price: number | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          imported_from?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price?: number | null
          promotional_price?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          imported_from?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number | null
          promotional_price?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_count: number | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id: string
          is_admin: boolean | null
          is_approved: boolean | null
          last_access_at: string | null
          performance_score: number | null
          performance_updated_at: string | null
          phone: string | null
          position: Database["public"]["Enums"]["position_type"] | null
          team_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          access_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          last_access_at?: string | null
          performance_score?: number | null
          performance_updated_at?: string | null
          phone?: string | null
          position?: Database["public"]["Enums"]["position_type"] | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          access_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          last_access_at?: string | null
          performance_score?: number | null
          performance_updated_at?: string | null
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
      protocol_recurrence_tracking: {
        Row: {
          created_at: string | null
          days_overdue: number | null
          id: string
          last_procedure_date: string
          lead_id: string | null
          next_due_date: string
          protocol_id: string | null
          reactivated_at: string | null
          reminder_sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_overdue?: number | null
          id?: string
          last_procedure_date: string
          lead_id?: string | null
          next_due_date: string
          protocol_id?: string | null
          reactivated_at?: string | null
          reminder_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_overdue?: number | null
          id?: string
          last_procedure_date?: string
          lead_id?: string | null
          next_due_date?: string
          protocol_id?: string | null
          reactivated_at?: string | null
          reminder_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_recurrence_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_recurrence_tracking_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_referrals: {
        Row: {
          bonus_earned: number | null
          converted_at: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          protocol_id: string | null
          referral_code: string | null
          referred_lead_id: string | null
          referrer_lead_id: string | null
          status: string | null
        }
        Insert: {
          bonus_earned?: number | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          protocol_id?: string | null
          referral_code?: string | null
          referred_lead_id?: string | null
          referrer_lead_id?: string | null
          status?: string | null
        }
        Update: {
          bonus_earned?: number | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          protocol_id?: string | null
          referral_code?: string | null
          referred_lead_id?: string | null
          referrer_lead_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_referrals_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_referrals_referred_lead_id_fkey"
            columns: ["referred_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_referrals_referrer_lead_id_fkey"
            columns: ["referrer_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_suggestions: {
        Row: {
          acted_at: string | null
          action_result: string | null
          ai_confidence: number | null
          created_by: string | null
          id: string
          is_active: boolean | null
          lead_id: string | null
          personalized_script: string | null
          priority: number | null
          protocol_id: string | null
          reason: string
          suggested_at: string | null
          suggestion_type: string
          viewed_at: string | null
        }
        Insert: {
          acted_at?: string | null
          action_result?: string | null
          ai_confidence?: number | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          personalized_script?: string | null
          priority?: number | null
          protocol_id?: string | null
          reason: string
          suggested_at?: string | null
          suggestion_type: string
          viewed_at?: string | null
        }
        Update: {
          acted_at?: string | null
          action_result?: string | null
          ai_confidence?: number | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          personalized_script?: string | null
          priority?: number | null
          protocol_id?: string | null
          reason?: string
          suggested_at?: string | null
          suggestion_type?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_suggestions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_suggestions_protocol_id_fkey"
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
          category: string | null
          closing_script: string | null
          created_at: string
          created_by: string
          cross_sell_protocols: string[] | null
          description: string | null
          doctor_recommended_script: string | null
          duration_days: number | null
          followup_script: string | null
          followup_script_2: string | null
          followup_script_3: string | null
          group_script: string | null
          id: string
          image_url: string | null
          included_items: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          journey_stage: string | null
          loyalty_points: number | null
          material_descriptions: Json | null
          materials: Json | null
          materials_urls: string[] | null
          name: string
          objection_scripts: Json | null
          offer_trigger: string | null
          price: number | null
          procedure_ids: string[] | null
          promotional_price: number | null
          protocol_type: string
          reactivation_script: string | null
          recurrence_days: number | null
          recurrence_script: string | null
          recurrence_type: string | null
          referral_bonus: number | null
          referral_script: string | null
          responsible_role: string | null
          sales_script: string | null
          target_audience: string | null
          target_segments: string[] | null
          updated_at: string
          upsell_protocols: string[] | null
          video_url: string | null
          whatsapp_scripts: Json | null
        }
        Insert: {
          benefits?: string[] | null
          campaign_id?: string | null
          category?: string | null
          closing_script?: string | null
          created_at?: string
          created_by: string
          cross_sell_protocols?: string[] | null
          description?: string | null
          doctor_recommended_script?: string | null
          duration_days?: number | null
          followup_script?: string | null
          followup_script_2?: string | null
          followup_script_3?: string | null
          group_script?: string | null
          id?: string
          image_url?: string | null
          included_items?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          journey_stage?: string | null
          loyalty_points?: number | null
          material_descriptions?: Json | null
          materials?: Json | null
          materials_urls?: string[] | null
          name: string
          objection_scripts?: Json | null
          offer_trigger?: string | null
          price?: number | null
          procedure_ids?: string[] | null
          promotional_price?: number | null
          protocol_type: string
          reactivation_script?: string | null
          recurrence_days?: number | null
          recurrence_script?: string | null
          recurrence_type?: string | null
          referral_bonus?: number | null
          referral_script?: string | null
          responsible_role?: string | null
          sales_script?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          updated_at?: string
          upsell_protocols?: string[] | null
          video_url?: string | null
          whatsapp_scripts?: Json | null
        }
        Update: {
          benefits?: string[] | null
          campaign_id?: string | null
          category?: string | null
          closing_script?: string | null
          created_at?: string
          created_by?: string
          cross_sell_protocols?: string[] | null
          description?: string | null
          doctor_recommended_script?: string | null
          duration_days?: number | null
          followup_script?: string | null
          followup_script_2?: string | null
          followup_script_3?: string | null
          group_script?: string | null
          id?: string
          image_url?: string | null
          included_items?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          journey_stage?: string | null
          loyalty_points?: number | null
          material_descriptions?: Json | null
          materials?: Json | null
          materials_urls?: string[] | null
          name?: string
          objection_scripts?: Json | null
          offer_trigger?: string | null
          price?: number | null
          procedure_ids?: string[] | null
          promotional_price?: number | null
          protocol_type?: string
          reactivation_script?: string | null
          recurrence_days?: number | null
          recurrence_script?: string | null
          recurrence_type?: string | null
          referral_bonus?: number | null
          referral_script?: string | null
          responsible_role?: string | null
          sales_script?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          updated_at?: string
          upsell_protocols?: string[] | null
          video_url?: string | null
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
      recurrence_notification_logs: {
        Row: {
          channel: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string
          read_at: string | null
          recurrence_history_id: string
          sent_at: string
          status: string
        }
        Insert: {
          channel: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content: string
          read_at?: string | null
          recurrence_history_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          channel?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string
          read_at?: string | null
          recurrence_history_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_notification_logs_recurrence_history_id_fkey"
            columns: ["recurrence_history_id"]
            isOneToOne: false
            referencedRelation: "lead_recurrence_history"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrent_procedures: {
        Row: {
          benefits: string[] | null
          created_at: string
          group_name: string
          id: string
          is_active: boolean
          procedure_name: string
          procedure_number: number
          recurrence_days: number
          script_email_body: string | null
          script_email_subject: string | null
          script_sms: string | null
          script_whatsapp: string | null
          trigger_days_before: number
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          group_name: string
          id?: string
          is_active?: boolean
          procedure_name: string
          procedure_number: number
          recurrence_days?: number
          script_email_body?: string | null
          script_email_subject?: string | null
          script_sms?: string | null
          script_whatsapp?: string | null
          trigger_days_before?: number
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          group_name?: string
          id?: string
          is_active?: boolean
          procedure_name?: string
          procedure_number?: number
          recurrence_days?: number
          script_email_body?: string | null
          script_email_subject?: string | null
          script_sms?: string | null
          script_whatsapp?: string | null
          trigger_days_before?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          bonus_value: number | null
          contract_value: number | null
          created_at: string | null
          id: string
          paid_at: string | null
          referral_id: string | null
          referred_lead_id: string | null
          referrer_name: string | null
          referrer_phone: string | null
          status: string | null
        }
        Insert: {
          bonus_value?: number | null
          contract_value?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          referred_lead_id?: string | null
          referrer_name?: string | null
          referrer_phone?: string | null
          status?: string | null
        }
        Update: {
          bonus_value?: number | null
          contract_value?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          referred_lead_id?: string | null
          referrer_name?: string | null
          referrer_phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_referred_lead_id_fkey"
            columns: ["referred_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
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
          bonus_paid: boolean | null
          bonus_value: number | null
          consultation_date: string | null
          created_at: string
          crm_lead_id: string | null
          id: string
          last_contact_at: string | null
          loss_reason: string | null
          notes: string | null
          photo_url: string | null
          processed_at: string | null
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
          bonus_paid?: boolean | null
          bonus_value?: number | null
          consultation_date?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          photo_url?: string | null
          processed_at?: string | null
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
          bonus_paid?: boolean | null
          bonus_value?: number | null
          consultation_date?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          photo_url?: string | null
          processed_at?: string | null
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
            foreignKeyName: "referral_leads_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
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
          total_value: number | null
          upload_id: string | null
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
          total_value?: number | null
          upload_id?: string | null
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
          total_value?: number | null
          upload_id?: string | null
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
          {
            foreignKeyName: "revenue_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "sales_upload_logs"
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
          data_cadastro_feegow: string | null
          days_since_last_purchase: number
          email: string | null
          first_purchase_date: string
          foto_url: string | null
          frequency_score: number
          has_children: boolean | null
          height_cm: number | null
          id: string
          last_purchase_date: string
          main_objective: string | null
          name: string
          no_show_count: number | null
          nome_mae: string | null
          nome_pai: string | null
          observacoes_feegow: string | null
          origem_id: number | null
          origem_nome: string | null
          phone: string | null
          profession: string | null
          prontuario: string | null
          propostas_abertas: number | null
          recency_score: number
          responsavel_legal: string | null
          rg: string | null
          segment: string
          status_financeiro: string | null
          total_agendamentos: number | null
          total_purchases: number
          total_value: number
          ultimo_atendimento: string | null
          updated_at: string
          valor_em_aberto: number | null
          valor_propostas_pendentes: number | null
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
          data_cadastro_feegow?: string | null
          days_since_last_purchase?: number
          email?: string | null
          first_purchase_date: string
          foto_url?: string | null
          frequency_score?: number
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          last_purchase_date: string
          main_objective?: string | null
          name: string
          no_show_count?: number | null
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes_feegow?: string | null
          origem_id?: number | null
          origem_nome?: string | null
          phone?: string | null
          profession?: string | null
          prontuario?: string | null
          propostas_abertas?: number | null
          recency_score?: number
          responsavel_legal?: string | null
          rg?: string | null
          segment?: string
          status_financeiro?: string | null
          total_agendamentos?: number | null
          total_purchases?: number
          total_value?: number
          ultimo_atendimento?: string | null
          updated_at?: string
          valor_em_aberto?: number | null
          valor_propostas_pendentes?: number | null
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
          data_cadastro_feegow?: string | null
          days_since_last_purchase?: number
          email?: string | null
          first_purchase_date?: string
          foto_url?: string | null
          frequency_score?: number
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          last_purchase_date?: string
          main_objective?: string | null
          name?: string
          no_show_count?: number | null
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes_feegow?: string | null
          origem_id?: number | null
          origem_nome?: string | null
          phone?: string | null
          profession?: string | null
          prontuario?: string | null
          propostas_abertas?: number | null
          recency_score?: number
          responsavel_legal?: string | null
          rg?: string | null
          segment?: string
          status_financeiro?: string | null
          total_agendamentos?: number | null
          total_purchases?: number
          total_value?: number
          ultimo_atendimento?: string | null
          updated_at?: string
          valor_em_aberto?: number | null
          valor_propostas_pendentes?: number | null
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
      seller_department_goals: {
        Row: {
          average_ticket: number | null
          created_at: string
          department_name: string
          id: string
          meta1_goal: number | null
          meta1_qty: number | null
          meta2_goal: number | null
          meta2_qty: number | null
          meta3_goal: number | null
          meta3_qty: number | null
          month: number
          seller_name: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          average_ticket?: number | null
          created_at?: string
          department_name: string
          id?: string
          meta1_goal?: number | null
          meta1_qty?: number | null
          meta2_goal?: number | null
          meta2_qty?: number | null
          meta3_goal?: number | null
          meta3_qty?: number | null
          month: number
          seller_name?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          average_ticket?: number | null
          created_at?: string
          department_name?: string
          id?: string
          meta1_goal?: number | null
          meta1_qty?: number | null
          meta2_goal?: number | null
          meta2_qty?: number | null
          meta3_goal?: number | null
          meta3_qty?: number | null
          month?: number
          seller_name?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      sms_config: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_dispatch_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          message: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          template_id: string | null
          to_phone: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          to_phone: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_dispatch_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
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
      stage_checklist_templates: {
        Row: {
          created_at: string
          deadline_hours: number | null
          description: string | null
          id: string
          is_required: boolean
          order_index: number
          responsible_role: string | null
          stage_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_hours?: number | null
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          responsible_role?: string | null
          stage_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_hours?: number | null
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          responsible_role?: string | null
          stage_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_checklist_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: string
          started_at: string | null
          status: string | null
          tables_included: string[] | null
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          tables_included?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          tables_included?: string[] | null
        }
        Relationships: []
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
          evidence_url: string | null
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
          evidence_url?: string | null
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
          evidence_url?: string | null
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
      training_material_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          material_id: string
          progress_percent: number | null
          started_at: string | null
          time_spent_seconds: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          material_id: string
          progress_percent?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          material_id?: string
          progress_percent?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_material_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "training_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      training_materials: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          material_type: string
          order_index: number | null
          sections: Json | null
          target_role: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          material_type: string
          order_index?: number | null
          sections?: Json | null
          target_role?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string
          order_index?: number | null
          sections?: Json | null
          target_role?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      training_quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          time_taken_seconds: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          time_taken_seconds?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          time_taken_seconds?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          order_index: number | null
          passing_score: number | null
          questions: Json
          target_role: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          order_index?: number | null
          passing_score?: number | null
          questions?: Json
          target_role?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          order_index?: number | null
          passing_score?: number | null
          questions?: Json
          target_role?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      training_simulation_attempts: {
        Row: {
          ai_feedback: Json | null
          completed_at: string | null
          conversation: Json
          id: string
          score: number | null
          simulation_id: string
          started_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          ai_feedback?: Json | null
          completed_at?: string | null
          conversation?: Json
          id?: string
          score?: number | null
          simulation_id: string
          started_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          ai_feedback?: Json | null
          completed_at?: string | null
          conversation?: Json
          id?: string
          score?: number | null
          simulation_id?: string
          started_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_simulation_attempts_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "training_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_simulations: {
        Row: {
          context: Json
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          scenario_type: string
          target_role: string | null
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          context: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          scenario_type: string
          target_role?: string | null
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          context?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          scenario_type?: string
          target_role?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      training_track_progress: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          completed_steps: Json | null
          created_at: string
          current_step: number | null
          id: string
          started_at: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number | null
          id?: string
          started_at?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number | null
          id?: string
          started_at?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_track_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tracks: {
        Row: {
          badge_icon: string | null
          badge_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          steps: Json
          target_role: string | null
          title: string
          total_xp: number | null
          updated_at: string
        }
        Insert: {
          badge_icon?: string | null
          badge_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          steps?: Json
          target_role?: string | null
          title: string
          total_xp?: number | null
          updated_at?: string
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          steps?: Json
          target_role?: string | null
          title?: string
          total_xp?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      training_user_stats: {
        Row: {
          badges: Json | null
          best_streak_days: number | null
          created_at: string
          current_level: number | null
          current_streak_days: number | null
          id: string
          last_activity_at: string | null
          materials_completed: number | null
          quizzes_passed: number | null
          simulations_completed: number | null
          total_xp: number | null
          tracks_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: Json | null
          best_streak_days?: number | null
          created_at?: string
          current_level?: number | null
          current_streak_days?: number | null
          id?: string
          last_activity_at?: string | null
          materials_completed?: number | null
          quizzes_passed?: number | null
          simulations_completed?: number | null
          total_xp?: number | null
          tracks_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: Json | null
          best_streak_days?: number | null
          created_at?: string
          current_level?: number | null
          current_streak_days?: number | null
          id?: string
          last_activity_at?: string | null
          materials_completed?: number | null
          quizzes_passed?: number | null
          simulations_completed?: number | null
          total_xp?: number | null
          tracks_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_xp_history: {
        Row: {
          created_at: string
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
      upload_deletion_logs: {
        Row: {
          deleted_at: string
          deleted_by: string
          deleted_by_name: string
          id: string
          notes: string | null
          original_date_range_end: string | null
          original_date_range_start: string | null
          original_file_name: string | null
          original_imported_rows: number | null
          original_total_revenue_paid: number | null
          original_total_revenue_sold: number | null
          original_upload_id: string
          original_upload_type: string | null
          original_uploaded_at: string | null
          original_uploaded_by_name: string | null
          records_deleted_executed: number | null
          records_deleted_revenue: number | null
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          deleted_by_name: string
          id?: string
          notes?: string | null
          original_date_range_end?: string | null
          original_date_range_start?: string | null
          original_file_name?: string | null
          original_imported_rows?: number | null
          original_total_revenue_paid?: number | null
          original_total_revenue_sold?: number | null
          original_upload_id: string
          original_upload_type?: string | null
          original_uploaded_at?: string | null
          original_uploaded_by_name?: string | null
          records_deleted_executed?: number | null
          records_deleted_revenue?: number | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          deleted_by_name?: string
          id?: string
          notes?: string | null
          original_date_range_end?: string | null
          original_date_range_start?: string | null
          original_file_name?: string | null
          original_imported_rows?: number | null
          original_total_revenue_paid?: number | null
          original_total_revenue_sold?: number | null
          original_upload_id?: string
          original_upload_type?: string | null
          original_uploaded_at?: string | null
          original_uploaded_by_name?: string | null
          records_deleted_executed?: number | null
          records_deleted_revenue?: number | null
        }
        Relationships: []
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
      weekly_reports: {
        Row: {
          generated_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          report_data: Json | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          api_key: string | null
          api_url: string
          connection_status: string | null
          created_at: string | null
          id: string
          instance_id: string | null
          is_active: boolean | null
          last_connection_check: string | null
          provider: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_url: string
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          last_connection_check?: string | null
          provider?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          last_connection_check?: string | null
          provider?: string
          updated_at?: string | null
          webhook_url?: string | null
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
      add_training_xp: {
        Args: {
          p_description?: string
          p_source_id?: string
          p_source_type: string
          p_user_id: string
          p_xp_amount: number
        }
        Returns: number
      }
      approve_user: { Args: { _user_id: string }; Returns: undefined }
      batch_calculate_predictive_scores: {
        Args: never
        Returns: {
          avg_help_score: number
          high_risk_count: number
          leads_processed: number
        }[]
      }
      calculate_cadence_metrics: {
        Args: { p_lead_id: string }
        Returns: {
          dias_ativos: number
          melhor_horario_resposta: number
          numero_interacoes_dia: number
          primeira_interacao: string
          taxa_resposta_24h: number
          tempo_entre_interacoes_media_horas: number
          tempo_medio_resposta_minutos: number
          total_interacoes: number
          ultima_interacao: string
        }[]
      }
      calculate_churn_probability: {
        Args: { p_lead_id: string }
        Returns: number
      }
      calculate_help_score: { Args: { p_lead_id: string }; Returns: number }
      get_all_vendedores_kpis: {
        Args: { team_id_param?: string }
        Returns: {
          atividades_mes: number
          ciclo_medio_dias: number
          faturamento_mes: number
          leads_ativos: number
          leads_quentes: number
          ltv: number
          rank_position: number
          seller_avatar_url: string
          seller_name: string
          seller_position: string
          taxa_conversao: number
          ticket_medio: number
          user_id: string
          vendas_mes: number
        }[]
      }
      get_interaction_hour_distribution: {
        Args: { p_lead_id?: string; p_seller_id?: string }
        Returns: {
          hora: number
          percentual: number
          total_interacoes: number
        }[]
      }
      get_my_team_id: { Args: never; Returns: string }
      get_pending_recurrences: {
        Args: never
        Returns: {
          assigned_to: string
          benefits: string[]
          days_until_next: number
          group_name: string
          last_procedure_date: string
          lead_email: string
          lead_id: string
          lead_name: string
          lead_phone: string
          lead_whatsapp: string
          next_procedure_date: string
          procedure_name: string
          recurrence_id: string
          script_email_body: string
          script_email_subject: string
          script_sms: string
          script_whatsapp: string
        }[]
      }
      get_recurrence_opportunities: {
        Args: { p_days_before?: number; p_limit?: number; p_year_from?: number }
        Returns: {
          out_days_overdue: number
          out_due_date: string
          out_existing_lead_id: string
          out_last_procedure_date: string
          out_patient_cpf: string
          out_patient_email: string
          out_patient_name: string
          out_patient_phone: string
          out_patient_prontuario: string
          out_procedure_group: string
          out_procedure_name: string
          out_recurrence_days: number
          out_urgency_level: string
          out_whatsapp_script: string
        }[]
      }
      get_recurrence_stats: {
        Args: { p_year_from?: number }
        Returns: {
          by_procedure_group: Json
          overdue_critical: number
          overdue_recent: number
          total_pending: number
          upcoming_30_days: number
        }[]
      }
      get_seller_cadence_summary: {
        Args: { p_seller_id: string }
        Returns: {
          leads_sem_contato_24h: number
          leads_sem_contato_48h: number
          media_interacoes_por_lead: number
          melhor_horario_geral: number
          pior_horario_geral: number
          taxa_resposta_geral: number
          tempo_medio_resposta_geral: number
          total_leads_ativos: number
        }[]
      }
      get_sentiment_stats: { Args: never; Returns: Json }
      get_sentiment_stats_by_period: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vendedor_kpis: {
        Args: { vendedor_id: string }
        Returns: {
          atividades_mes: number
          ciclo_medio_dias: number
          faturamento_mes: number
          leads_ativos: number
          leads_parados: number
          leads_quentes: number
          leads_total: number
          ltv: number
          perdas_mes: number
          taxa_conversao: number
          tempo_medio_resposta_horas: number
          ticket_medio: number
          vendas_mes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_user: { Args: never; Returns: boolean }
      reject_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      update_last_access: { Args: never; Returns: undefined }
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
      testimonial_type: "google" | "video" | "gold" | "whatsapp"
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
      testimonial_type: ["google", "video", "gold", "whatsapp"],
    },
  },
} as const
