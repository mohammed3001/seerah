/**
 * Supabase generated database types.
 *
 * Regenerate with:
 *   pnpm dlx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" \
 *     --schema public > packages/types/src/database.ts
 *
 * The placeholder type below mirrors the public schema until the first
 * generation is run. Keep in sync with `supabase/migrations/`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "prime" | "enterprise";
          plan_expires_at: string | null;
          stripe_customer_id: string | null;
          max_resumes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["profiles"]["Row"],
          "created_at" | "updated_at" | "max_resumes" | "plan"
        > & {
          plan?: "free" | "prime" | "enterprise";
          max_resumes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          template_id: string;
          language: "ar" | "en";
          is_public: boolean;
          password_hash: string | null;
          hide_from_search: boolean;
          completion_score: number;
          custom_url: string | null;
          views_count: number;
          theme: Json;
          section_order: Json;
          section_labels: Json;
          hidden_fields: Json;
          show_education_first: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["resumes"]["Row"]> & {
          user_id: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["resumes"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_completion_score: {
        Args: { p_resume_id: string };
        Returns: number;
      };
      generate_unique_slug: {
        Args: { p_name: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
