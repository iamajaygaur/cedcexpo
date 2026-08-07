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
