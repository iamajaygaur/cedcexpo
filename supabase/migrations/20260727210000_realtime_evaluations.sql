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
