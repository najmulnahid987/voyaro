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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          expense_date: string
          id: string
          notes: string | null
          paid_by: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency: string
          expense_date: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          confirmation_number: string | null
          created_at: string
          end_datetime: string | null
          id: string
          location: string | null
          metadata: Json
          notes: string | null
          start_datetime: string
          title: string
          trip_id: string
          type: string
          updated_at: string
          latitude: number | null
          longitude: number | null
          end_latitude: number | null
          end_longitude: number | null
        }
        Insert: {
          confirmation_number?: string | null
          created_at?: string
          end_datetime?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          notes?: string | null
          start_datetime: string
          title: string
          trip_id: string
          type: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          end_latitude?: number | null
          end_longitude?: number | null
        }
        Update: {
          confirmation_number?: string | null
          created_at?: string
          end_datetime?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          notes?: string | null
          start_datetime?: string
          title?: string
          trip_id?: string
          type?: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          end_latitude?: number | null
          end_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          interests: string[]
          onboarding_completed: boolean
          travel_pace: string | null
          travel_style: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email: string
          id: string
          interests?: string[]
          onboarding_completed?: boolean
          travel_pace?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          interests?: string[]
          onboarding_completed?: boolean
          travel_pace?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_budgets: {
        Row: {
          amount: number
          currency: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          currency: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          currency?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_budgets_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          category: string | null
          cities: string[]
          cover_image: string | null
          created_at: string
          destination: string
          end_date: string
          id: string
          start_date: string
          status: string
          title: string
          traveler_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cities?: string[]
          cover_image?: string | null
          created_at?: string
          destination: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          title: string
          traveler_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          cities?: string[]
          cover_image?: string | null
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          title?: string
          traveler_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_members: {
        Row: {
          created_at: string
          id: string
          role: 'owner' | 'editor' | 'viewer'
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: 'owner' | 'editor' | 'viewer'
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: 'owner' | 'editor' | 'viewer'
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_id: string
          role: 'editor' | 'viewer'
          status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'revoked' | 'expired'
          token: string
          trip_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          role?: 'editor' | 'viewer'
          status?: 'pending' | 'accepted' | 'declined' | 'canceled' | 'revoked' | 'expired'
          token?: string
          trip_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          role?: 'editor' | 'viewer'
          status?: 'pending' | 'accepted' | 'declined' | 'canceled' | 'revoked' | 'expired'
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trip_invitation: {
        Args: {
          invitation_token: string
        }
        Returns: Json
      }
      is_trip_member: {
        Args: {
          lookup_trip_id: string
          lookup_user_id?: string
        }
        Returns: boolean
      }
      get_trip_member_role: {
        Args: {
          lookup_trip_id: string
          lookup_user_id?: string
        }
        Returns: string
      }
      is_trip_owner: {
        Args: {
          lookup_trip_id: string
          lookup_user_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Convenience Aliases for Database Rows, Inserts, and Updates
// ---------------------------------------------------------------------------

export type ProfileRow = Tables<"profiles">
export type ProfileInsert = TablesInsert<"profiles">
export type ProfileUpdate = TablesUpdate<"profiles">

export type TripRow = Tables<"trips">
export type TripInsert = TablesInsert<"trips">
export type TripUpdate = TablesUpdate<"trips">

export type ItineraryItemRow = Tables<"itinerary_items">
export type ItineraryItemInsert = TablesInsert<"itinerary_items">
export type ItineraryItemUpdate = TablesUpdate<"itinerary_items">

export type ExpenseRow = Tables<"expenses">
export type ExpenseInsert = TablesInsert<"expenses">
export type ExpenseUpdate = TablesUpdate<"expenses">

export type TripBudgetRow = Tables<"trip_budgets">
export type TripBudgetInsert = TablesInsert<"trip_budgets">
export type TripBudgetUpdate = TablesUpdate<"trip_budgets">

export type TripMemberRow = Tables<"trip_members">
export type TripMemberInsert = TablesInsert<"trip_members">
export type TripMemberUpdate = TablesUpdate<"trip_members">

export type TripInvitationRow = Tables<"trip_invitations">
export type TripInvitationInsert = TablesInsert<"trip_invitations">
export type TripInvitationUpdate = TablesUpdate<"trip_invitations">

