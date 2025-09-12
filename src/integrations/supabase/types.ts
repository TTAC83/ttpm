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
      iot_devices: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          mac_address: string
          name: string
          receiver_mac_address: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          mac_address: string
          name?: string
          receiver_mac_address: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
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
          line_name: string
          max_speed: number | null
          min_speed: number | null
          project_id: string
        }
        Insert: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_name: string
          max_speed?: number | null
          min_speed?: number | null
          project_id: string
        }
        Update: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_name?: string
          max_speed?: number | null
          min_speed?: number | null
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
          position: number
        }
        Insert: {
          id?: number
          name: string
          position?: number
        }
        Update: {
          id?: number
          name?: string
          position?: number
        }
        Relationships: []
      }
      master_tasks: {
        Row: {
          assigned_role: string | null
          details: string | null
          id: number
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
          id?: number
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
          id?: number
          planned_end_offset_days?: number
          planned_start_offset_days?: number
          position?: number
          step_id?: number
          technology_scope?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "master_steps"
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
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
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
        Relationships: []
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
          ai_iot_engineer: string | null
          company_id: string
          contract_signed_date: string
          created_at: string
          customer_project_lead: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          id: string
          implementation_lead: string | null
          name: string
          project_coordinator: string | null
          site_address: string | null
          site_name: string | null
          technical_project_lead: string | null
        }
        Insert: {
          ai_iot_engineer?: string | null
          company_id: string
          contract_signed_date: string
          created_at?: string
          customer_project_lead?: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          id?: string
          implementation_lead?: string | null
          name: string
          project_coordinator?: string | null
          site_address?: string | null
          site_name?: string | null
          technical_project_lead?: string | null
        }
        Update: {
          ai_iot_engineer?: string | null
          company_id?: string
          contract_signed_date?: string
          created_at?: string
          customer_project_lead?: string | null
          domain?: Database["public"]["Enums"]["work_domain"]
          id?: string
          implementation_lead?: string | null
          name?: string
          project_coordinator?: string | null
          site_address?: string | null
          site_name?: string | null
          technical_project_lead?: string | null
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
          line_name: string
          max_speed: number | null
          min_speed: number | null
          solutions_project_id: string
        }
        Insert: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_name: string
          max_speed?: number | null
          min_speed?: number | null
          solutions_project_id: string
        }
        Update: {
          camera_count?: number
          created_at?: string
          id?: string
          iot_device_count?: number
          line_name?: string
          max_speed?: number | null
          min_speed?: number | null
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
          company_name: string
          created_at: string
          created_by: string
          customer_lead: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          gateways_required: number | null
          id: string
          lines_required: number | null
          receivers_required: number | null
          salesperson: string | null
          servers_required: number | null
          site_address: string | null
          site_name: string
          solutions_consultant: string | null
          tv_display_devices_required: number | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by: string
          customer_lead?: string | null
          domain: Database["public"]["Enums"]["work_domain"]
          gateways_required?: number | null
          id?: string
          lines_required?: number | null
          receivers_required?: number | null
          salesperson?: string | null
          servers_required?: number | null
          site_address?: string | null
          site_name: string
          solutions_consultant?: string | null
          tv_display_devices_required?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string
          customer_lead?: string | null
          domain?: Database["public"]["Enums"]["work_domain"]
          gateways_required?: number | null
          id?: string
          lines_required?: number | null
          receivers_required?: number | null
          salesperson?: string | null
          servers_required?: number | null
          site_address?: string | null
          site_name?: string
          solutions_consultant?: string | null
          tv_display_devices_required?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assignee: string | null
          created_at: string
          details: string | null
          id: string
          planned_end: string | null
          planned_start: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assignee?: string | null
          created_at?: string
          details?: string | null
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
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
    }
    Views: {
      [_ in never]: never
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
      can_access_profile_field: {
        Args: {
          field_name: string
          profile_user_id: string
          requesting_user_id?: string
        }
        Returns: boolean
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
      is_current_user_internal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_internal_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_working_day: {
        Args: { d: string }
        Returns: boolean
      }
      snapshot_project_tasks: {
        Args: { p_project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      action_status: "Open" | "In Progress" | "Done"
      task_status: "Planned" | "In Progress" | "Blocked" | "Done"
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
      task_status: ["Planned", "In Progress", "Blocked", "Done"],
      work_domain: ["IoT", "Vision", "Hybrid"],
    },
  },
} as const
