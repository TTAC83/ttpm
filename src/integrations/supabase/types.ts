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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          assignee: string | null
          created_at: string
          details: string | null
          id: string
          is_critical: boolean
          notes: string | null
          planned_date: string | null
          project_id: string | null
          project_task_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          is_critical?: boolean
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          project_task_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          is_critical?: boolean
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          project_task_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_project_task_id_fkey"
            columns: ["project_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          action_id: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
        }
        Insert: {
          action_id: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
        }
        Update: {
          action_id?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor: string | null
          at: string
          entity_id: string
          entity_type: string
          field: string
          id: number
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          actor?: string | null
          at?: string
          entity_id: string
          entity_type: string
          field: string
          id?: number
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          actor?: string | null
          at?: string
          entity_id?: string
          entity_type?: string
          field?: string
          id?: number
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bau_audit_logs: {
        Row: {
          actor: string | null
          at: string
          entity_id: string
          entity_type: string
          field: string | null
          id: number
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          actor?: string | null
          at?: string
          entity_id: string
          entity_type: string
          field?: string | null
          id?: number
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          actor?: string | null
          at?: string
          entity_id?: string
          entity_type?: string
          field?: string | null
          id?: number
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      bau_change_requests: {
        Row: {
          bau_customer_id: string
          created_at: string
          description: string | null
          id: string
          owner: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["change_req_status_enum"]
          target_date: string | null
          title: string
        }
        Insert: {
          bau_customer_id: string
          created_at?: string
          description?: string | null
          id?: string
          owner?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["change_req_status_enum"]
          target_date?: string | null
          title: string
        }
        Update: {
          bau_customer_id?: string
          created_at?: string
          description?: string | null
          id?: string
          owner?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["change_req_status_enum"]
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bau_change_requests_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_change_requests_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_change_requests_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_contacts: {
        Row: {
          bau_customer_id: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          role: string | null
        }
        Insert: {
          bau_customer_id: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Update: {
          bau_customer_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_contacts_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_contacts_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_contacts_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bau_customer_aliases: {
        Row: {
          alias: string
          bau_customer_id: string
          id: number
        }
        Insert: {
          alias: string
          bau_customer_id: string
          id?: number
        }
        Update: {
          alias?: string
          bau_customer_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bau_customer_aliases_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_customer_aliases_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_customer_aliases_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_customers: {
        Row: {
          arr_potential_max: number | null
          arr_potential_min: number | null
          company_id: string
          created_at: string
          created_by: string
          customer_type: string
          devices_deployed: number | null
          estimated_lines: number | null
          expansion_opportunity: string | null
          gateways_required: number | null
          go_live_date: string | null
          health: Database["public"]["Enums"]["bau_health_enum"]
          id: string
          job_scheduling: string | null
          job_scheduling_notes: string | null
          lines_required: number | null
          modules_and_features: string | null
          name: string
          notes: string | null
          primary_contact: string | null
          receivers_required: number | null
          s3_bucket_required: boolean | null
          salesperson: string | null
          servers_required: number | null
          short_term_arr_max: number | null
          short_term_arr_min: number | null
          short_term_estimated_lines: number | null
          short_term_estimated_sites: number | null
          site_name: string | null
          sla_resolution_hours: number | null
          sla_response_mins: number | null
          solutions_consultant: string | null
          subscription_plan: string | null
          tablet_use_cases: string | null
          teams_id: string | null
          teams_integration: boolean | null
          teams_webhook_url: string | null
          total_sites: number | null
          tv_display_devices_required: number | null
          website_url: string | null
        }
        Insert: {
          arr_potential_max?: number | null
          arr_potential_min?: number | null
          company_id: string
          created_at?: string
          created_by: string
          customer_type?: string
          devices_deployed?: number | null
          estimated_lines?: number | null
          expansion_opportunity?: string | null
          gateways_required?: number | null
          go_live_date?: string | null
          health?: Database["public"]["Enums"]["bau_health_enum"]
          id?: string
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          name: string
          notes?: string | null
          primary_contact?: string | null
          receivers_required?: number | null
          s3_bucket_required?: boolean | null
          salesperson?: string | null
          servers_required?: number | null
          short_term_arr_max?: number | null
          short_term_arr_min?: number | null
          short_term_estimated_lines?: number | null
          short_term_estimated_sites?: number | null
          site_name?: string | null
          sla_resolution_hours?: number | null
          sla_response_mins?: number | null
          solutions_consultant?: string | null
          subscription_plan?: string | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          total_sites?: number | null
          tv_display_devices_required?: number | null
          website_url?: string | null
        }
        Update: {
          arr_potential_max?: number | null
          arr_potential_min?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          customer_type?: string
          devices_deployed?: number | null
          estimated_lines?: number | null
          expansion_opportunity?: string | null
          gateways_required?: number | null
          go_live_date?: string | null
          health?: Database["public"]["Enums"]["bau_health_enum"]
          id?: string
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          name?: string
          notes?: string | null
          primary_contact?: string | null
          receivers_required?: number | null
          s3_bucket_required?: boolean | null
          salesperson?: string | null
          servers_required?: number | null
          short_term_arr_max?: number | null
          short_term_arr_min?: number | null
          short_term_estimated_lines?: number | null
          short_term_estimated_sites?: number | null
          site_name?: string | null
          sla_resolution_hours?: number | null
          sla_response_mins?: number | null
          solutions_consultant?: string | null
          subscription_plan?: string | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          total_sites?: number | null
          tv_display_devices_required?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_impl_companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bau_customers_primary_contact_fkey"
            columns: ["primary_contact"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bau_expense_links: {
        Row: {
          bau_customer_id: string
          created_at: string
          expense_assignment_id: string
          id: string
          is_billable: boolean | null
        }
        Insert: {
          bau_customer_id: string
          created_at?: string
          expense_assignment_id: string
          id?: string
          is_billable?: boolean | null
        }
        Update: {
          bau_customer_id?: string
          created_at?: string
          expense_assignment_id?: string
          id?: string
          is_billable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "expense_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "v_approved_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "v_bau_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "v_expense_admin_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "v_impl_lead_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_expense_assignment_id_fkey"
            columns: ["expense_assignment_id"]
            isOneToOne: true
            referencedRelation: "v_my_assigned_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_metric_catalog: {
        Row: {
          id: number
          label: string | null
          metric_key: string | null
          unit: string | null
        }
        Insert: {
          id?: number
          label?: string | null
          metric_key?: string | null
          unit?: string | null
        }
        Update: {
          id?: number
          label?: string | null
          metric_key?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      bau_sites: {
        Row: {
          address: string | null
          bau_customer_id: string
          id: string
          site_name: string
          timezone: string | null
        }
        Insert: {
          address?: string | null
          bau_customer_id: string
          id?: string
          site_name: string
          timezone?: string | null
        }
        Update: {
          address?: string | null
          bau_customer_id?: string
          id?: string
          site_name?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_sites_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_sites_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_sites_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_tickets: {
        Row: {
          assigned_to: string | null
          bau_customer_id: string
          created_at: string
          description: string | null
          id: string
          priority: number | null
          raised_by: string | null
          status: Database["public"]["Enums"]["ticket_status_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bau_customer_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: number | null
          raised_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bau_customer_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: number | null
          raised_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bau_tickets_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_tickets_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_tickets_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_visits: {
        Row: {
          attendee: string | null
          bau_customer_id: string
          created_at: string
          id: string
          next_actions: string | null
          summary: string | null
          visit_date: string
          visit_type: Database["public"]["Enums"]["visit_type_enum"]
        }
        Insert: {
          attendee?: string | null
          bau_customer_id: string
          created_at?: string
          id?: string
          next_actions?: string | null
          summary?: string | null
          visit_date: string
          visit_type?: Database["public"]["Enums"]["visit_type_enum"]
        }
        Update: {
          attendee?: string | null
          bau_customer_id?: string
          created_at?: string
          id?: string
          next_actions?: string | null
          summary?: string | null
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["visit_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "bau_visits_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_visits_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_visits_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_weekly_metrics: {
        Row: {
          bau_customer_id: string
          created_at: string
          created_by: string
          date_from: string
          date_to: string
          id: string
          metric_key: string
          metric_value_numeric: number | null
          metric_value_text: string | null
          source_upload_id: string | null
        }
        Insert: {
          bau_customer_id: string
          created_at?: string
          created_by: string
          date_from: string
          date_to: string
          id?: string
          metric_key: string
          metric_value_numeric?: number | null
          metric_value_text?: string | null
          source_upload_id?: string | null
        }
        Update: {
          bau_customer_id?: string
          created_at?: string
          created_by?: string
          date_from?: string
          date_to?: string
          id?: string
          metric_key?: string
          metric_value_numeric?: number | null
          metric_value_text?: string | null
          source_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_source_upload_id_fkey"
            columns: ["source_upload_id"]
            isOneToOne: false
            referencedRelation: "bau_weekly_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_weekly_reviews: {
        Row: {
          bau_customer_id: string
          churn_risk: Database["public"]["Enums"]["churn_risk_level"] | null
          date_from: string
          date_to: string
          escalation: string | null
          health: Database["public"]["Enums"]["bau_health_simple"]
          id: string
          reason_code: string | null
          reviewed_at: string
          reviewed_by: string
          status: string | null
        }
        Insert: {
          bau_customer_id: string
          churn_risk?: Database["public"]["Enums"]["churn_risk_level"] | null
          date_from: string
          date_to: string
          escalation?: string | null
          health?: Database["public"]["Enums"]["bau_health_simple"]
          id?: string
          reason_code?: string | null
          reviewed_at?: string
          reviewed_by: string
          status?: string | null
        }
        Update: {
          bau_customer_id?: string
          churn_risk?: Database["public"]["Enums"]["churn_risk_level"] | null
          date_from?: string
          date_to?: string
          escalation?: string | null
          health?: Database["public"]["Enums"]["bau_health_simple"]
          id?: string
          reason_code?: string | null
          reviewed_at?: string
          reviewed_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_weekly_reviews_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_reviews_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_reviews_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bau_weekly_uploads: {
        Row: {
          id: string
          notes: string | null
          processed_at: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          notes?: string | null
          processed_at?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          id?: string
          notes?: string | null
          processed_at?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      cameras: {
        Row: {
          camera_type: string
          created_at: string
          equipment_id: string
          id: string
          lens_type: string
          light_id: string | null
          light_required: boolean | null
          mac_address: string
          updated_at: string
        }
        Insert: {
          camera_type: string
          created_at?: string
          equipment_id: string
          id?: string
          lens_type: string
          light_id?: string | null
          light_required?: boolean | null
          mac_address: string
          updated_at?: string
        }
        Update: {
          camera_type?: string
          created_at?: string
          equipment_id?: string
          id?: string
          lens_type?: string
          light_id?: string | null
          light_required?: boolean | null
          mac_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_light_id_fkey"
            columns: ["light_id"]
            isOneToOne: false
            referencedRelation: "lights"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras_master: {
        Row: {
          camera_type: string | null
          created_at: string
          description: string | null
          id: string
          manufacturer: string
          model_number: string
          order_hyperlink: string | null
          price: number | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          camera_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer: string
          model_number: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          camera_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string
          model_number?: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          name?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          equipment_type: string | null
          id: string
          line_id: string
          name: string
          position_id: string
          position_x: number
          position_y: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type?: string | null
          id?: string
          line_id: string
          name: string
          position_id: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string | null
          id?: string
          line_id?: string
          name?: string
          position_id?: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_titles: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_titles_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_at: string
          assigned_by: string
          assigned_to_project_id: string | null
          assigned_to_solutions_project_id: string | null
          assigned_to_user_id: string | null
          assignee_description: string | null
          assignment_notes: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          expense_id: string
          id: string
          is_billable: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status_enum"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string
          assigned_by: string
          assigned_to_project_id?: string | null
          assigned_to_solutions_project_id?: string | null
          assigned_to_user_id?: string | null
          assignee_description?: string | null
          assignment_notes?: string | null
          category?: Database["public"]["Enums"]["expense_category_enum"] | null
          customer?: string | null
          expense_id: string
          id?: string
          is_billable?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status_enum"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string
          assigned_by?: string
          assigned_to_project_id?: string | null
          assigned_to_solutions_project_id?: string | null
          assigned_to_user_id?: string | null
          assignee_description?: string | null
          assignment_notes?: string | null
          category?: Database["public"]["Enums"]["expense_category_enum"] | null
          customer?: string | null
          expense_id?: string
          id?: string
          is_billable?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_assignments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account: string | null
          account_code: string | null
          created_at: string
          customer: string | null
          description: string | null
          expense_date: string | null
          gross: number | null
          id: string
          invoice_number: string | null
          net: number | null
          reference: string | null
          source: string | null
          updated_at: string
          vat: number | null
          vat_rate: number | null
          vat_rate_name: string | null
        }
        Insert: {
          account?: string | null
          account_code?: string | null
          created_at?: string
          customer?: string | null
          description?: string | null
          expense_date?: string | null
          gross?: number | null
          id?: string
          invoice_number?: string | null
          net?: number | null
          reference?: string | null
          source?: string | null
          updated_at?: string
          vat?: number | null
          vat_rate?: number | null
          vat_rate_name?: string | null
        }
        Update: {
          account?: string | null
          account_code?: string | null
          created_at?: string
          customer?: string | null
          description?: string | null
          expense_date?: string | null
          gross?: number | null
          id?: string
          invoice_number?: string | null
          net?: number | null
          reference?: string | null
          source?: string | null
          updated_at?: string
          vat?: number | null
          vat_rate?: number | null
          vat_rate_name?: string | null
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          complete_date: string | null
          created_at: string
          created_by: string
          date_raised: string
          design_start_date: string | null
          dev_start_date: string | null
          id: string
          problem_statement: string | null
          required_date: string | null
          requirements: string | null
          solution_overview: string | null
          status: Database["public"]["Enums"]["feature_request_status_enum"]
          title: string
          updated_at: string
          user_story_goal: string | null
          user_story_outcome: string | null
          user_story_role: string | null
        }
        Insert: {
          complete_date?: string | null
          created_at?: string
          created_by: string
          date_raised?: string
          design_start_date?: string | null
          dev_start_date?: string | null
          id?: string
          problem_statement?: string | null
          required_date?: string | null
          requirements?: string | null
          solution_overview?: string | null
          status?: Database["public"]["Enums"]["feature_request_status_enum"]
          title: string
          updated_at?: string
          user_story_goal?: string | null
          user_story_outcome?: string | null
          user_story_role?: string | null
        }
        Update: {
          complete_date?: string | null
          created_at?: string
          created_by?: string
          date_raised?: string
          design_start_date?: string | null
          dev_start_date?: string | null
          id?: string
          problem_statement?: string | null
          required_date?: string | null
          requirements?: string | null
          solution_overview?: string | null
          status?: Database["public"]["Enums"]["feature_request_status_enum"]
          title?: string
          updated_at?: string
          user_story_goal?: string | null
          user_story_outcome?: string | null
          user_story_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gateways_master: {
        Row: {
          communication_protocols: string | null
          connection_types: string | null
          created_at: string
          description: string | null
          gateway_type: string | null
          id: string
          manufacturer: string
          max_devices: number | null
          model_number: string
          order_hyperlink: string | null
          power_requirements: string | null
          price: number | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          communication_protocols?: string | null
          connection_types?: string | null
          created_at?: string
          description?: string | null
          gateway_type?: string | null
          id?: string
          manufacturer: string
          max_devices?: number | null
          model_number: string
          order_hyperlink?: string | null
          power_requirements?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          communication_protocols?: string | null
          connection_types?: string | null
          created_at?: string
          description?: string | null
          gateway_type?: string | null
          id?: string
          manufacturer?: string
          max_devices?: number | null
          model_number?: string
          order_hyperlink?: string | null
          power_requirements?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hardware_master: {
        Row: {
          comments: string | null
          created_at: string | null
          description: string | null
          hardware_type: string
          id: string
          minimum_quantity: number | null
          price_gbp: number | null
          product_name: string
          required_optional: string | null
          sku_no: string
          tags: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          description?: string | null
          hardware_type: string
          id?: string
          minimum_quantity?: number | null
          price_gbp?: number | null
          product_name: string
          required_optional?: string | null
          sku_no: string
          tags?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          description?: string | null
          hardware_type?: string
          id?: string
          minimum_quantity?: number | null
          price_gbp?: number | null
          product_name?: string
          required_optional?: string | null
          sku_no?: string
          tags?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      impl_weekly_reviews: {
        Row: {
          churn_risk: Database["public"]["Enums"]["churn_risk_level"] | null
          churn_risk_reason: string | null
          company_id: string
          current_status: string | null
          customer_health:
            | Database["public"]["Enums"]["impl_health_simple"]
            | null
          id: string
          notes: string | null
          planned_go_live_date: string | null
          project_status: Database["public"]["Enums"]["impl_week_status"] | null
          reason_code: string | null
          reviewed_at: string
          reviewed_by: string
          week_end: string
          week_start: string
          weekly_summary: string | null
        }
        Insert: {
          churn_risk?: Database["public"]["Enums"]["churn_risk_level"] | null
          churn_risk_reason?: string | null
          company_id: string
          current_status?: string | null
          customer_health?:
            | Database["public"]["Enums"]["impl_health_simple"]
            | null
          id?: string
          notes?: string | null
          planned_go_live_date?: string | null
          project_status?:
            | Database["public"]["Enums"]["impl_week_status"]
            | null
          reason_code?: string | null
          reviewed_at?: string
          reviewed_by: string
          week_end: string
          week_start: string
          weekly_summary?: string | null
        }
        Update: {
          churn_risk?: Database["public"]["Enums"]["churn_risk_level"] | null
          churn_risk_reason?: string | null
          company_id?: string
          current_status?: string | null
          customer_health?:
            | Database["public"]["Enums"]["impl_health_simple"]
            | null
          id?: string
          notes?: string | null
          planned_go_live_date?: string | null
          project_status?:
            | Database["public"]["Enums"]["impl_week_status"]
            | null
          reason_code?: string | null
          reviewed_at?: string
          reviewed_by?: string
          week_end?: string
          week_start?: string
          weekly_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impl_weekly_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impl_weekly_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_impl_companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "impl_weekly_reviews_week_start_fkey"
            columns: ["week_start"]
            isOneToOne: false
            referencedRelation: "impl_weekly_weeks"
            referencedColumns: ["week_start"]
          },
        ]
      }
      impl_weekly_weeks: {
        Row: {
          available_at: string
          created_at: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          available_at: string
          created_at?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          available_at?: string
          created_at?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      implementation_blocker_attachments: {
        Row: {
          blocker_id: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          blocker_id: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          blocker_id?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_blocker_attachments_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "implementation_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementation_blocker_attachments_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "v_impl_open_blockers"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_blocker_updates: {
        Row: {
          blocker_id: string
          created_at: string
          created_by: string
          id: string
          note: string
        }
        Insert: {
          blocker_id: string
          created_at?: string
          created_by: string
          id?: string
          note: string
        }
        Update: {
          blocker_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_blocker_updates_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "implementation_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementation_blocker_updates_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "v_impl_open_blockers"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_blockers: {
        Row: {
          closed_at: string | null
          created_by: string
          description: string | null
          estimated_complete_date: string | null
          id: string
          is_critical: boolean
          owner: string
          project_id: string
          raised_at: string
          reason_code: string | null
          resolution_notes: string | null
          status: Database["public"]["Enums"]["implementation_blocker_status_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_by: string
          description?: string | null
          estimated_complete_date?: string | null
          id?: string
          is_critical?: boolean
          owner: string
          project_id: string
          raised_at?: string
          reason_code?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["implementation_blocker_status_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_by?: string
          description?: string | null
          estimated_complete_date?: string | null
          id?: string
          is_critical?: boolean
          owner?: string
          project_id?: string
          raised_at?: string
          reason_code?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["implementation_blocker_status_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_blockers_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "implementation_blockers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_devices: {
        Row: {
          created_at: string
          equipment_id: string
          hardware_master_id: string | null
          id: string
          mac_address: string
          name: string
          receiver_mac_address: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          hardware_master_id?: string | null
          id?: string
          mac_address: string
          name?: string
          receiver_mac_address: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          hardware_master_id?: string | null
          id?: string
          mac_address?: string
          name?: string
          receiver_mac_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iot_devices_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_devices_hardware_master_id_fkey"
            columns: ["hardware_master_id"]
            isOneToOne: false
            referencedRelation: "hardware_master"
            referencedColumns: ["id"]
          },
        ]
      }
      lens_master: {
        Row: {
          aperture: string | null
          created_at: string
          description: string | null
          focal_length: string | null
          id: string
          lens_type: string | null
          manufacturer: string
          model_number: string
          order_hyperlink: string | null
          price: number | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          aperture?: string | null
          created_at?: string
          description?: string | null
          focal_length?: string | null
          id?: string
          lens_type?: string | null
          manufacturer: string
          model_number: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          aperture?: string | null
          created_at?: string
          description?: string | null
          focal_length?: string | null
          id?: string
          lens_type?: string | null
          manufacturer?: string
          model_number?: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lights: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manufacturer: string
          model_number: string
          order_hyperlink: string | null
          price: number | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer: string
          model_number: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string
          model_number?: string
          order_hyperlink?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lines: {
        Row: {
          camera_count: number
          created_at: string
          id: string
          iot_device_count: number
          line_description: string | null
          line_name: string
          max_speed: number | null
          min_speed: number | null
          product_description: string | null
          project_id: string
        }
        Insert: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_description?: string | null
          line_name: string
          max_speed?: number | null
          min_speed?: number | null
          product_description?: string | null
          project_id: string
        }
        Update: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_description?: string | null
          line_name?: string
          max_speed?: number | null
          min_speed?: number | null
          product_description?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      master_steps: {
        Row: {
          id: number
          name: string
          planned_end_offset_days: number | null
          planned_start_offset_days: number | null
          position: number
        }
        Insert: {
          id?: number
          name: string
          planned_end_offset_days?: number | null
          planned_start_offset_days?: number | null
          position?: number
        }
        Update: {
          id?: number
          name?: string
          planned_end_offset_days?: number | null
          planned_start_offset_days?: number | null
          position?: number
        }
        Relationships: []
      }
      master_task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          dependency_type: string
          id: string
          lag_days: number | null
          predecessor_id: number
          predecessor_type: string
          successor_id: number
          successor_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_id: number
          predecessor_type: string
          successor_id: number
          successor_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_id?: number
          predecessor_type?: string
          successor_id?: number
          successor_type?: string
        }
        Relationships: []
      }
      master_tasks: {
        Row: {
          assigned_role: string | null
          details: string | null
          duration_days: number
          id: number
          parent_task_id: number | null
          planned_end_offset_days: number
          planned_start_offset_days: number
          position: number
          step_id: number
          technology_scope: string
          title: string
        }
        Insert: {
          assigned_role?: string | null
          details?: string | null
          duration_days?: number
          id?: number
          parent_task_id?: number | null
          planned_end_offset_days?: number
          planned_start_offset_days?: number
          position?: number
          step_id: number
          technology_scope?: string
          title: string
        }
        Update: {
          assigned_role?: string | null
          details?: string | null
          duration_days?: number
          id?: number
          parent_task_id?: number | null
          planned_end_offset_days?: number
          planned_start_offset_days?: number
          position?: number
          step_id?: number
          technology_scope?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "master_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "master_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "v_master_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      plc_master: {
        Row: {
          communication_protocol: string | null
          created_at: string
          description: string | null
          id: string
          input_output_count: string | null
          manufacturer: string
          model_number: string
          order_hyperlink: string | null
          plc_type: string | null
          price: number | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          communication_protocol?: string | null
          created_at?: string
          description?: string | null
          id?: string
          input_output_count?: string | null
          manufacturer: string
          model_number: string
          order_hyperlink?: string | null
          plc_type?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          communication_protocol?: string | null
          created_at?: string
          description?: string | null
          id?: string
          input_output_count?: string | null
          manufacturer?: string
          model_number?: string
          order_hyperlink?: string | null
          plc_type?: string | null
          price?: number | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      position_titles: {
        Row: {
          created_at: string
          id: string
          position_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_titles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          line_id: string
          name: string
          position_x: number
          position_y: number
          titles: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_id: string
          name: string
          position_x?: number
          position_y?: number
          titles?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string
          name?: string
          position_x?: number
          position_y?: number
          titles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      product_gaps: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          estimated_complete_date: string | null
          feature_request_id: string | null
          id: string
          is_critical: boolean
          project_id: string
          resolution_notes: string | null
          status: string
          ticket_link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_complete_date?: string | null
          feature_request_id?: string | null
          id?: string
          is_critical?: boolean
          project_id: string
          resolution_notes?: string | null
          status?: string
          ticket_link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_complete_date?: string | null
          feature_request_id?: string | null
          id?: string
          is_critical?: boolean
          project_id?: string
          resolution_notes?: string | null
          status?: string
          ticket_link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_gaps_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_gaps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_gaps_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_gaps_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "v_my_feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_gaps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          expense_approver_user_id: string | null
          is_internal: boolean
          job_title: string | null
          name: string | null
          phone: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          expense_approver_user_id?: string | null
          is_internal?: boolean
          job_title?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          expense_approver_user_id?: string | null
          is_internal?: boolean
          job_title?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_impl_companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "profiles_expense_approver_user_id_fkey"
            columns: ["expense_approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_critical: boolean
          project_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_critical?: boolean
          project_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_critical?: boolean
          project_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_events_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_iot_requirements: {
        Row: {
          bau_customer_id: string | null
          created_at: string
          gateway_id: string | null
          hardware_master_id: string | null
          hardware_type: string
          id: string
          name: string | null
          notes: string | null
          project_id: string | null
          quantity: number
          receiver_id: string | null
          solutions_project_id: string | null
          updated_at: string
        }
        Insert: {
          bau_customer_id?: string | null
          created_at?: string
          gateway_id?: string | null
          hardware_master_id?: string | null
          hardware_type: string
          id?: string
          name?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number
          receiver_id?: string | null
          solutions_project_id?: string | null
          updated_at?: string
        }
        Update: {
          bau_customer_id?: string | null
          created_at?: string
          gateway_id?: string | null
          hardware_master_id?: string | null
          hardware_type?: string
          id?: string
          name?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number
          receiver_id?: string | null
          solutions_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_iot_requirements_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_hardware_master_id_fkey"
            columns: ["hardware_master_id"]
            isOneToOne: false
            referencedRelation: "hardware_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "receivers_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_iot_requirements_solutions_project_id_fkey"
            columns: ["solutions_project_id"]
            isOneToOne: false
            referencedRelation: "solutions_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role_in_project: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role_in_project?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role_in_project?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assignee: string | null
          created_at: string
          id: string
          master_task_id: number | null
          parent_task_id: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          step_name: string
          task_details: string | null
          task_title: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assignee?: string | null
          created_at?: string
          id?: string
          master_task_id?: number | null
          parent_task_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          step_name: string
          task_details?: string | null
          task_title: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assignee?: string | null
          created_at?: string
          id?: string
          master_task_id?: number | null
          parent_task_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          step_name?: string
          task_details?: string | null
          task_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_tasks_master_task_id_fkey"
            columns: ["master_task_id"]
            isOneToOne: false
            referencedRelation: "master_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_manager: string | null
          ai_iot_engineer: string | null
          arr: number | null
          arr_potential_max: number | null
          arr_potential_min: number | null
          auto_renewal: boolean | null
          billing_terms: string | null
          break_clause_enabled: boolean | null
          break_clause_key_points_md: string | null
          break_clause_project_date: string | null
          case_study: boolean | null
          company_id: string
          contract_end_date: string | null
          contract_signed_date: string
          contract_start_date: string | null
          contracted_days: number | null
          contracted_lines: number | null
          created_at: string
          customer_project_lead: string | null
          deviation_of_terms: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          estimated_lines: number | null
          expansion_opportunity: string | null
          gateways_required: number | null
          hardware_fee: number | null
          id: string
          implementation_lead: string | null
          job_scheduling: string | null
          job_scheduling_notes: string | null
          line_description: string | null
          lines_required: number | null
          modules_and_features: string | null
          mrr: number | null
          name: string
          payment_terms_days: number | null
          product_description: string | null
          project_coordinator: string | null
          receivers_required: number | null
          reference_call: boolean | null
          reference_status:
            | Database["public"]["Enums"]["reference_status_enum"]
            | null
          s3_bucket_required: boolean | null
          sales_lead: string | null
          salesperson: string | null
          segment: string | null
          servers_required: number | null
          services_fee: number | null
          short_term_arr_max: number | null
          short_term_arr_min: number | null
          short_term_estimated_lines: number | null
          short_term_estimated_sites: number | null
          site_address: string | null
          site_name: string | null
          site_visit: boolean | null
          solution_consultant: string | null
          solutions_consultant: string | null
          standard_terms: boolean | null
          tablet_use_cases: string | null
          teams_id: string | null
          teams_integration: boolean | null
          teams_webhook_url: string | null
          technical_project_lead: string | null
          testimonial: boolean | null
          total_sites: number | null
          tv_display_devices_required: number | null
          useful_links: Json | null
          website_url: string | null
        }
        Insert: {
          account_manager?: string | null
          ai_iot_engineer?: string | null
          arr?: number | null
          arr_potential_max?: number | null
          arr_potential_min?: number | null
          auto_renewal?: boolean | null
          billing_terms?: string | null
          break_clause_enabled?: boolean | null
          break_clause_key_points_md?: string | null
          break_clause_project_date?: string | null
          case_study?: boolean | null
          company_id: string
          contract_end_date?: string | null
          contract_signed_date: string
          contract_start_date?: string | null
          contracted_days?: number | null
          contracted_lines?: number | null
          created_at?: string
          customer_project_lead?: string | null
          deviation_of_terms?: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          estimated_lines?: number | null
          expansion_opportunity?: string | null
          gateways_required?: number | null
          hardware_fee?: number | null
          id?: string
          implementation_lead?: string | null
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          line_description?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          mrr?: number | null
          name: string
          payment_terms_days?: number | null
          product_description?: string | null
          project_coordinator?: string | null
          receivers_required?: number | null
          reference_call?: boolean | null
          reference_status?:
            | Database["public"]["Enums"]["reference_status_enum"]
            | null
          s3_bucket_required?: boolean | null
          sales_lead?: string | null
          salesperson?: string | null
          segment?: string | null
          servers_required?: number | null
          services_fee?: number | null
          short_term_arr_max?: number | null
          short_term_arr_min?: number | null
          short_term_estimated_lines?: number | null
          short_term_estimated_sites?: number | null
          site_address?: string | null
          site_name?: string | null
          site_visit?: boolean | null
          solution_consultant?: string | null
          solutions_consultant?: string | null
          standard_terms?: boolean | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          technical_project_lead?: string | null
          testimonial?: boolean | null
          total_sites?: number | null
          tv_display_devices_required?: number | null
          useful_links?: Json | null
          website_url?: string | null
        }
        Update: {
          account_manager?: string | null
          ai_iot_engineer?: string | null
          arr?: number | null
          arr_potential_max?: number | null
          arr_potential_min?: number | null
          auto_renewal?: boolean | null
          billing_terms?: string | null
          break_clause_enabled?: boolean | null
          break_clause_key_points_md?: string | null
          break_clause_project_date?: string | null
          case_study?: boolean | null
          company_id?: string
          contract_end_date?: string | null
          contract_signed_date?: string
          contract_start_date?: string | null
          contracted_days?: number | null
          contracted_lines?: number | null
          created_at?: string
          customer_project_lead?: string | null
          deviation_of_terms?: string | null
          domain?: Database["public"]["Enums"]["work_domain"]
          estimated_lines?: number | null
          expansion_opportunity?: string | null
          gateways_required?: number | null
          hardware_fee?: number | null
          id?: string
          implementation_lead?: string | null
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          line_description?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          mrr?: number | null
          name?: string
          payment_terms_days?: number | null
          product_description?: string | null
          project_coordinator?: string | null
          receivers_required?: number | null
          reference_call?: boolean | null
          reference_status?:
            | Database["public"]["Enums"]["reference_status_enum"]
            | null
          s3_bucket_required?: boolean | null
          sales_lead?: string | null
          salesperson?: string | null
          segment?: string | null
          servers_required?: number | null
          services_fee?: number | null
          short_term_arr_max?: number | null
          short_term_arr_min?: number | null
          short_term_estimated_lines?: number | null
          short_term_estimated_sites?: number | null
          site_address?: string | null
          site_name?: string | null
          site_visit?: boolean | null
          solution_consultant?: string | null
          solutions_consultant?: string | null
          standard_terms?: boolean | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          technical_project_lead?: string | null
          testimonial?: boolean | null
          total_sites?: number | null
          tv_display_devices_required?: number | null
          useful_links?: Json | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_ai_iot_engineer_fkey"
            columns: ["ai_iot_engineer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_impl_companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "projects_customer_project_lead_fkey"
            columns: ["customer_project_lead"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_implementation_lead_fkey"
            columns: ["implementation_lead"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_project_coordinator_fkey"
            columns: ["project_coordinator"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_technical_project_lead_fkey"
            columns: ["technical_project_lead"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      receivers_master: {
        Row: {
          communication_protocol: string | null
          created_at: string
          description: string | null
          frequency_range: string | null
          id: string
          manufacturer: string
          model_number: string
          order_hyperlink: string | null
          power_requirements: string | null
          price: number | null
          range_distance: string | null
          receiver_type: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          communication_protocol?: string | null
          created_at?: string
          description?: string | null
          frequency_range?: string | null
          id?: string
          manufacturer: string
          model_number: string
          order_hyperlink?: string | null
          power_requirements?: string | null
          price?: number | null
          range_distance?: string | null
          receiver_type?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          communication_protocol?: string | null
          created_at?: string
          description?: string | null
          frequency_range?: string | null
          id?: string
          manufacturer?: string
          model_number?: string
          order_hyperlink?: string | null
          power_requirements?: string | null
          price?: number | null
          range_distance?: string | null
          receiver_type?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      servers_master: {
        Row: {
          cpu_specs: string | null
          created_at: string
          description: string | null
          id: string
          manufacturer: string
          model_number: string
          operating_system: string | null
          order_hyperlink: string | null
          price: number | null
          ram_specs: string | null
          server_type: string | null
          storage_specs: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          cpu_specs?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer: string
          model_number: string
          operating_system?: string | null
          order_hyperlink?: string | null
          price?: number | null
          ram_specs?: string | null
          server_type?: string | null
          storage_specs?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          cpu_specs?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string
          model_number?: string
          operating_system?: string | null
          order_hyperlink?: string | null
          price?: number | null
          ram_specs?: string | null
          server_type?: string | null
          storage_specs?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      solutions_lines: {
        Row: {
          camera_count: number
          created_at: string
          id: string
          iot_device_count: number
          line_description: string | null
          line_name: string
          max_speed: number | null
          min_speed: number | null
          product_description: string | null
          solutions_project_id: string
        }
        Insert: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_description?: string | null
          line_name: string
          max_speed?: number | null
          min_speed?: number | null
          product_description?: string | null
          solutions_project_id: string
        }
        Update: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_description?: string | null
          line_name?: string
          max_speed?: number | null
          min_speed?: number | null
          product_description?: string | null
          solutions_project_id?: string
        }
        Relationships: []
      }
      solutions_project_gateways: {
        Row: {
          created_at: string
          gateway_master_id: string
          id: string
          quantity: number
          solutions_project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gateway_master_id: string
          id?: string
          quantity?: number
          solutions_project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gateway_master_id?: string
          id?: string
          quantity?: number
          solutions_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_project_gateways_gateway_master_id_fkey"
            columns: ["gateway_master_id"]
            isOneToOne: false
            referencedRelation: "gateways_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_project_gateways_solutions_project_id_fkey"
            columns: ["solutions_project_id"]
            isOneToOne: false
            referencedRelation: "solutions_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_project_receivers: {
        Row: {
          created_at: string
          id: string
          quantity: number
          receiver_master_id: string
          solutions_project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          receiver_master_id: string
          solutions_project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          receiver_master_id?: string
          solutions_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_project_receivers_receiver_master_id_fkey"
            columns: ["receiver_master_id"]
            isOneToOne: false
            referencedRelation: "receivers_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_project_receivers_solutions_project_id_fkey"
            columns: ["solutions_project_id"]
            isOneToOne: false
            referencedRelation: "solutions_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_project_servers: {
        Row: {
          created_at: string
          id: string
          quantity: number
          server_master_id: string
          solutions_project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          server_master_id: string
          solutions_project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          server_master_id?: string
          solutions_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_project_servers_server_master_id_fkey"
            columns: ["server_master_id"]
            isOneToOne: false
            referencedRelation: "servers_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_project_servers_solutions_project_id_fkey"
            columns: ["solutions_project_id"]
            isOneToOne: false
            referencedRelation: "solutions_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_project_tv_displays: {
        Row: {
          created_at: string
          id: string
          quantity: number
          solutions_project_id: string
          tv_display_master_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          solutions_project_id: string
          tv_display_master_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          solutions_project_id?: string
          tv_display_master_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_project_tv_displays_solutions_project_id_fkey"
            columns: ["solutions_project_id"]
            isOneToOne: false
            referencedRelation: "solutions_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_project_tv_displays_tv_display_master_id_fkey"
            columns: ["tv_display_master_id"]
            isOneToOne: false
            referencedRelation: "tv_displays_master"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_projects: {
        Row: {
          account_manager: string | null
          ai_iot_engineer: string | null
          arr: number | null
          auto_renewal: boolean | null
          billing_terms: string | null
          break_clause_enabled: boolean | null
          break_clause_key_points_md: string | null
          break_clause_project_date: string | null
          case_study: boolean | null
          company_name: string
          contract_end_date: string | null
          contract_signed_date: string | null
          contract_start_date: string | null
          contracted_days: number | null
          contracted_lines: number | null
          created_at: string
          created_by: string
          customer_email: string | null
          customer_job_title: string | null
          customer_phone: string | null
          customer_project_lead: string | null
          deviation_of_terms: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          expansion_opportunity: string | null
          gateways_required: number | null
          hardware_fee: number | null
          id: string
          implementation_lead: string | null
          job_scheduling: string | null
          job_scheduling_notes: string | null
          line_description: string | null
          lines_required: number | null
          modules_and_features: string | null
          mrr: number | null
          payment_terms_days: number | null
          product_description: string | null
          project_coordinator: string | null
          receivers_required: number | null
          reference_call: boolean | null
          reference_status: string | null
          s3_bucket_required: boolean | null
          sales_lead: string | null
          salesperson: string | null
          segment: string | null
          servers_required: number | null
          services_fee: number | null
          site_address: string | null
          site_name: string
          site_visit: boolean | null
          solutions_consultant: string | null
          standard_terms: boolean | null
          tablet_use_cases: string | null
          teams_id: string | null
          teams_integration: boolean | null
          teams_webhook_url: string | null
          technical_project_lead: string | null
          testimonial: boolean | null
          tv_display_devices_required: number | null
          updated_at: string
          useful_links: Json | null
          website_url: string | null
        }
        Insert: {
          account_manager?: string | null
          ai_iot_engineer?: string | null
          arr?: number | null
          auto_renewal?: boolean | null
          billing_terms?: string | null
          break_clause_enabled?: boolean | null
          break_clause_key_points_md?: string | null
          break_clause_project_date?: string | null
          case_study?: boolean | null
          company_name: string
          contract_end_date?: string | null
          contract_signed_date?: string | null
          contract_start_date?: string | null
          contracted_days?: number | null
          contracted_lines?: number | null
          created_at?: string
          created_by: string
          customer_email?: string | null
          customer_job_title?: string | null
          customer_phone?: string | null
          customer_project_lead?: string | null
          deviation_of_terms?: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          expansion_opportunity?: string | null
          gateways_required?: number | null
          hardware_fee?: number | null
          id?: string
          implementation_lead?: string | null
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          line_description?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          mrr?: number | null
          payment_terms_days?: number | null
          product_description?: string | null
          project_coordinator?: string | null
          receivers_required?: number | null
          reference_call?: boolean | null
          reference_status?: string | null
          s3_bucket_required?: boolean | null
          sales_lead?: string | null
          salesperson?: string | null
          segment?: string | null
          servers_required?: number | null
          services_fee?: number | null
          site_address?: string | null
          site_name: string
          site_visit?: boolean | null
          solutions_consultant?: string | null
          standard_terms?: boolean | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          technical_project_lead?: string | null
          testimonial?: boolean | null
          tv_display_devices_required?: number | null
          updated_at?: string
          useful_links?: Json | null
          website_url?: string | null
        }
        Update: {
          account_manager?: string | null
          ai_iot_engineer?: string | null
          arr?: number | null
          auto_renewal?: boolean | null
          billing_terms?: string | null
          break_clause_enabled?: boolean | null
          break_clause_key_points_md?: string | null
          break_clause_project_date?: string | null
          case_study?: boolean | null
          company_name?: string
          contract_end_date?: string | null
          contract_signed_date?: string | null
          contract_start_date?: string | null
          contracted_days?: number | null
          contracted_lines?: number | null
          created_at?: string
          created_by?: string
          customer_email?: string | null
          customer_job_title?: string | null
          customer_phone?: string | null
          customer_project_lead?: string | null
          deviation_of_terms?: string | null
          domain?: Database["public"]["Enums"]["work_domain"]
          expansion_opportunity?: string | null
          gateways_required?: number | null
          hardware_fee?: number | null
          id?: string
          implementation_lead?: string | null
          job_scheduling?: string | null
          job_scheduling_notes?: string | null
          line_description?: string | null
          lines_required?: number | null
          modules_and_features?: string | null
          mrr?: number | null
          payment_terms_days?: number | null
          product_description?: string | null
          project_coordinator?: string | null
          receivers_required?: number | null
          reference_call?: boolean | null
          reference_status?: string | null
          s3_bucket_required?: boolean | null
          sales_lead?: string | null
          salesperson?: string | null
          segment?: string | null
          servers_required?: number | null
          services_fee?: number | null
          site_address?: string | null
          site_name?: string
          site_visit?: boolean | null
          solutions_consultant?: string | null
          standard_terms?: boolean | null
          tablet_use_cases?: string | null
          teams_id?: string | null
          teams_integration?: boolean | null
          teams_webhook_url?: string | null
          technical_project_lead?: string | null
          testimonial?: boolean | null
          tv_display_devices_required?: number | null
          updated_at?: string
          useful_links?: Json | null
          website_url?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_role: string | null
          assignee: string | null
          created_at: string
          details: string | null
          id: string
          planned_end: string | null
          planned_end_offset_days: number
          planned_start: string | null
          planned_start_offset_days: number
          position: number
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          technology_scope: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_role?: string | null
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          planned_end?: string | null
          planned_end_offset_days?: number
          planned_start?: string | null
          planned_start_offset_days?: number
          position?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_id: string
          technology_scope?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_role?: string | null
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          planned_end?: string | null
          planned_end_offset_days?: number
          planned_start?: string | null
          planned_start_offset_days?: number
          position?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          technology_scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_displays_master: {
        Row: {
          connectivity_options: string | null
          created_at: string
          description: string | null
          display_type: string | null
          id: string
          manufacturer: string
          model_number: string
          mounting_type: string | null
          order_hyperlink: string | null
          power_consumption: string | null
          price: number | null
          resolution: string | null
          screen_size: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_person: string | null
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          connectivity_options?: string | null
          created_at?: string
          description?: string | null
          display_type?: string | null
          id?: string
          manufacturer: string
          model_number: string
          mounting_type?: string | null
          order_hyperlink?: string | null
          power_consumption?: string | null
          price?: number | null
          resolution?: string | null
          screen_size?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          connectivity_options?: string | null
          created_at?: string
          description?: string | null
          display_type?: string | null
          id?: string
          manufacturer?: string
          model_number?: string
          mounting_type?: string | null
          order_hyperlink?: string | null
          power_consumption?: string | null
          price?: number | null
          resolution?: string | null
          screen_size?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_person?: string | null
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uk_bank_holidays: {
        Row: {
          date: string
          name: string
        }
        Insert: {
          date: string
          name: string
        }
        Update: {
          date?: string
          name?: string
        }
        Relationships: []
      }
      vision_models: {
        Row: {
          created_at: string
          end_date: string | null
          equipment: string
          id: string
          line_name: string
          position: string
          product_run_end: string | null
          product_run_start: string | null
          product_sku: string
          product_title: string
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
          use_case: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          equipment: string
          id?: string
          line_name: string
          position: string
          product_run_end?: string | null
          product_run_start?: string | null
          product_sku: string
          product_title: string
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
          use_case: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          equipment?: string
          id?: string
          line_name?: string
          position?: string
          product_run_end?: string | null
          product_run_start?: string | null
          product_sku?: string
          product_title?: string
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          use_case?: string
        }
        Relationships: []
      }
      wbs_layouts: {
        Row: {
          height: number
          id: string
          pos_x: number
          pos_y: number
          project_id: string | null
          step_name: string
          updated_at: string
          updated_by: string
          width: number
        }
        Insert: {
          height?: number
          id?: string
          pos_x?: number
          pos_y?: number
          project_id?: string | null
          step_name: string
          updated_at?: string
          updated_by: string
          width?: number
        }
        Update: {
          height?: number
          id?: string
          pos_x?: number
          pos_y?: number
          project_id?: string | null
          step_name?: string
          updated_at?: string
          updated_by?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "wbs_layouts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_all_projects_for_selection: {
        Row: {
          customer_name: string | null
          implementation_lead: string | null
          kind: string | null
          project_id: string | null
          project_name: string | null
          site_name: string | null
          solutions_project_id: string | null
        }
        Relationships: []
      }
      v_approved_expenses: {
        Row: {
          account: string | null
          account_code: string | null
          approved_at: string | null
          assigned_at: string | null
          assignee_description: string | null
          assignee_name: string | null
          assignment_notes: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          expense_date: string | null
          expense_description: string | null
          expense_id: string | null
          gross: number | null
          id: string | null
          import_customer: string | null
          is_billable: boolean | null
          net: number | null
          source: string | null
          status: Database["public"]["Enums"]["expense_status_enum"] | null
          vat: number | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bau_expenses: {
        Row: {
          account: string | null
          account_code: string | null
          assigned_at: string | null
          assigned_to_user_id: string | null
          assignee_description: string | null
          assignment_notes: string | null
          bau_customer_id: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          description: string | null
          expense_date: string | null
          expense_id: string | null
          gross: number | null
          id: string | null
          is_billable: boolean | null
          net: number | null
          status: Database["public"]["Enums"]["expense_status_enum"] | null
          vat: number | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_expense_links_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bau_latest_review: {
        Row: {
          customer_health: Database["public"]["Enums"]["bau_health_enum"] | null
          date_from: string | null
          date_to: string | null
          devices_deployed: number | null
          escalation: string | null
          go_live_date: string | null
          id: string | null
          name: string | null
          notes: string | null
          reason_code: string | null
          review_health: Database["public"]["Enums"]["bau_health_simple"] | null
          reviewed_at: string | null
          reviewed_by_name: string | null
          site_name: string | null
          sla_resolution_hours: number | null
          sla_response_mins: number | null
          subscription_plan: string | null
        }
        Relationships: []
      }
      v_bau_list: {
        Row: {
          company_id: string | null
          company_name: string | null
          devices_deployed: number | null
          go_live_date: string | null
          health: Database["public"]["Enums"]["bau_health_enum"] | null
          id: string | null
          name: string | null
          notes: string | null
          open_tickets: number | null
          site_name: string | null
          sla_resolution_hours: number | null
          sla_response_mins: number | null
          subscription_plan: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_impl_companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_bau_metric_agg: {
        Row: {
          bau_customer_id: string | null
          customer_name: string | null
          date_from: string | null
          date_to: string | null
          metric_key: string | null
          metric_label: string | null
          metric_unit: string | null
          metric_value: number | null
          metric_value_text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bau_metric_trend: {
        Row: {
          bau_customer_id: string | null
          customer_name: string | null
          date_from: string | null
          date_to: string | null
          metric_key: string | null
          metric_label: string | null
          metric_unit: string | null
          metric_value_numeric: number | null
          metric_value_text: string | null
          percent_change: number | null
          prev_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "bau_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_latest_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bau_weekly_metrics_bau_customer_id_fkey"
            columns: ["bau_customer_id"]
            isOneToOne: false
            referencedRelation: "v_bau_list"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bau_my_tickets: {
        Row: {
          assigned_to_name: string | null
          created_at: string | null
          customer_name: string | null
          description: string | null
          id: string | null
          priority: number | null
          raised_by_name: string | null
          site_name: string | null
          status: Database["public"]["Enums"]["ticket_status_enum"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_bau_projects_like: {
        Row: {
          customer_name: string | null
          domain: Database["public"]["Enums"]["work_domain"] | null
          project_name: string | null
          project_start_date: string | null
          site_name: string | null
        }
        Relationships: []
      }
      v_distinct_customers: {
        Row: {
          customer: string | null
        }
        Relationships: []
      }
      v_expense_admin_queue: {
        Row: {
          account: string | null
          account_code: string | null
          assigned_at: string | null
          assigned_to_project_id: string | null
          assigned_to_user_id: string | null
          assignee_description: string | null
          assignee_name: string | null
          assignment_notes: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          expense_date: string | null
          expense_description: string | null
          expense_id: string | null
          gross: number | null
          id: string | null
          import_customer: string | null
          is_billable: boolean | null
          net: number | null
          source: string | null
          status: Database["public"]["Enums"]["expense_status_enum"] | null
          vat: number | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_impl_companies: {
        Row: {
          active_projects: number | null
          company_id: string | null
          company_name: string | null
          first_project_date: string | null
          is_internal: boolean | null
          latest_contract_date: string | null
          project_count: number | null
        }
        Relationships: []
      }
      v_impl_lead_queue: {
        Row: {
          account: string | null
          account_code: string | null
          assigned_at: string | null
          assignee_description: string | null
          assignee_name: string | null
          assignment_notes: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          expense_date: string | null
          expense_description: string | null
          expense_id: string | null
          gross: number | null
          id: string | null
          import_customer: string | null
          is_billable: boolean | null
          net: number | null
          source: string | null
          status: Database["public"]["Enums"]["expense_status_enum"] | null
          vat: number | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_impl_open_blockers: {
        Row: {
          created_by_name: string | null
          description: string | null
          estimated_complete_date: string | null
          id: string | null
          is_critical: boolean | null
          owner_name: string | null
          project_domain: Database["public"]["Enums"]["work_domain"] | null
          project_name: string | null
          raised_at: string | null
          reason_code: string | null
          status:
            | Database["public"]["Enums"]["implementation_blocker_status_enum"]
            | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_master_steps: {
        Row: {
          id: number | null
          position: number | null
          step_name: string | null
          task_count: number | null
        }
        Relationships: []
      }
      v_my_assigned_expenses: {
        Row: {
          account: string | null
          account_code: string | null
          assigned_at: string | null
          assignee_description: string | null
          assignment_notes: string | null
          category: Database["public"]["Enums"]["expense_category_enum"] | null
          customer: string | null
          expense_date: string | null
          expense_description: string | null
          expense_id: string | null
          gross: number | null
          id: string | null
          import_customer: string | null
          is_billable: boolean | null
          net: number | null
          source: string | null
          status: Database["public"]["Enums"]["expense_status_enum"] | null
          vat: number | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_assignments_expense_id"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_my_feature_requests: {
        Row: {
          complete_date: string | null
          created_at: string | null
          created_by_name: string | null
          date_raised: string | null
          design_start_date: string | null
          dev_start_date: string | null
          id: string | null
          problem_statement: string | null
          required_date: string | null
          requirements: string | null
          solution_overview: string | null
          status:
            | Database["public"]["Enums"]["feature_request_status_enum"]
            | null
          title: string | null
          updated_at: string | null
          user_story_goal: string | null
          user_story_outcome: string | null
          user_story_role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_working_days: {
        Args: { n: number; start_date: string }
        Returns: string
      }
      admin_set_user_role_and_company: {
        Args: { company_name?: string; new_role: string; target_email: string }
        Returns: undefined
      }
      auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      bau_create_customer: {
        Args: {
          p_company_id: string
          p_name: string
          p_plan?: string
          p_site_name?: string
          p_sla_resolution_hours?: number
          p_sla_response_mins?: number
        }
        Returns: string
      }
      bau_create_ticket: {
        Args: {
          p_bau_customer_id: string
          p_description?: string
          p_priority?: number
          p_title: string
        }
        Returns: string
      }
      bau_log_visit: {
        Args: {
          p_attendee: string
          p_bau_customer_id: string
          p_next_actions?: string
          p_summary?: string
          p_visit_date: string
          p_visit_type: Database["public"]["Enums"]["visit_type_enum"]
        }
        Returns: string
      }
      bau_update_health: {
        Args: {
          p_bau_customer_id: string
          p_health: Database["public"]["Enums"]["bau_health_enum"]
        }
        Returns: undefined
      }
      bau_update_ticket_status: {
        Args: {
          p_status: Database["public"]["Enums"]["ticket_status_enum"]
          p_ticket_id: string
        }
        Returns: undefined
      }
      can_access_profile_field: {
        Args: {
          field_name: string
          profile_user_id: string
          requesting_user_id?: string
        }
        Returns: boolean
      }
      can_access_subtask: {
        Args: { subtask_task_id: string }
        Returns: boolean
      }
      copy_wbs_layout_for_project: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      expense_admin_signoff: {
        Args: { p_approved: boolean; p_assignment_id: string }
        Returns: undefined
      }
      expense_confirm: {
        Args: {
          p_assign_to_project: boolean
          p_assignee_description: string
          p_assignment_id: string
          p_billable: boolean
          p_category: Database["public"]["Enums"]["expense_category_enum"]
          p_customer: string
          p_project_id: string
          p_project_kind: string
        }
        Returns: undefined
      }
      expense_lead_approve: {
        Args: { p_assignment_id: string; p_billable: boolean }
        Returns: undefined
      }
      find_bau_customer_id: {
        Args: { p_customer_name: string }
        Returns: string
      }
      get_all_users_with_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          company_id: string
          company_name: string
          created_at: string
          email: string
          is_internal: boolean
          job_title: string
          last_sign_in_at: string
          name: string
          phone: string
          role: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_item_predecessors: {
        Args: { p_item_id: number; p_item_type: string }
        Returns: {
          dependency_id: string
          dependency_type: string
          lag_days: number
          predecessor_id: number
          predecessor_type: string
        }[]
      }
      get_item_successors: {
        Args: { p_item_id: number; p_item_type: string }
        Returns: {
          dependency_id: string
          dependency_type: string
          lag_days: number
          successor_id: number
          successor_type: string
        }[]
      }
      get_safe_profile_info: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          is_internal: boolean
          name: string
          role: string
          user_id: string
        }[]
      }
      get_user_company_id: {
        Args: { user_email: string }
        Returns: string
      }
      get_user_company_id_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      get_user_company_projects: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      has_expense_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_expense_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      impl_generate_weeks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      impl_set_weekly_review: {
        Args:
          | {
              p_churn_risk?: Database["public"]["Enums"]["churn_risk_level"]
              p_company_id: string
              p_current_status?: string
              p_customer_health: Database["public"]["Enums"]["impl_health_simple"]
              p_notes?: string
              p_planned_go_live_date?: string
              p_project_status: Database["public"]["Enums"]["impl_week_status"]
              p_reason_code?: string
              p_week_start: string
              p_weekly_summary?: string
            }
          | {
              p_company_id: string
              p_current_status?: string
              p_customer_health: Database["public"]["Enums"]["impl_health_simple"]
              p_notes?: string
              p_planned_go_live_date?: string
              p_project_status: Database["public"]["Enums"]["impl_week_status"]
              p_reason_code?: string
              p_week_start: string
              p_weekly_summary?: string
            }
          | {
              p_company_id: string
              p_customer_health: Database["public"]["Enums"]["impl_health_simple"]
              p_notes?: string
              p_project_status: Database["public"]["Enums"]["impl_week_status"]
              p_reason_code?: string
              p_week_start: string
            }
          | {
              p_company_id: string
              p_customer_health: Database["public"]["Enums"]["impl_health_simple"]
              p_notes?: string
              p_project_status: Database["public"]["Enums"]["impl_week_status"]
              p_week_start: string
            }
        Returns: undefined
      }
      is_current_user_internal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_internal_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_impl_lead_for: {
        Args: { project_id: string }
        Returns: boolean
      }
      is_internal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_project_impl_lead: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_id: string; user_id?: string }
        Returns: boolean
      }
      is_working_day: {
        Args: { d: string }
        Returns: boolean
      }
      link_expense_to_bau: {
        Args: {
          p_bau_customer_id: string
          p_expense_assignment_id: string
          p_is_billable?: boolean
        }
        Returns: undefined
      }
      set_bau_weekly_review: {
        Args:
          | {
              p_bau_customer_id: string
              p_churn_risk?: Database["public"]["Enums"]["churn_risk_level"]
              p_date_from: string
              p_date_to: string
              p_escalation?: string
              p_health: Database["public"]["Enums"]["bau_health_simple"]
              p_reason_code?: string
            }
          | {
              p_bau_customer_id: string
              p_churn_risk?: Database["public"]["Enums"]["churn_risk_level"]
              p_date_from: string
              p_date_to: string
              p_escalation?: string
              p_health: Database["public"]["Enums"]["bau_health_simple"]
              p_reason_code?: string
              p_status?: string
            }
          | {
              p_bau_customer_id: string
              p_date_from: string
              p_date_to: string
              p_escalation: string
              p_health: Database["public"]["Enums"]["bau_health_simple"]
            }
          | {
              p_bau_customer_id: string
              p_date_from: string
              p_date_to: string
              p_escalation?: string
              p_health: Database["public"]["Enums"]["bau_health_simple"]
              p_reason_code?: string
            }
        Returns: undefined
      }
      snapshot_project_tasks: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      suggest_assignee: {
        Args: { expense_id: string }
        Returns: {
          confidence: number
          matched_text: string
          user_id: string
        }[]
      }
      upsert_bau_alias: {
        Args: { p_alias: string; p_bau_customer_id: string }
        Returns: undefined
      }
      upsert_bau_weekly_metric: {
        Args: {
          p_bau_customer_id: string
          p_date_from: string
          p_date_to: string
          p_metric_key: string
          p_metric_value_numeric: number
          p_metric_value_text: string
          p_source_upload_id: string
        }
        Returns: undefined
      }
      user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      action_status: "Open" | "In Progress" | "Done"
      bau_health_enum: "Excellent" | "Good" | "Watch" | "AtRisk"
      bau_health_simple: "green" | "red"
      change_req_status_enum:
        | "Proposed"
        | "Approved"
        | "Rejected"
        | "Scheduled"
        | "Completed"
      churn_risk_level: "Certain" | "High" | "Medium" | "Low"
      expense_category_enum:
        | "FoodDrink"
        | "Hotel"
        | "Tools"
        | "Software"
        | "Hardware"
        | "Postage"
        | "Transport"
        | "Other"
      expense_status_enum:
        | "Unassigned"
        | "Assigned"
        | "ConfirmedByAssignee"
        | "PendingLeadReview"
        | "ReadyForSignoff"
        | "Approved"
        | "Rejected"
      feature_request_status_enum:
        | "Requested"
        | "Rejected"
        | "In Design"
        | "In Dev"
        | "Complete"
      impl_health_simple: "green" | "red"
      impl_week_status: "on_track" | "off_track"
      implementation_blocker_status_enum: "Live" | "Closed"
      reference_status_enum: "Active" | "Promised" | "Priority" | "N/A"
      task_status: "Planned" | "In Progress" | "Blocked" | "Done"
      ticket_status_enum:
        | "Open"
        | "InProgress"
        | "WaitingCustomer"
        | "Resolved"
        | "Closed"
      visit_type_enum: "Onsite" | "Remote" | "Review" | "Training"
      work_domain: "IoT" | "Vision" | "Hybrid"
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
      action_status: ["Open", "In Progress", "Done"],
      bau_health_enum: ["Excellent", "Good", "Watch", "AtRisk"],
      bau_health_simple: ["green", "red"],
      change_req_status_enum: [
        "Proposed",
        "Approved",
        "Rejected",
        "Scheduled",
        "Completed",
      ],
      churn_risk_level: ["Certain", "High", "Medium", "Low"],
      expense_category_enum: [
        "FoodDrink",
        "Hotel",
        "Tools",
        "Software",
        "Hardware",
        "Postage",
        "Transport",
        "Other",
      ],
      expense_status_enum: [
        "Unassigned",
        "Assigned",
        "ConfirmedByAssignee",
        "PendingLeadReview",
        "ReadyForSignoff",
        "Approved",
        "Rejected",
      ],
      feature_request_status_enum: [
        "Requested",
        "Rejected",
        "In Design",
        "In Dev",
        "Complete",
      ],
      impl_health_simple: ["green", "red"],
      impl_week_status: ["on_track", "off_track"],
      implementation_blocker_status_enum: ["Live", "Closed"],
      reference_status_enum: ["Active", "Promised", "Priority", "N/A"],
      task_status: ["Planned", "In Progress", "Blocked", "Done"],
      ticket_status_enum: [
        "Open",
        "InProgress",
        "WaitingCustomer",
        "Resolved",
        "Closed",
      ],
      visit_type_enum: ["Onsite", "Remote", "Review", "Training"],
      work_domain: ["IoT", "Vision", "Hybrid"],
    },
  },
} as const
