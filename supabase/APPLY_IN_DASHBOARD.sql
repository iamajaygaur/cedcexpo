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
  -- Dual evaluation: up to two rows per team (enforce_max_two_group_assignments).
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
-- Phase 3: RLS helpers + policies
-- Defense in depth: application authz (Phase 4+) + these policies.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_judge_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id
  FROM public.judges j
  WHERE j.profile_id = auth.uid()
    AND j.active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_judge()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_judge_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.judge_assigned_to_team(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.judging_assignments a
    INNER JOIN public.judge_group_members m
      ON m.group_id = a.group_id
     AND m.event_id = a.event_id
    WHERE a.team_id = p_team_id
      AND m.judge_id = public.current_judge_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.judge_owns_evaluation(p_evaluation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = p_evaluation_id
      AND e.judge_id = public.current_judge_id()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_judge_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_judge() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.judge_assigned_to_team(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.judge_owns_evaluation(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_judge_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_judge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_assigned_to_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_owns_evaluation(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterion_abet_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (Supabase best practice)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.judges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.judge_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.judge_group_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.judging_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria FORCE ROW LEVEL SECURITY;
ALTER TABLE public.criterion_abet_outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Prevent judges from escalating their own role (admins may change roles)
-- Prevent judges from escalating their own role (admins may change roles).
-- auth.uid() IS NULL (SQL Editor / service_role) is allowed for first-admin bootstrap.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'only admins can change profile roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

CREATE POLICY profiles_insert_admin
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
CREATE POLICY events_select_authenticated
  ON public.events FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR status IN ('active', 'completed')
  );

CREATE POLICY events_write_admin
  ON public.events FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE POLICY teams_select_admin_or_assigned
  ON public.teams FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.judge_assigned_to_team(id)
  );

CREATE POLICY teams_write_admin
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY teams_update_admin
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY teams_delete_admin
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
CREATE POLICY team_members_select_admin_or_assigned
  ON public.team_members FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.judge_assigned_to_team(team_id)
  );

CREATE POLICY team_members_write_admin
  ON public.team_members FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- judges
-- ---------------------------------------------------------------------------
CREATE POLICY judges_select_admin_or_self
  ON public.judges FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR profile_id = auth.uid()
  );

CREATE POLICY judges_write_admin
  ON public.judges FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- judge_groups
-- ---------------------------------------------------------------------------
CREATE POLICY judge_groups_select_admin_or_member
  ON public.judge_groups FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.judge_group_members m
      WHERE m.group_id = judge_groups.id
        AND m.judge_id = public.current_judge_id()
    )
  );

CREATE POLICY judge_groups_write_admin
  ON public.judge_groups FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- judge_group_members
-- ---------------------------------------------------------------------------
CREATE POLICY judge_group_members_select_admin_or_self_group
  ON public.judge_group_members FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR judge_id = public.current_judge_id()
    OR EXISTS (
      SELECT 1
      FROM public.judge_group_members self
      WHERE self.group_id = judge_group_members.group_id
        AND self.judge_id = public.current_judge_id()
    )
  );

CREATE POLICY judge_group_members_write_admin
  ON public.judge_group_members FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- judging_assignments
-- ---------------------------------------------------------------------------
CREATE POLICY judging_assignments_select_admin_or_member
  ON public.judging_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.judge_group_members m
      WHERE m.group_id = judging_assignments.group_id
        AND m.judge_id = public.current_judge_id()
    )
  );

CREATE POLICY judging_assignments_write_admin
  ON public.judging_assignments FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- evaluation_criteria (+ ABET tags)
-- ---------------------------------------------------------------------------
CREATE POLICY evaluation_criteria_select_authenticated
  ON public.evaluation_criteria FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      active = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = evaluation_criteria.event_id
          AND e.status IN ('active', 'completed')
      )
    )
  );

CREATE POLICY evaluation_criteria_write_admin
  ON public.evaluation_criteria FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY criterion_abet_select_authenticated
  ON public.criterion_abet_outcomes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.evaluation_criteria c
      WHERE c.id = criterion_abet_outcomes.criterion_id
        AND c.active = TRUE
    )
  );

CREATE POLICY criterion_abet_write_admin
  ON public.criterion_abet_outcomes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- evaluations
-- Judges: own rows only; draft insert/update; submit draft→submitted;
-- cannot edit after submitted (admin can update for reopen later).
-- ---------------------------------------------------------------------------
CREATE POLICY evaluations_select_own_or_admin
  ON public.evaluations FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR judge_id = public.current_judge_id()
  );

CREATE POLICY evaluations_insert_own_assigned_draft
  ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_active_judge()
      AND judge_id = public.current_judge_id()
      AND status = 'draft'
      AND public.judge_assigned_to_team(team_id)
    )
  );

CREATE POLICY evaluations_update_own_draft_or_admin
  ON public.evaluations FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      judge_id = public.current_judge_id()
      AND status = 'draft'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      judge_id = public.current_judge_id()
      AND public.judge_assigned_to_team(team_id)
      AND status IN ('draft', 'submitted')
    )
  );

CREATE POLICY evaluations_delete_admin
  ON public.evaluations FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- evaluation_scores
-- ---------------------------------------------------------------------------
CREATE POLICY evaluation_scores_select_own_or_admin
  ON public.evaluation_scores FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.judge_owns_evaluation(evaluation_id)
  );

CREATE POLICY evaluation_scores_insert_own_draft
  ON public.evaluation_scores FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.judge_owns_evaluation(evaluation_id)
      AND EXISTS (
        SELECT 1
        FROM public.evaluations e
        WHERE e.id = evaluation_id
          AND e.status = 'draft'
          AND e.judge_id = public.current_judge_id()
      )
    )
  );

CREATE POLICY evaluation_scores_update_own_draft
  ON public.evaluation_scores FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.judge_owns_evaluation(evaluation_id)
      AND EXISTS (
        SELECT 1 FROM public.evaluations e
        WHERE e.id = evaluation_id AND e.status = 'draft'
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.judge_owns_evaluation(evaluation_id)
      AND EXISTS (
        SELECT 1 FROM public.evaluations e
        WHERE e.id = evaluation_id AND e.status = 'draft'
      )
    )
  );

CREATE POLICY evaluation_scores_delete_own_draft_or_admin
  ON public.evaluation_scores FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.judge_owns_evaluation(evaluation_id)
      AND EXISTS (
        SELECT 1 FROM public.evaluations e
        WHERE e.id = evaluation_id AND e.status = 'draft'
      )
    )
  );
-- Phase 4: harden auth profile creation — never trust client metadata for role.
-- New signups always get role = judge. Promote admins via SQL / admin tooling.

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
    'judge'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Phase 7: QR team lookup (locator only — never grants evaluation rights)
-- Authenticated users can resolve a QR to team + assigned group metadata.
-- Evaluation still requires judge_assigned_to_team via RLS + app checks.

CREATE OR REPLACE FUNCTION public.lookup_team_by_qr(p_qr TEXT)
RETURNS TABLE (
  team_id UUID,
  event_id UUID,
  team_number TEXT,
  project_title TEXT,
  booth_location TEXT,
  event_name TEXT,
  event_status public.event_status,
  assigned_group_id UUID,
  assigned_group_name TEXT,
  assigned_group_color_key TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS team_id,
    t.event_id,
    t.team_number,
    t.project_title,
    t.booth_location,
    e.name AS event_name,
    e.status AS event_status,
    g.id AS assigned_group_id,
    g.name AS assigned_group_name,
    g.color_key AS assigned_group_color_key
  FROM public.teams t
  INNER JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.judging_assignments a
    ON a.team_id = t.id
   AND a.event_id = t.event_id
  LEFT JOIN public.judge_groups g ON g.id = a.group_id
  WHERE t.qr_identifier = p_qr
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_team_by_qr(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_by_qr(TEXT) TO authenticated;

-- Phase 8: enable Realtime for live judging monitor (scoped by event_id in app)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'evaluations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;
  END IF;
END $$;
-- Fix infinite recursion in judge_group_members RLS policies.
-- Policies must not SELECT the same table under RLS; use SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.judge_belongs_to_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.judge_group_members m
    WHERE m.group_id = p_group_id
      AND m.judge_id = public.current_judge_id()
  );
$$;

REVOKE ALL ON FUNCTION public.judge_belongs_to_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.judge_belongs_to_group(UUID) TO authenticated;

-- Replace recursive policies
DROP POLICY IF EXISTS judge_group_members_select_admin_or_self_group
  ON public.judge_group_members;

CREATE POLICY judge_group_members_select_admin_or_self_group
  ON public.judge_group_members FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR judge_id = public.current_judge_id()
    OR public.judge_belongs_to_group(group_id)
  );

DROP POLICY IF EXISTS judge_groups_select_admin_or_member
  ON public.judge_groups;

CREATE POLICY judge_groups_select_admin_or_member
  ON public.judge_groups FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.judge_belongs_to_group(id)
  );

DROP POLICY IF EXISTS judging_assignments_select_admin_or_member
  ON public.judging_assignments;

CREATE POLICY judging_assignments_select_admin_or_member
  ON public.judging_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.judge_belongs_to_group(group_id)
  );
