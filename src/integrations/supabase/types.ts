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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          claim: string
          created_at: string
          id: string
          movie_id: string | null
          reporter_email: string
          reporter_name: string
          resolution_note: string | null
          status: string
        }
        Insert: {
          claim: string
          created_at?: string
          id?: string
          movie_id?: string | null
          reporter_email: string
          reporter_name: string
          resolution_note?: string | null
          status?: string
        }
        Update: {
          claim?: string
          created_at?: string
          id?: string
          movie_id?: string | null
          reporter_email?: string
          reporter_name?: string
          resolution_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      download_events: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          link_expires_at: string
          movie_id: string
          quality: string
          subject: string
          user_id: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          link_expires_at: string
          movie_id: string
          quality: string
          subject: string
          user_id?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          link_expires_at?: string
          movie_id?: string
          quality?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "download_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_events_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_import_jobs: {
        Row: {
          bytes_copied: number
          created_at: string
          created_by: string | null
          drive_file_id: string
          error: string | null
          id: string
          movie_id: string | null
          quality: string
          status: string
        }
        Insert: {
          bytes_copied?: number
          created_at?: string
          created_by?: string | null
          drive_file_id: string
          error?: string | null
          id?: string
          movie_id?: string | null
          quality: string
          status?: string
        }
        Update: {
          bytes_copied?: number
          created_at?: string
          created_by?: string | null
          drive_file_id?: string
          error?: string | null
          id?: string
          movie_id?: string | null
          quality?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_jobs_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
        }
        Insert: {
          created_at?: string
          id: string
          ip_hash?: string | null
          last_seen_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          created_by: string | null
          expected_size_bytes: number | null
          id: string
          mime_type: string | null
          movie_id: string
          playback_checked_at: string | null
          quality: string
          sha256: string | null
          size_bytes: number | null
          source: string
          status: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          movie_id: string
          playback_checked_at?: string | null
          quality: string
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          movie_id?: string
          playback_checked_at?: string | null
          quality?: string
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_credits: {
        Row: {
          credit_role: string
          id: string
          movie_id: string
          person_name: string
          sort_order: number
        }
        Insert: {
          credit_role: string
          id?: string
          movie_id: string
          person_name: string
          sort_order?: number
        }
        Update: {
          credit_role?: string
          id?: string
          movie_id?: string
          person_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_credits_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          movie_id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          movie_id: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          movie_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_screenshots_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          backdrop_url: string | null
          certification: string | null
          content_advisory: string | null
          created_at: string
          created_by: string | null
          featured: boolean
          genres: string[]
          id: string
          is_demo: boolean
          language: string | null
          popularity: number
          poster_url: string | null
          published_at: string | null
          release_year: number | null
          runtime_minutes: number | null
          slug: string
          status: Database["public"]["Enums"]["movie_status"]
          synopsis: string | null
          title: string
          trailer_verified: boolean
          trailer_youtube_id: string | null
          updated_at: string
        }
        Insert: {
          backdrop_url?: string | null
          certification?: string | null
          content_advisory?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          genres?: string[]
          id?: string
          is_demo?: boolean
          language?: string | null
          popularity?: number
          poster_url?: string | null
          published_at?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          slug: string
          status?: Database["public"]["Enums"]["movie_status"]
          synopsis?: string | null
          title: string
          trailer_verified?: boolean
          trailer_youtube_id?: string | null
          updated_at?: string
        }
        Update: {
          backdrop_url?: string | null
          certification?: string | null
          content_advisory?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          genres?: string[]
          id?: string
          is_demo?: boolean
          language?: string | null
          popularity?: number
          poster_url?: string | null
          published_at?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["movie_status"]
          synopsis?: string | null
          title?: string
          trailer_verified?: boolean
          trailer_youtube_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      playback_sessions: {
        Row: {
          counted: boolean
          created_at: string
          id: string
          last_heartbeat_at: string
          movie_id: string
          quota_day: string
          user_id: string
          validated_seconds: number
        }
        Insert: {
          counted?: boolean
          created_at?: string
          id?: string
          last_heartbeat_at?: string
          movie_id: string
          quota_day: string
          user_id: string
          validated_seconds?: number
        }
        Update: {
          counted?: boolean
          created_at?: string
          id?: string
          last_heartbeat_at?: string
          movie_id?: string
          quota_day?: string
          user_id?: string
          validated_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "playback_sessions_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deletion_requested_at: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quota_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          movie_id: string
          quota_day: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          movie_id: string
          quota_day: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          movie_id?: string
          quota_day?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quota_usage_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          id: string
          moderation_note: string | null
          movie_id: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          body?: string | null
          created_at?: string
          id?: string
          moderation_note?: string | null
          movie_id: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          id?: string
          moderation_note?: string | null
          movie_id?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      rights_records: {
        Row: {
          allow_download: boolean
          allow_guest_download: boolean
          allow_stream: boolean
          created_at: string
          created_by: string | null
          evidence_notes: string | null
          expires_at: string | null
          id: string
          licence_reference: string
          movie_id: string
          revoked_at: string | null
          rights_holder: string
          territories: string | null
          valid_from: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          allow_download?: boolean
          allow_guest_download?: boolean
          allow_stream?: boolean
          created_at?: string
          created_by?: string | null
          evidence_notes?: string | null
          expires_at?: string | null
          id?: string
          licence_reference: string
          movie_id: string
          revoked_at?: string | null
          rights_holder: string
          territories?: string | null
          valid_from?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          allow_download?: boolean
          allow_guest_download?: boolean
          allow_stream?: boolean
          created_at?: string
          created_by?: string | null
          evidence_notes?: string | null
          expires_at?: string | null
          id?: string
          licence_reference?: string
          movie_id?: string
          revoked_at?: string | null
          rights_holder?: string
          territories?: string | null
          valid_from?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rights_records_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
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
          role: Database["public"]["Enums"]["app_role"]
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
      watch_progress: {
        Row: {
          duration_seconds: number | null
          last_played_at: string
          movie_id: string
          position_seconds: number
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          last_played_at?: string
          movie_id: string
          position_seconds?: number
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          last_played_at?: string
          movie_id?: string
          position_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string
          movie_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          movie_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_owner: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { _bucket: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      ist_today: { Args: never; Returns: string }
      movie_availability: { Args: { _movie_id: string }; Returns: Json }
      movie_rating: { Args: { _movie_id: string }; Returns: Json }
      movies_with_quality: { Args: { _quality: string }; Returns: string[] }
      owner_exists: { Args: never; Returns: boolean }
      reserve_quota: {
        Args: {
          _kind: string
          _limit: number
          _movie_id: string
          _subject: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "content_admin" | "media_manager" | "moderator"
      asset_status: "uploading" | "uploaded" | "verified" | "failed"
      movie_status: "draft" | "pending_approval" | "published" | "unpublished"
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
    Enums: {
      app_role: ["owner", "content_admin", "media_manager", "moderator"],
      asset_status: ["uploading", "uploaded", "verified", "failed"],
      movie_status: ["draft", "pending_approval", "published", "unpublished"],
    },
  },
} as const
