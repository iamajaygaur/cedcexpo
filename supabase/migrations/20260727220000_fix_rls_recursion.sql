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
