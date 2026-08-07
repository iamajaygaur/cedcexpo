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
