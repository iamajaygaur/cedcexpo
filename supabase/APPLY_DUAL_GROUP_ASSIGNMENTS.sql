-- Apply in Supabase SQL Editor if migrations are not auto-run.
-- Dual color-group assignments: each team can have up to 2 groups.

ALTER TABLE public.judging_assignments
  DROP CONSTRAINT IF EXISTS judging_assignments_event_team_unique;

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

DROP TRIGGER IF EXISTS judging_assignments_max_two ON public.judging_assignments;
CREATE TRIGGER judging_assignments_max_two
  BEFORE INSERT OR UPDATE OF event_id, team_id ON public.judging_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_two_group_assignments();

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
    ag.assigned_group_id,
    ag.assigned_group_name,
    ag.assigned_group_color_key
  FROM public.teams t
  INNER JOIN public.events e ON e.id = t.event_id
  LEFT JOIN LATERAL (
    SELECT
      (ARRAY_AGG(g.id ORDER BY g.display_order, g.name))[1] AS assigned_group_id,
      STRING_AGG(g.name, ' & ' ORDER BY g.display_order, g.name) AS assigned_group_name,
      (ARRAY_AGG(g.color_key ORDER BY g.display_order, g.name))[1] AS assigned_group_color_key
    FROM public.judging_assignments a
    INNER JOIN public.judge_groups g ON g.id = a.group_id
    WHERE a.team_id = t.id
      AND a.event_id = t.event_id
  ) ag ON TRUE
  WHERE t.qr_identifier = p_qr
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_team_by_qr(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_by_qr(TEXT) TO authenticated;
