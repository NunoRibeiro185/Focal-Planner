export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_deliverable_progress: {
        Row: {
          booking_id: string
          created_at: string
          description: string | null
          done: boolean
          id: string
          label: string
          package_version_custom_field_id: string
          photographer_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description?: string | null
          done?: boolean
          id?: string
          label: string
          package_version_custom_field_id: string
          photographer_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string | null
          done?: boolean
          id?: string
          label?: string
          package_version_custom_field_id?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_deliverable_progress_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_deliverable_progress_package_version_custom_field__fkey"
            columns: ["package_version_custom_field_id"]
            isOneToOne: false
            referencedRelation: "package_version_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_deliverable_progress_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_editing_stages: {
        Row: {
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          photographer_id: string
          sort_order: number
          title: string
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          photographer_id: string
          sort_order?: number
          title: string
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          photographer_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_editing_stages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_editing_stages_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_extras: {
        Row: {
          booking_id: string
          created_at: string
          currency_snapshot: string
          extra_id: string | null
          id: string
          name_snapshot: string
          photographer_id: string
          price_snapshot: number
          quantity: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency_snapshot: string
          extra_id?: string | null
          id?: string
          name_snapshot: string
          photographer_id: string
          price_snapshot: number
          quantity?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency_snapshot?: string
          extra_id?: string | null
          id?: string
          name_snapshot?: string
          photographer_id?: string
          price_snapshot?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_extras_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_extras_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_itinerary_stops: {
        Row: {
          address: string | null
          booking_id: string
          created_by: string
          id: string
          name: string
          notes: string | null
          photographer_id: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          address?: string | null
          booking_id: string
          created_by?: string
          id?: string
          name: string
          notes?: string | null
          photographer_id: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          address?: string | null
          booking_id?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          photographer_id?: string
          sort_order?: number
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_itinerary_stops_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_itinerary_stops_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          description_snapshot: string | null
          done: boolean
          id: string
          name_snapshot: string
          photographer_id: string
          quantity: number
          service_id: string | null
          sort_order: number
          track_completion_snapshot: boolean
          unit_price_snapshot: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          description_snapshot?: string | null
          done?: boolean
          id?: string
          name_snapshot: string
          photographer_id: string
          quantity?: number
          service_id?: string | null
          sort_order?: number
          track_completion_snapshot?: boolean
          unit_price_snapshot?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          description_snapshot?: string | null
          done?: boolean
          id?: string
          name_snapshot?: string
          photographer_id?: string
          quantity?: number
          service_id?: string | null
          sort_order?: number
          track_completion_snapshot?: boolean
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_tasks: {
        Row: {
          booking_id: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          photographer_id: string
          sort_order: number
          template_id: string | null
          title: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          photographer_id: string
          sort_order?: number
          template_id?: string | null
          title: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          photographer_id?: string
          sort_order?: number
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_email: string | null
          client_name_primary: string
          client_name_secondary: string | null
          client_phone: string | null
          client_token: string
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean
          deposit_paid_date: string | null
          discount_amount: number
          duration_hours: number | null
          event_date: string | null
          google_event_id: string | null
          hours_override: number | null
          id: string
          inquiry_form_id: string | null
          inquiry_form_name_snapshot: string | null
          is_archived: boolean
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          location: string | null
          notes: string | null
          package_version_id: string | null
          payment_due_date: string | null
          photographer_id: string
          price_override: number | null
          second_shooter_email: string | null
          second_shooter_fee: number | null
          second_shooter_id: string | null
          second_shooter_instructions: string | null
          second_shooter_invite_status: string | null
          second_shooter_invite_token: string | null
          second_shooter_password_hash: string | null
          second_shooter_show_client_contact: boolean
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          client_email?: string | null
          client_name_primary: string
          client_name_secondary?: string | null
          client_phone?: string | null
          client_token?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          discount_amount?: number
          duration_hours?: number | null
          event_date?: string | null
          google_event_id?: string | null
          hours_override?: number | null
          id?: string
          inquiry_form_id?: string | null
          inquiry_form_name_snapshot?: string | null
          is_archived?: boolean
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          location?: string | null
          notes?: string | null
          package_version_id?: string | null
          payment_due_date?: string | null
          photographer_id: string
          price_override?: number | null
          second_shooter_email?: string | null
          second_shooter_fee?: number | null
          second_shooter_id?: string | null
          second_shooter_instructions?: string | null
          second_shooter_invite_status?: string | null
          second_shooter_invite_token?: string | null
          second_shooter_password_hash?: string | null
          second_shooter_show_client_contact?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          client_email?: string | null
          client_name_primary?: string
          client_name_secondary?: string | null
          client_phone?: string | null
          client_token?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          discount_amount?: number
          duration_hours?: number | null
          event_date?: string | null
          google_event_id?: string | null
          hours_override?: number | null
          id?: string
          inquiry_form_id?: string | null
          inquiry_form_name_snapshot?: string | null
          is_archived?: boolean
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          location?: string | null
          notes?: string | null
          package_version_id?: string | null
          payment_due_date?: string | null
          photographer_id?: string
          price_override?: number | null
          second_shooter_email?: string | null
          second_shooter_fee?: number | null
          second_shooter_id?: string | null
          second_shooter_instructions?: string | null
          second_shooter_invite_status?: string | null
          second_shooter_invite_token?: string | null
          second_shooter_password_hash?: string | null
          second_shooter_show_client_contact?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_inquiry_form_id_fkey"
            columns: ["inquiry_form_id"]
            isOneToOne: false
            referencedRelation: "inquiry_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_version_id_fkey"
            columns: ["package_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_second_shooter_id_fkey"
            columns: ["second_shooter_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          field_type: string
          id: string
          label: string
          photographer_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          field_type: string
          id?: string
          label: string
          photographer_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          field_type?: string
          id?: string
          label?: string
          photographer_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_answers: {
        Row: {
          answer_text: string
          booking_id: string
          id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          answer_text: string
          booking_id: string
          id?: string
          question_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string
          booking_id?: string
          id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_answers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "deal_room_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_counter_offers: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          proposal_id: string
          proposed_total: number
          removed_item_names: Json
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          proposal_id: string
          proposed_total: number
          removed_item_names?: Json
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          proposal_id?: string
          proposed_total?: number
          removed_item_names?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_counter_offers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_counter_offers_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "deal_room_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_proposals: {
        Row: {
          allow_renegotiation: boolean
          booking_id: string
          id: string
          line_items: Json
          package_name: string
          photographer_id: string
          responded_at: string | null
          sent_at: string
          status: string
          total_price: number
        }
        Insert: {
          allow_renegotiation?: boolean
          booking_id: string
          id?: string
          line_items?: Json
          package_name: string
          photographer_id: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          total_price: number
        }
        Update: {
          allow_renegotiation?: boolean
          booking_id?: string
          id?: string
          line_items?: Json
          package_name?: string
          photographer_id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_proposals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_proposals_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_questions: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          photographer_id: string
          question_text: string
          sort_order: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          photographer_id: string
          question_text: string
          sort_order?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          photographer_id?: string
          question_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_questions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_questions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_statuses: {
        Row: {
          booking_id: string
          deliverable_key: Database["public"]["Enums"]["deliverable_key"]
          id: string
          photographer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          deliverable_key: Database["public"]["Enums"]["deliverable_key"]
          id?: string
          photographer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          deliverable_key?: Database["public"]["Enums"]["deliverable_key"]
          id?: string
          photographer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_statuses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_statuses_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      editing_stage_templates: {
        Row: {
          created_at: string
          id: string
          photographer_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          photographer_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          photographer_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "editing_stage_templates_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          auto_generated: boolean
          booking_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          paid_by: Database["public"]["Enums"]["expense_paid_by"]
          photographer_id: string
          reimbursed: boolean
          updated_at: string
          vat_percentage: number | null
        }
        Insert: {
          amount: number
          auto_generated?: boolean
          booking_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency: string
          description: string
          expense_date: string
          id?: string
          paid_by?: Database["public"]["Enums"]["expense_paid_by"]
          photographer_id: string
          reimbursed?: boolean
          updated_at?: string
          vat_percentage?: number | null
        }
        Update: {
          amount?: number
          auto_generated?: boolean
          booking_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          paid_by?: Database["public"]["Enums"]["expense_paid_by"]
          photographer_id?: string
          reimbursed?: boolean
          updated_at?: string
          vat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          photographer_id: string
          price: number
        }
        Insert: {
          created_at?: string
          currency: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          photographer_id: string
          price: number
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photographer_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "extras_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          photographer_id: string
          refresh_token: string
          selected_calendar_id: string | null
          selected_calendar_name: string | null
          token_expiry: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          photographer_id: string
          refresh_token: string
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          photographer_id?: string
          refresh_token?: string
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: true
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_answers: {
        Row: {
          answer_value: string
          booking_id: string
          created_at: string
          id: string
          question_text: string
          sort_order: number
        }
        Insert: {
          answer_value: string
          booking_id: string
          created_at?: string
          id?: string
          question_text: string
          sort_order?: number
        }
        Update: {
          answer_value?: string
          booking_id?: string
          created_at?: string
          id?: string
          question_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_answers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_form_allowed_packages: {
        Row: {
          form_id: string
          package_template_id: string
        }
        Insert: {
          form_id: string
          package_template_id: string
        }
        Update: {
          form_id?: string
          package_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_form_allowed_packages_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "inquiry_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_form_allowed_packages_package_template_id_fkey"
            columns: ["package_template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_form_field_options: {
        Row: {
          field_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          field_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          field_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_form_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "inquiry_form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_form_fields: {
        Row: {
          created_at: string
          field_mapping:
            | Database["public"]["Enums"]["inquiry_field_mapping"]
            | null
          field_type: Database["public"]["Enums"]["inquiry_field_type"]
          form_id: string
          helper_text: string | null
          id: string
          is_required: boolean
          label: string
          photographer_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_mapping?:
            | Database["public"]["Enums"]["inquiry_field_mapping"]
            | null
          field_type: Database["public"]["Enums"]["inquiry_field_type"]
          form_id: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          photographer_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_mapping?:
            | Database["public"]["Enums"]["inquiry_field_mapping"]
            | null
          field_type?: Database["public"]["Enums"]["inquiry_field_type"]
          form_id?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          photographer_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "inquiry_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_form_fields_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_forms: {
        Row: {
          archived_at: string | null
          created_at: string
          form_url: string
          id: string
          is_active: boolean
          name: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          form_url: string
          id?: string
          is_active?: boolean
          name: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          form_url?: string
          id?: string
          is_active?: boolean
          name?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_forms_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_template_services: {
        Row: {
          created_at: string
          default_quantity: number
          id: string
          package_template_id: string
          photographer_id: string
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          id?: string
          package_template_id: string
          photographer_id: string
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_quantity?: number
          id?: string
          package_template_id?: string
          photographer_id?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_template_services_package_template_id_fkey"
            columns: ["package_template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_template_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      package_templates: {
        Row: {
          archived: boolean
          created_at: string
          current_version_id: string | null
          id: string
          name: string
          photographer_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          current_version_id?: string | null
          id?: string
          name: string
          photographer_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          current_version_id?: string | null
          id?: string
          name?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_templates_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_version_custom_fields: {
        Row: {
          field_definition_id: string
          id: string
          package_version_id: string
          photographer_id: string
          value_bool: boolean | null
          value_text: string | null
        }
        Insert: {
          field_definition_id: string
          id?: string
          package_version_id: string
          photographer_id: string
          value_bool?: boolean | null
          value_text?: string | null
        }
        Update: {
          field_definition_id?: string
          id?: string
          package_version_id?: string
          photographer_id?: string
          value_bool?: boolean | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_version_custom_fields_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_version_custom_fields_package_version_id_fkey"
            columns: ["package_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_version_custom_fields_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_versions: {
        Row: {
          archived: boolean
          base_price: number
          created_at: string
          currency: string
          description: string | null
          hours_of_coverage: number
          id: string
          package_template_id: string
          photographer_id: string
          version_name: string
          version_number: number
        }
        Insert: {
          archived?: boolean
          base_price: number
          created_at?: string
          currency: string
          description?: string | null
          hours_of_coverage: number
          id?: string
          package_template_id: string
          photographer_id: string
          version_name: string
          version_number: number
        }
        Update: {
          archived?: boolean
          base_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          hours_of_coverage?: number
          id?: string
          package_template_id?: string
          photographer_id?: string
          version_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_versions_package_template_id_fkey"
            columns: ["package_template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_versions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_log_entries: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          note: string | null
          paid_date: string
          photographer_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_date: string
          photographer_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_date?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_log_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_log_entries_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          end_date: string
          end_time: string | null
          google_event_id: string | null
          id: string
          notes: string | null
          photographer_id: string
          start_date: string
          start_time: string | null
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          end_date: string
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          photographer_id: string
          start_date: string
          start_time?: string | null
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          end_date?: string
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          photographer_id?: string
          start_date?: string
          start_time?: string | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_events_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          created_at: string
          default_currency: string
          email: string
          full_name: string | null
          id: string
          inquiry_form_enabled: boolean
          inquiry_show_event_date: boolean
          inquiry_show_location: boolean
          inquiry_show_notes: boolean
          inquiry_show_packages: boolean
          inquiry_show_phone: boolean
          inquiry_show_prices: boolean
          inquiry_show_secondary_name: boolean
          inquiry_show_venue: boolean
          slug: string | null
          trial_warning_sent_at: string | null
        }
        Insert: {
          created_at?: string
          default_currency?: string
          email: string
          full_name?: string | null
          id: string
          inquiry_form_enabled?: boolean
          inquiry_show_event_date?: boolean
          inquiry_show_location?: boolean
          inquiry_show_notes?: boolean
          inquiry_show_packages?: boolean
          inquiry_show_phone?: boolean
          inquiry_show_prices?: boolean
          inquiry_show_secondary_name?: boolean
          inquiry_show_venue?: boolean
          slug?: string | null
          trial_warning_sent_at?: string | null
        }
        Update: {
          created_at?: string
          default_currency?: string
          email?: string
          full_name?: string | null
          id?: string
          inquiry_form_enabled?: boolean
          inquiry_show_event_date?: boolean
          inquiry_show_location?: boolean
          inquiry_show_notes?: boolean
          inquiry_show_packages?: boolean
          inquiry_show_phone?: boolean
          inquiry_show_prices?: boolean
          inquiry_show_secondary_name?: boolean
          inquiry_show_venue?: boolean
          slug?: string | null
          trial_warning_sent_at?: string | null
        }
        Relationships: []
      }
      second_shooter_notes: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          notes: string | null
          photographer_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          notes?: string | null
          photographer_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "second_shooter_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "second_shooter_notes_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          photographer_id: string
          track_completion: boolean
          unit_price: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          photographer_id: string
          track_completion?: boolean
          unit_price?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photographer_id?: string
          track_completion?: boolean
          unit_price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          lemon_squeezy_customer_id: string
          lemon_squeezy_subscription_id: string
          photographer_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_locked: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          lemon_squeezy_customer_id: string
          lemon_squeezy_subscription_id: string
          photographer_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_locked?: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          lemon_squeezy_customer_id?: string
          lemon_squeezy_subscription_id?: string
          photographer_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_locked?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: true
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          id: string
          photographer_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          photographer_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          photographer_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking_atomic: {
        Args: {
          p_client_email?: string
          p_client_name_primary?: string
          p_client_name_secondary?: string
          p_client_phone?: string
          p_deliverable_keys?: Database["public"]["Enums"]["deliverable_key"][]
          p_deposit_amount?: number
          p_discount_amount?: number
          p_duration_hours?: number
          p_event_date?: string
          p_hours_override?: number
          p_notes?: string
          p_package_version_id?: string
          p_payment_due_date?: string
          p_photographer_id: string
          p_price_override?: number
          p_start_time?: string
          p_status?: string
          p_task_sort_orders?: number[]
          p_task_template_ids?: string[]
          p_task_titles?: string[]
          p_total_price?: number
          p_venue_address?: string
          p_venue_name?: string
        }
        Returns: string
      }
      reassign_booking_package: {
        Args: {
          p_booking_id: string
          p_new_package_version_id: string
          p_new_total_price: number
          p_photographer_id: string
        }
        Returns: undefined
      }
      submit_inquiry_public: {
        Args: {
          p_answers?: Json
          p_client_email: string
          p_client_name_primary: string
          p_client_name_secondary?: string
          p_client_phone?: string
          p_event_date?: string
          p_form_url: string
          p_location?: string
          p_notes?: string
          p_package_template_id?: string
          p_photographer_url: string
          p_venue_address?: string
          p_venue_name?: string
        }
        Returns: string
      }
    }
    Enums: {
      booking_status:
        | "inquiry"
        | "confirmed"
        | "shoot_completed"
        | "editing"
        | "delivered"
        | "done"
        | "cancelled"
      deliverable_key:
        | "edited_photos"
        | "wedding_album"
        | "film_rolls"
        | "video"
        | "short_clips"
        | "second_shooter"
      expense_category:
        | "equipment"
        | "travel"
        | "accommodation"
        | "food"
        | "software_tools"
        | "film"
        | "second_shooter"
        | "other"
      expense_paid_by: "photographer" | "client"
      inquiry_field_mapping:
        | "client_name_secondary"
        | "client_phone"
        | "event_date"
        | "venue_name"
        | "venue_address"
        | "location"
        | "notes"
        | "package_template_id"
      inquiry_field_type:
        | "short_text"
        | "long_text"
        | "single_choice"
        | "multiple_choice"
        | "number"
        | "date"
      lead_source:
        | "instagram"
        | "facebook"
        | "weddingwire"
        | "google"
        | "referral"
        | "other"
        | "inquiry_form"
      subscription_plan: "monthly" | "annual"
      subscription_status: "active" | "cancelled" | "past_due" | "paused"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "inquiry",
        "confirmed",
        "shoot_completed",
        "editing",
        "delivered",
        "done",
        "cancelled",
      ],
      deliverable_key: [
        "edited_photos",
        "wedding_album",
        "film_rolls",
        "video",
        "short_clips",
        "second_shooter",
      ],
      expense_category: [
        "equipment",
        "travel",
        "accommodation",
        "food",
        "software_tools",
        "film",
        "second_shooter",
        "other",
      ],
      expense_paid_by: ["photographer", "client"],
      inquiry_field_mapping: [
        "client_name_secondary",
        "client_phone",
        "event_date",
        "venue_name",
        "venue_address",
        "location",
        "notes",
        "package_template_id",
      ],
      inquiry_field_type: [
        "short_text",
        "long_text",
        "single_choice",
        "multiple_choice",
        "number",
        "date",
      ],
      lead_source: [
        "instagram",
        "facebook",
        "weddingwire",
        "google",
        "referral",
        "other",
        "inquiry_form",
      ],
      subscription_plan: ["monthly", "annual"],
      subscription_status: ["active", "cancelled", "past_due", "paused"],
    },
  },
} as const

