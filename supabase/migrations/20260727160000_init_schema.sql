-- Phase 3: CEDC Senior Design Expo — core schema
-- Normalized tables, constraints, indexes, updated_at triggers.
-- RLS policies are in the companion migration.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'judge');
CREATE TYPE public.event_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE public.evaluation_status AS ENUM ('draft', 'submitted');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'judge',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_email_unique UNIQUE (email)
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup (role defaults to judge; promote admins manually)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'judge')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT '',
  event_date DATE,
  location TEXT NOT NULL DEFAULT '',
  status public.event_status NOT NULL DEFAULT 'draft',
  support_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX events_status_idx ON public.events (status);

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  team_number TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  advisor TEXT NOT NULL DEFAULT '',
  booth_location TEXT NOT NULL DEFAULT '',
  qr_identifier TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT teams_event_team_number_unique UNIQUE (event_id, team_number),
  CONSTRAINT teams_qr_identifier_unique UNIQUE (qr_identifier)
);

CREATE INDEX teams_event_id_idx ON public.teams (event_id);
CREATE INDEX teams_qr_identifier_idx ON public.teams (qr_identifier);

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX team_members_team_id_idx ON public.team_members (team_id);

-- ---------------------------------------------------------------------------
-- judges
-- ---------------------------------------------------------------------------
CREATE TABLE public.judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  organization TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT judges_profile_id_unique UNIQUE (profile_id)
);

CREATE INDEX judges_active_idx ON public.judges (active);

CREATE TRIGGER judges_set_updated_at
  BEFORE UPDATE ON public.judges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- judge_groups (color groups per event)
-- ---------------------------------------------------------------------------
CREATE TABLE public.judge_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT judge_groups_event_name_unique UNIQUE (event_id, name),
  CONSTRAINT judge_groups_event_color_key_unique UNIQUE (event_id, color_key),
  CONSTRAINT judge_groups_color_key_format CHECK (
    color_key ~ '^[a-z][a-z0-9_-]*$'
  )
);

CREATE INDEX judge_groups_event_id_idx ON public.judge_groups (event_id);

CREATE TRIGGER judge_groups_set_updated_at
  BEFORE UPDATE ON public.judge_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- judge_group_members (one group per judge per event)
-- ---------------------------------------------------------------------------
CREATE TABLE public.judge_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.judge_groups (id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.judges (id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT judge_group_members_group_judge_unique UNIQUE (group_id, judge_id),
  CONSTRAINT judge_group_members_event_judge_unique UNIQUE (event_id, judge_id)
);

CREATE INDEX judge_group_members_judge_event_idx
  ON public.judge_group_members (judge_id, event_id);
CREATE INDEX judge_group_members_group_id_idx
  ON public.judge_group_members (group_id);

-- Keep event_id aligned with the group's event
CREATE OR REPLACE FUNCTION public.enforce_group_member_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_event UUID;
BEGIN
  SELECT event_id INTO group_event FROM public.judge_groups WHERE id = NEW.group_id;
  IF group_event IS NULL THEN
    RAISE EXCEPTION 'judge group % not found', NEW.group_id;
  END IF;
  IF NEW.event_id IS DISTINCT FROM group_event THEN
    RAISE EXCEPTION 'judge_group_members.event_id must match judge_groups.event_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER judge_group_members_enforce_event
  BEFORE INSERT OR UPDATE ON public.judge_group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_event();

-- ---------------------------------------------------------------------------
-- judging_assignments (color group → team)
-- ---------------------------------------------------------------------------
CREATE TABLE public.judging_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.judge_groups (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT judging_assignments_group_team_unique UNIQUE (group_id, team_id)
  -- Note: a team may have up to TWO group rows (dual evaluation).
  -- Max-2 is enforced by trigger enforce_max_two_group_assignments.
);

CREATE INDEX judging_assignments_group_id_idx ON public.judging_assignments (group_id);
CREATE INDEX judging_assignments_event_id_idx ON public.judging_assignments (event_id);
CREATE INDEX judging_assignments_team_id_idx ON public.judging_assignments (team_id);

CREATE OR REPLACE FUNCTION public.enforce_assignment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_event UUID;
  team_event UUID;
BEGIN
  SELECT event_id INTO group_event FROM public.judge_groups WHERE id = NEW.group_id;
  SELECT event_id INTO team_event FROM public.teams WHERE id = NEW.team_id;
  IF group_event IS NULL OR team_event IS NULL THEN
    RAISE EXCEPTION 'group or team not found for assignment';
  END IF;
  IF group_event IS DISTINCT FROM team_event OR NEW.event_id IS DISTINCT FROM group_event THEN
    RAISE EXCEPTION 'judging_assignments event_id/group/team event mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER judging_assignments_enforce_event
  BEFORE INSERT OR UPDATE ON public.judging_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_event();

CREATE OR REPLACE FUNCTION public.enforce_max_two_group_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*)::integer INTO assignment_count
  FROM public.judging_assignments
  WHERE event_id = NEW.event_id
    AND team_id = NEW.team_id
    AND id IS DISTINCT FROM NEW.id;

  IF assignment_count >= 2 THEN
    RAISE EXCEPTION 'A team can be assigned to at most two color groups';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER judging_assignments_max_two
  BEFORE INSERT OR UPDATE OF event_id, team_id ON public.judging_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_two_group_assignments();

-- ---------------------------------------------------------------------------
-- evaluation_criteria
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  max_score NUMERIC(6, 2) NOT NULL CHECK (max_score > 0),
  weight NUMERIC(8, 4) NOT NULL DEFAULT 1 CHECK (weight > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX evaluation_criteria_event_id_idx ON public.evaluation_criteria (event_id);
CREATE INDEX evaluation_criteria_event_active_idx
  ON public.evaluation_criteria (event_id, active);

CREATE TRIGGER evaluation_criteria_set_updated_at
  BEFORE UPDATE ON public.evaluation_criteria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- criterion_abet_outcomes
-- ---------------------------------------------------------------------------
CREATE TABLE public.criterion_abet_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id UUID NOT NULL REFERENCES public.evaluation_criteria (id) ON DELETE CASCADE,
  outcome_code TEXT NOT NULL,
  outcome_label TEXT NOT NULL DEFAULT '',
  CONSTRAINT criterion_abet_outcomes_unique UNIQUE (criterion_id, outcome_code)
);

CREATE INDEX criterion_abet_outcomes_criterion_id_idx
  ON public.criterion_abet_outcomes (criterion_id);

-- ---------------------------------------------------------------------------
-- evaluations (one per judge/team/event)
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.judges (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.judging_assignments (id) ON DELETE RESTRICT,
  status public.evaluation_status NOT NULL DEFAULT 'draft',
  comments TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT evaluations_event_judge_team_unique UNIQUE (event_id, judge_id, team_id),
  CONSTRAINT evaluations_submitted_requires_timestamp CHECK (
    (status = 'draft' AND submitted_at IS NULL)
    OR (status = 'submitted' AND submitted_at IS NOT NULL)
  )
);

CREATE INDEX evaluations_event_status_idx ON public.evaluations (event_id, status);
CREATE INDEX evaluations_judge_id_idx ON public.evaluations (judge_id);
CREATE INDEX evaluations_team_id_idx ON public.evaluations (team_id);
CREATE INDEX evaluations_assignment_id_idx ON public.evaluations (assignment_id);

CREATE TRIGGER evaluations_set_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_evaluation_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_event UUID;
  assignment_team UUID;
  assignment_group UUID;
  member_exists BOOLEAN;
BEGIN
  SELECT event_id, team_id, group_id
    INTO assignment_event, assignment_team, assignment_group
  FROM public.judging_assignments
  WHERE id = NEW.assignment_id;

  IF assignment_event IS NULL THEN
    RAISE EXCEPTION 'assignment % not found', NEW.assignment_id;
  END IF;

  IF NEW.event_id IS DISTINCT FROM assignment_event
     OR NEW.team_id IS DISTINCT FROM assignment_team THEN
    RAISE EXCEPTION 'evaluation event/team must match assignment';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.judge_group_members m
    WHERE m.group_id = assignment_group
      AND m.judge_id = NEW.judge_id
      AND m.event_id = NEW.event_id
  ) INTO member_exists;

  IF NOT member_exists THEN
    RAISE EXCEPTION 'judge is not a member of the assigned group';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'submitted'
     AND NEW.status = 'draft' THEN
    -- Reopen only allowed for admins (checked in RLS); keep trigger neutral.
    NULL;
  END IF;

  IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at = timezone('utc', now());
  END IF;

  IF NEW.status = 'draft' THEN
    NEW.submitted_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER evaluations_enforce_integrity
  BEFORE INSERT OR UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_evaluation_integrity();

-- ---------------------------------------------------------------------------
-- evaluation_scores
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations (id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.evaluation_criteria (id) ON DELETE RESTRICT,
  score NUMERIC(6, 2) NOT NULL CHECK (score >= 0),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT evaluation_scores_eval_criterion_unique UNIQUE (evaluation_id, criterion_id)
);

CREATE INDEX evaluation_scores_evaluation_id_idx ON public.evaluation_scores (evaluation_id);
CREATE INDEX evaluation_scores_criterion_id_idx ON public.evaluation_scores (criterion_id);

CREATE TRIGGER evaluation_scores_set_updated_at
  BEFORE UPDATE ON public.evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_score_bounds()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_allowed NUMERIC(6, 2);
  eval_event UUID;
  criterion_event UUID;
  eval_status public.evaluation_status;
BEGIN
  SELECT e.event_id, e.status
    INTO eval_event, eval_status
  FROM public.evaluations e
  WHERE e.id = NEW.evaluation_id;

  SELECT c.max_score, c.event_id
    INTO max_allowed, criterion_event
  FROM public.evaluation_criteria c
  WHERE c.id = NEW.criterion_id;

  IF max_allowed IS NULL THEN
    RAISE EXCEPTION 'criterion % not found', NEW.criterion_id;
  END IF;

  IF eval_event IS DISTINCT FROM criterion_event THEN
    RAISE EXCEPTION 'criterion must belong to the same event as the evaluation';
  END IF;

  IF NEW.score > max_allowed THEN
    RAISE EXCEPTION 'score % exceeds max_score %', NEW.score, max_allowed;
  END IF;

  IF eval_status = 'submitted' THEN
    RAISE EXCEPTION 'cannot modify scores on a submitted evaluation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER evaluation_scores_enforce_bounds
  BEFORE INSERT OR UPDATE ON public.evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_score_bounds();

COMMENT ON TABLE public.judge_groups IS 'Color-coded judging groups; color_key maps to app groupColorTokens';
COMMENT ON COLUMN public.teams.qr_identifier IS 'Opaque QR locator — not an authorization capability';

-- Privileges for Supabase roles (RLS still applies to authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
