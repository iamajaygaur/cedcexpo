/**
 * Database types aligned with Phase 3 Supabase schema.
 * Keep in sync with supabase/migrations/*.sql
 */

export type UserRole = "admin" | "judge";
export type EventStatus = "draft" | "active" | "completed" | "archived";
export type EvaluationStatus = "draft" | "submitted";
export type ReportType =
  | "master"
  | "rankings"
  | "criteria"
  | "abet"
  | "judges";
export type ReportJobStatus = "generating" | "ready" | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  name: string;
  semester: string;
  event_date: string | null;
  location: string;
  status: EventStatus;
  support_email: string | null;
  description: string;
  start_time: string;
  end_time: string;
  departments: string[];
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  event_id: string;
  team_number: string;
  team_name: string;
  project_title: string;
  project_description: string;
  category: string;
  advisor: string;
  booth_location: string;
  qr_identifier: string;
  created_at: string;
  updated_at: string;
};

export type ReportJob = {
  id: string;
  event_id: string;
  report_type: ReportType;
  status: ReportJobStatus;
  generated_by: string;
  error_message: string | null;
  filter_category: string | null;
  filter_group_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  student_name: string;
  student_email: string | null;
  student_id: string;
  role: string;
  created_at: string;
};

export type Judge = {
  id: string;
  profile_id: string;
  organization: string;
  title: string;
  department: string;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JudgeGroup = {
  id: string;
  event_id: string;
  name: string;
  color_key: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type JudgeGroupMember = {
  id: string;
  event_id: string;
  group_id: string;
  judge_id: string;
  is_lead: boolean;
  created_at: string;
};

export type JudgingAssignment = {
  id: string;
  event_id: string;
  group_id: string;
  team_id: string;
  created_at: string;
};

export type EvaluationCriterion = {
  id: string;
  event_id: string;
  name: string;
  description: string;
  category: string;
  max_score: number;
  weight: number;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CriterionAbetOutcome = {
  id: string;
  criterion_id: string;
  outcome_code: string;
  outcome_label: string;
};

export type Evaluation = {
  id: string;
  event_id: string;
  judge_id: string;
  team_id: string;
  assignment_id: string;
  status: EvaluationStatus;
  comments: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EvaluationScore = {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

/** Supabase `Database` shape for typed clients (subset used by the app). */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: {
          id?: string;
          name: string;
          semester?: string;
          event_date?: string | null;
          location?: string;
          status?: EventStatus;
          support_email?: string | null;
          description?: string;
          start_time?: string;
          end_time?: string;
          departments?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Event, "id">>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: {
          id?: string;
          event_id: string;
          team_number: string;
          team_name?: string;
          project_title: string;
          project_description?: string;
          category?: string;
          advisor?: string;
          booth_location?: string;
          qr_identifier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Team, "id">>;
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: TeamMember;
        Insert: {
          id?: string;
          team_id: string;
          student_name: string;
          student_email?: string | null;
          student_id?: string;
          role?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TeamMember, "id">>;
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      judges: {
        Row: Judge;
        Insert: {
          id?: string;
          profile_id: string;
          organization?: string;
          title?: string;
          department?: string;
          notes?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Judge, "id">>;
        Relationships: [
          {
            foreignKeyName: "judges_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      judge_groups: {
        Row: JudgeGroup;
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          color_key: string;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<JudgeGroup, "id">>;
        Relationships: [
          {
            foreignKeyName: "judge_groups_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      judge_group_members: {
        Row: JudgeGroupMember;
        Insert: {
          id?: string;
          event_id: string;
          group_id: string;
          judge_id: string;
          is_lead?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<JudgeGroupMember, "id">>;
        Relationships: [
          {
            foreignKeyName: "judge_group_members_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judge_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "judge_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judge_group_members_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "judges";
            referencedColumns: ["id"];
          },
        ];
      };
      judging_assignments: {
        Row: JudgingAssignment;
        Insert: {
          id?: string;
          event_id: string;
          group_id: string;
          team_id: string;
          created_at?: string;
        };
        Update: Partial<Omit<JudgingAssignment, "id">>;
        Relationships: [
          {
            foreignKeyName: "judging_assignments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judging_assignments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "judge_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judging_assignments_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_criteria: {
        Row: EvaluationCriterion;
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string;
          category?: string;
          max_score: number;
          weight?: number;
          display_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EvaluationCriterion, "id">>;
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      criterion_abet_outcomes: {
        Row: CriterionAbetOutcome;
        Insert: {
          id?: string;
          criterion_id: string;
          outcome_code: string;
          outcome_label?: string;
        };
        Update: Partial<Omit<CriterionAbetOutcome, "id">>;
        Relationships: [
          {
            foreignKeyName: "criterion_abet_outcomes_criterion_id_fkey";
            columns: ["criterion_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_criteria";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluations: {
        Row: Evaluation;
        Insert: {
          id?: string;
          event_id: string;
          judge_id: string;
          team_id: string;
          assignment_id: string;
          status?: EvaluationStatus;
          comments?: string;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Evaluation, "id">>;
        Relationships: [
          {
            foreignKeyName: "evaluations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "judges";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_scores: {
        Row: EvaluationScore;
        Insert: {
          id?: string;
          evaluation_id: string;
          criterion_id: string;
          score: number;
          comment?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EvaluationScore, "id">>;
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey";
            columns: ["evaluation_id"];
            isOneToOne: false;
            referencedRelation: "evaluations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluation_scores_criterion_id_fkey";
            columns: ["criterion_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_criteria";
            referencedColumns: ["id"];
          },
        ];
      };
      report_jobs: {
        Row: ReportJob;
        Insert: {
          id?: string;
          event_id: string;
          report_type: ReportType;
          status?: ReportJobStatus;
          generated_by: string;
          error_message?: string | null;
          filter_category?: string | null;
          filter_group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ReportJob, "id">>;
        Relationships: [
          {
            foreignKeyName: "report_jobs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_jobs_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_judge_id: { Args: Record<string, never>; Returns: string | null };
      is_active_judge: { Args: Record<string, never>; Returns: boolean };
      judge_assigned_to_team: {
        Args: { p_team_id: string };
        Returns: boolean;
      };
      judge_owns_evaluation: {
        Args: { p_evaluation_id: string };
        Returns: boolean;
      };
      judge_belongs_to_group: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      lookup_team_by_qr: {
        Args: { p_qr: string };
        Returns: {
          team_id: string;
          event_id: string;
          team_number: string;
          project_title: string;
          booth_location: string;
          event_name: string;
          event_status: EventStatus;
          assigned_group_id: string | null;
          assigned_group_name: string | null;
          assigned_group_color_key: string | null;
        }[];
      };
      resolve_login_email: {
        Args: { p_username: string };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      evaluation_status: EvaluationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

/** Stable seed IDs from supabase/seed.sql (for local/dev tooling). */
export const SEED_IDS = {
  eventSpring2027: "11111111-1111-1111-1111-111111111111",
  groups: {
    red: "22222222-2222-2222-2222-222222222201",
    blue: "22222222-2222-2222-2222-222222222202",
    green: "22222222-2222-2222-2222-222222222203",
    yellow: "22222222-2222-2222-2222-222222222204",
    orange: "22222222-2222-2222-2222-222222222205",
  },
} as const;
