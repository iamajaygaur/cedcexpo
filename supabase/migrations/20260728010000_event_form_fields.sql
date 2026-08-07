-- Optional event fields for Create Expo Event UI
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS departments TEXT[] NOT NULL DEFAULT '{}';
