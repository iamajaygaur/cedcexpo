-- Paste into Supabase SQL Editor if migrations aren't applied yet.
-- Report generation history for admin Reports & Analytics.

CREATE TABLE IF NOT EXISTS public.report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  report_type text NOT NULL
    CHECK (
      report_type IN (
        'master',
        'rankings',
        'criteria',
        'abet',
        'judges'
      )
    ),
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('generating', 'ready', 'failed')),
  generated_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  error_message text,
  filter_category text,
  filter_group_id uuid REFERENCES public.judge_groups (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_jobs_event_created_idx
  ON public.report_jobs (event_id, created_at DESC);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_jobs_admin_all ON public.report_jobs;
CREATE POLICY report_jobs_admin_all
  ON public.report_jobs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_jobs TO authenticated;
