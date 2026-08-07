-- Enable Realtime for admin dashboard + live monitor (RLS still applies).
-- Mirrors: 20260727210000_realtime_evaluations.sql + 20260731230200_realtime_dashboard_tables.sql

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'evaluations',
    'teams',
    'judge_group_members',
    'judging_assignments',
    'judges'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
