// Auto-generated types from Supabase schema
// Run: supabase gen types typescript --local > src/lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          credit_balance: number;
          created_at: string;
          updated_at: string;
          first_touch_source: string | null;
          first_touch_medium: string | null;
          first_touch_campaign: string | null;
          last_touch_source: string | null;
          last_touch_medium: string | null;
          last_touch_campaign: string | null;
          first_landing_page: string | null;
        };
        Insert: {
          id: string;
          email: string;
          credit_balance?: number;
          created_at?: string;
          updated_at?: string;
          first_touch_source?: string | null;
          first_touch_medium?: string | null;
          first_touch_campaign?: string | null;
          last_touch_source?: string | null;
          last_touch_medium?: string | null;
          last_touch_campaign?: string | null;
          first_landing_page?: string | null;
        };
        Update: {
          email?: string;
          credit_balance?: number;
          updated_at?: string;
          first_touch_source?: string | null;
          first_touch_medium?: string | null;
          first_touch_campaign?: string | null;
          last_touch_source?: string | null;
          last_touch_medium?: string | null;
          last_touch_campaign?: string | null;
          first_landing_page?: string | null;
        };
      };
      parsed_resumes: {
        Row: {
          id: string;
          user_id: string | null;
          raw_text: string;
          personal_info: Json;
          roles: Json;
          skills: Json;
          education: Json;
          background_type: Database["public"]["Enums"]["background_type"];
          narrative_summary: string;
          storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          raw_text: string;
          personal_info?: Json;
          roles?: Json;
          skills?: Json;
          education?: Json;
          background_type?: Database["public"]["Enums"]["background_type"];
          narrative_summary?: string;
          storage_path?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          raw_text?: string;
          personal_info?: Json;
          roles?: Json;
          skills?: Json;
          education?: Json;
          background_type?: Database["public"]["Enums"]["background_type"];
          narrative_summary?: string;
          storage_path?: string | null;
        };
      };
      company_profiles: {
        Row: {
          id: string;
          company_name: string;
          company_url: string | null;
          profile_data: Json;
          source: Database["public"]["Enums"]["company_source"];
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          company_url?: string | null;
          profile_data?: Json;
          source?: Database["public"]["Enums"]["company_source"];
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          company_name?: string;
          company_url?: string | null;
          profile_data?: Json;
          source?: Database["public"]["Enums"]["company_source"];
          expires_at?: string;
        };
      };
      prep_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          resume_id: string | null;
          company_id: string | null;
          job_description: string;
          target_role: string;
          role_type: Database["public"]["Enums"]["role_type"];
          stage: Database["public"]["Enums"]["interview_stage"];
          relevance_map: Json;
          session_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          resume_id?: string | null;
          company_id?: string | null;
          job_description: string;
          target_role: string;
          role_type?: Database["public"]["Enums"]["role_type"];
          stage: Database["public"]["Enums"]["interview_stage"];
          relevance_map?: Json;
          session_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          resume_id?: string | null;
          company_id?: string | null;
          job_description?: string;
          target_role?: string;
          role_type?: Database["public"]["Enums"]["role_type"];
          stage?: Database["public"]["Enums"]["interview_stage"];
          relevance_map?: Json;
          session_data?: Json | null;
          updated_at?: string;
        };
      };
      generated_answers: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          answer_type: Database["public"]["Enums"]["answer_type"];
          content: string;
          metadata: Json;
          rating: number | null;
          status: Database["public"]["Enums"]["processing_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          answer_type: Database["public"]["Enums"]["answer_type"];
          content?: string;
          metadata?: Json;
          rating?: number | null;
          status?: Database["public"]["Enums"]["processing_status"];
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: Json;
          rating?: number | null;
          status?: Database["public"]["Enums"]["processing_status"];
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      knowledge_documents: {
        Row: {
          id: string;
          title: string;
          content: string;
          source_type: Database["public"]["Enums"]["content_source_type"];
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          source_type?: Database["public"]["Enums"]["content_source_type"];
          tags?: string[];
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          source_type?: Database["public"]["Enums"]["content_source_type"];
          tags?: string[];
        };
      };
      company_seo_pages: {
        Row: {
          id: string;
          company_slug: string;
          role_slug: string;
          company_name: string;
          role_title: string;
          meta_title: string;
          meta_description: string;
          h1_title: string;
          company_overview: string;
          interview_process: Json | null;
          questions: Json;
          preparation_tips: string[] | null;
          company_values: string[] | null;
          salary_data: Json | null;
          faqs: Json | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_slug: string;
          role_slug: string;
          company_name: string;
          role_title: string;
          meta_title: string;
          meta_description: string;
          h1_title: string;
          company_overview: string;
          interview_process?: Json | null;
          questions: Json;
          preparation_tips?: string[] | null;
          company_values?: string[] | null;
          salary_data?: Json | null;
          faqs?: Json | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_slug?: string;
          role_slug?: string;
          company_name?: string;
          role_title?: string;
          meta_title?: string;
          meta_description?: string;
          h1_title?: string;
          company_overview?: string;
          interview_process?: Json | null;
          questions?: Json;
          preparation_tips?: string[] | null;
          company_values?: string[] | null;
          salary_data?: Json | null;
          faqs?: Json | null;
          is_published?: boolean;
          updated_at?: string;
        };
      };
      knowledge_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          chunk_index: number;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
        };
      };
    };
    Enums: {
      role_type: "sdr_bdr" | "account_executive" | "account_manager_csm" | "other_sales";
      interview_stage: "recruiter" | "hiring_manager" | "role_play" | "panel" | "take_home";
      background_type: "career_switcher" | "experienced_sales" | "new_grad" | "other";
      answer_type:
        | "tell_me_about_yourself"
        | "why_sales"
        | "why_this_company"
        | "behavioral_star"
        | "comp_expectations"
        | "role_play_script"
        | "objection_response"
        | "company_brief"
        | "cheat_sheet"
        | "questions_to_ask"
        | "coachability_coaching"
        | "career_switcher_bridge";
      company_source: "firecrawl" | "raw_fetch" | "manual";
      content_source_type: "knowledge_base" | "user_resume" | "company_research";
      processing_status: "pending" | "processing" | "completed" | "failed";
      transaction_type: "free_grant" | "purchase" | "spend" | "refund" | "admin_grant";
    };
    Functions: {
      spend_credit: {
        Args: { p_user_id: string; p_answer_id: string; p_description?: string };
        Returns: boolean;
      };
      add_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_transaction_type?: string;
          p_description?: string;
        };
        Returns: void;
      };
      search_knowledge: {
        Args: { query_embedding: number[]; match_threshold?: number; match_count?: number };
        Returns: Array<{
          id: string;
          document_id: string;
          content: string;
          similarity: number;
        }>;
      };
    };
  };
};
