-- Run in Supabase SQL Editor if migration not applied via CLI
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS student_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Member';
