/**
 * Supabase generated database types.
 *
 * Regenerate with:
 *   pnpm dlx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" \
 *     --schema public > packages/types/src/database.ts
 *
 * The shape below mirrors the public schema in `supabase/migrations/`. Keep
 * in sync until automated generation is wired up.
 *
 * NOTE: Row/Insert/Update aliases are declared as `type` (not `interface`).
 * Interfaces don't satisfy `Record<string, unknown>` (they're open for
 * declaration merging), which is the constraint @supabase/postgrest-js uses
 * to decide whether a schema is "valid" — so using interfaces here causes
 * `from(...)` to infer `never` for the row type.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfilesRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "prime" | "enterprise";
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  max_resumes: number;
  billing_country: string | null;
  referral_code: string | null;
  referred_by: string | null;
  marketing_emails_enabled: boolean;
  unsubscribe_token: string;
  locale: "ar" | "en";
  is_disabled: boolean;
  disabled_reason: string | null;
  disabled_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type ResumesRow = {
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
  custom_sections: Json;
  created_at: string;
  updated_at: string;
};

type PersonalInfoRow = {
  id: string;
  resume_id: string;
  full_name: string | null;
  job_title: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  phone_country_code: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  marital_status: "single" | "married" | "divorced" | "widowed" | null;
  health_status: "healthy" | "has_condition" | "hidden" | null;
  military_service: "yes" | "no" | "hidden" | null;
  avatar_path: string | null;
  ar: Json;
  en: Json;
};

type SectionItemBase = {
  id: string;
  resume_id: string;
  is_visible: boolean;
  sort_order: number;
};

type EducationRow = SectionItemBase & {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  ar: Json;
  en: Json;
};

type ExperienceRow = SectionItemBase & {
  company: string | null;
  job_title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  ar: Json;
  en: Json;
};

type SkillsRow = SectionItemBase & {
  name: string;
  level: "beginner" | "intermediate" | "good" | "advanced" | "expert" | null;
};

type LanguagesRow = SectionItemBase & {
  language_name: string;
  fluency: "beginner" | "limited" | "professional" | "full" | "native" | null;
  is_sign_language: boolean;
};

type CoursesRow = SectionItemBase & {
  name: string | null;
  institution: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  ar: Json;
  en: Json;
};

type ProjectsRow = SectionItemBase & {
  name: string | null;
  url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  ar: Json;
  en: Json;
};

type ReferencesRow = SectionItemBase & {
  name: string | null;
  email: string | null;
  phone: string | null;
  phone_country_code: string | null;
  description: string | null;
  ar: Json;
  en: Json;
};

type SocialLinksRow = SectionItemBase & {
  url: string | null;
  link_type: string | null;
};

type HobbiesRow = SectionItemBase & {
  name: string | null;
  ar: Json;
  en: Json;
};

type AddressRow = {
  id: string;
  resume_id: string;
  national_address: string | null;
  ar: Json;
  en: Json;
};

type TemplatesRow = {
  id: string;
  name: string;
  name_ar: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  category: string;
  tags: string[];
  sort_order: number;
  description_ar: string | null;
  description_en: string | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionsRow = {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: "stripe" | "paddle";
  trial_end: string | null;
  canceled_at: string | null;
  currency: string | null;
  last_event_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupportTicketsRow = {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  attachment_url: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_notes: string | null;
  assigned_to: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  last_admin_reply_at: string | null;
  created_at: string;
  updated_at: string;
};

type AiUsageRow = {
  id: string;
  user_id: string | null;
  resume_id: string | null;
  action_type: string | null;
  tokens_used: number | null;
  cost_estimate_usd: number | null;
  is_error: boolean;
  error_message: string | null;
  created_at: string;
};

type ResumeViewsRow = {
  id: string;
  resume_id: string;
  viewer_ip: string | null;
  referrer: string | null;
  user_agent: string | null;
  viewed_at: string;
};

type EmailLogRow = {
  id: string;
  user_id: string | null;
  to_email: string;
  template: string;
  provider_message_id: string | null;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string | null;
  metadata: Json;
  created_at: string;
};

type AdminUsersRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "support_agent" | "template_manager";
  totp_secret: string | null;
  totp_verified_at: string | null;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

type AdminSessionsRow = {
  id: string;
  admin_id: string;
  token_hash: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type AdminAuditLogRow = {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Json;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type AdminIpAllowlistRow = {
  id: string;
  cidr: string;
  label: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

type AdminNotesRow = {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  target_type: "user" | "resume" | "ticket";
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type AppSettingsRow = {
  key: string;
  value: Json;
  updated_by: string | null;
  updated_at: string;
};

type FeaturedResumesRow = {
  resume_id: string;
  sort_order: number;
  featured_by: string | null;
  featured_at: string;
};

type AnnouncementsRow = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  severity: "info" | "warning" | "critical";
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type AiRateLimitOverridesRow = {
  user_id: string;
  daily_limit: number;
  reason: string | null;
  admin_id: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: Partial<ProfilesRow> & { id: string; email: string };
        Update: Partial<ProfilesRow>;
        Relationships: [];
      };
      resumes: {
        Row: ResumesRow;
        Insert: Partial<ResumesRow> & { user_id: string; slug: string };
        Update: Partial<ResumesRow>;
        Relationships: [];
      };
      personal_info: {
        Row: PersonalInfoRow;
        Insert: Partial<PersonalInfoRow> & { resume_id: string };
        Update: Partial<PersonalInfoRow>;
        Relationships: [];
      };
      education: {
        Row: EducationRow;
        Insert: Partial<EducationRow> & { resume_id: string };
        Update: Partial<EducationRow>;
        Relationships: [];
      };
      experience: {
        Row: ExperienceRow;
        Insert: Partial<ExperienceRow> & { resume_id: string };
        Update: Partial<ExperienceRow>;
        Relationships: [];
      };
      skills: {
        Row: SkillsRow;
        Insert: Partial<SkillsRow> & { resume_id: string; name: string };
        Update: Partial<SkillsRow>;
        Relationships: [];
      };
      languages: {
        Row: LanguagesRow;
        Insert: Partial<LanguagesRow> & { resume_id: string; language_name: string };
        Update: Partial<LanguagesRow>;
        Relationships: [];
      };
      courses: {
        Row: CoursesRow;
        Insert: Partial<CoursesRow> & { resume_id: string };
        Update: Partial<CoursesRow>;
        Relationships: [];
      };
      projects: {
        Row: ProjectsRow;
        Insert: Partial<ProjectsRow> & { resume_id: string };
        Update: Partial<ProjectsRow>;
        Relationships: [];
      };
      references: {
        Row: ReferencesRow;
        Insert: Partial<ReferencesRow> & { resume_id: string };
        Update: Partial<ReferencesRow>;
        Relationships: [];
      };
      social_links: {
        Row: SocialLinksRow;
        Insert: Partial<SocialLinksRow> & { resume_id: string };
        Update: Partial<SocialLinksRow>;
        Relationships: [];
      };
      hobbies: {
        Row: HobbiesRow;
        Insert: Partial<HobbiesRow> & { resume_id: string };
        Update: Partial<HobbiesRow>;
        Relationships: [];
      };
      address: {
        Row: AddressRow;
        Insert: Partial<AddressRow> & { resume_id: string };
        Update: Partial<AddressRow>;
        Relationships: [];
      };
      templates: {
        Row: TemplatesRow;
        Insert: Partial<TemplatesRow> & { id: string; name: string };
        Update: Partial<TemplatesRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionsRow;
        Insert: Partial<SubscriptionsRow> & { user_id: string };
        Update: Partial<SubscriptionsRow>;
        Relationships: [];
      };
      support_tickets: {
        Row: SupportTicketsRow;
        Insert: Partial<SupportTicketsRow> & { subject: string; message: string };
        Update: Partial<SupportTicketsRow>;
        Relationships: [];
      };
      ai_usage: {
        Row: AiUsageRow;
        Insert: Partial<AiUsageRow>;
        Update: Partial<AiUsageRow>;
        Relationships: [];
      };
      resume_views: {
        Row: ResumeViewsRow;
        Insert: Partial<ResumeViewsRow> & { resume_id: string };
        Update: Partial<ResumeViewsRow>;
        Relationships: [];
      };
      email_log: {
        Row: EmailLogRow;
        Insert: Partial<EmailLogRow> & { to_email: string; template: string };
        Update: Partial<EmailLogRow>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUsersRow;
        Insert: Partial<AdminUsersRow> & { email: string; password_hash: string };
        Update: Partial<AdminUsersRow>;
        Relationships: [];
      };
      admin_sessions: {
        Row: AdminSessionsRow;
        Insert: Partial<AdminSessionsRow> & { admin_id: string; token_hash: string; expires_at: string };
        Update: Partial<AdminSessionsRow>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: Partial<AdminAuditLogRow> & { action: string };
        Update: Partial<AdminAuditLogRow>;
        Relationships: [];
      };
      admin_ip_allowlist: {
        Row: AdminIpAllowlistRow;
        Insert: Partial<AdminIpAllowlistRow> & { cidr: string };
        Update: Partial<AdminIpAllowlistRow>;
        Relationships: [];
      };
      admin_notes: {
        Row: AdminNotesRow;
        Insert: Partial<AdminNotesRow> & { target_type: "user" | "resume" | "ticket"; target_id: string; body: string };
        Update: Partial<AdminNotesRow>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow> & { key: string; value: Json };
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      featured_resumes: {
        Row: FeaturedResumesRow;
        Insert: Partial<FeaturedResumesRow> & { resume_id: string };
        Update: Partial<FeaturedResumesRow>;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementsRow;
        Insert: Partial<AnnouncementsRow>;
        Update: Partial<AnnouncementsRow>;
        Relationships: [];
      };
      ai_rate_limit_overrides: {
        Row: AiRateLimitOverridesRow;
        Insert: Partial<AiRateLimitOverridesRow> & { user_id: string; daily_limit: number };
        Update: Partial<AiRateLimitOverridesRow>;
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
      log_admin_action: {
        Args: {
          p_admin_id: string | null;
          p_admin_email: string | null;
          p_action: string;
          p_target_type: string | null;
          p_target_id: string | null;
          p_metadata: Json;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: string;
      };
      get_public_setting: {
        Args: { p_key: string };
        Returns: Json;
      };
      bootstrap_first_admin: {
        Args: { p_email: string; p_password_hash: string; p_totp_secret: string };
        Returns: string | null;
      };
      admin_stats_plan_distribution: {
        Args: Record<string, never>;
        Returns: { plan: string; count: number }[];
      };
      admin_stats_template_usage: {
        Args: { p_limit: number | null };
        Returns: { template_id: string; count: number }[];
      };
      admin_stats_signups_daily: {
        Args: { p_from: string; p_to: string };
        Returns: { day: string; count: number }[];
      };
      admin_stats_ai_usage_daily: {
        Args: { p_from: string; p_to: string };
        Returns: { day: string; count: number }[];
      };
      admin_stats_subscriptions_monthly: {
        Args: { p_from: string; p_to: string };
        Returns: { month: string; count: number }[];
      };
      admin_distinct_audit_actions: {
        Args: Record<string, never>;
        Returns: { action: string }[];
      };
      admin_user_resume_counts: {
        Args: { p_user_ids: string[] };
        Returns: { user_id: string; count: number }[];
      };
      admin_user_ai_counts: {
        Args: { p_user_ids: string[]; p_from: string; p_to: string };
        Returns: { user_id: string; count: number }[];
      };
      admin_distinct_user_countries: {
        Args: Record<string, never>;
        Returns: { country: string }[];
      };
      admin_user_ai_breakdown: {
        Args: { p_user_id: string; p_from: string; p_to: string };
        Returns: { action_type: string; count: number; total_tokens: number }[];
      };
      admin_set_user_disabled: {
        Args: {
          p_user_id: string;
          p_disabled: boolean;
          p_reason: string;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: boolean;
      };
      admin_set_user_plan: {
        Args: {
          p_user_id: string;
          p_plan: string;
          p_expires_at: string | null;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_distinct_resume_templates: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; name_ar: string | null }[];
      };
      admin_set_resume_template: {
        Args: {
          p_resume_id: string;
          p_template_id: string;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_set_resume_featured: {
        Args: {
          p_resume_id: string;
          p_featured: boolean;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_delete_resume: {
        Args: {
          p_resume_id: string;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_set_template_pricing: {
        Args: {
          p_template_id: string;
          p_is_premium: boolean;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_set_template_active: {
        Args: {
          p_template_id: string;
          p_is_active: boolean;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_update_template_metadata: {
        Args: {
          p_template_id: string;
          p_name: string | null;
          p_name_ar: string | null;
          p_description_en: string | null;
          p_description_ar: string | null;
          p_category: string | null;
          p_tags: string[] | null;
          p_thumbnail_url: string | null;
          p_preview_url: string | null;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_reorder_templates: {
        Args: {
          p_template_ids: string[];
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
      admin_create_template: {
        Args: {
          p_id: string;
          p_name: string;
          p_name_ar: string | null;
          p_description_en: string | null;
          p_description_ar: string | null;
          p_category: string | null;
          p_is_premium: boolean | null;
          p_tags: string[] | null;
          p_thumbnail_url: string | null;
          p_preview_url: string | null;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: string;
      };
      admin_delete_template: {
        Args: {
          p_template_id: string;
          p_admin_id: string;
          p_admin_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
