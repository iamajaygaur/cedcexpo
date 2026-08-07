-- Update all existing data in Supabase database to match latest Department & Table changes

BEGIN;

-- 1. Update existing Booth locations to Table Number format in public.teams
UPDATE public.teams
SET booth_location = CASE
  WHEN booth_location ILIKE 'Booth A-04' THEN 'Table 4'
  WHEN booth_location ILIKE 'Booth B-08' THEN 'Table 8'
  WHEN booth_location ILIKE 'Booth C-11' THEN 'Table 11'
  WHEN booth_location ILIKE 'Booth D-15' THEN 'Table 15'
  WHEN booth_location ILIKE 'Booth E-22' THEN 'Table 22'
  WHEN booth_location ILIKE 'Booth%' THEN REGEXP_REPLACE(booth_location, '^Booth\s*', 'Table ', 'i')
  ELSE booth_location
END
WHERE booth_location IS NOT NULL AND booth_location != '';

-- 2. Update existing Team department categories ('CE' or 'CEM' -> 'CE/CEM')
UPDATE public.teams
SET category = 'CE/CEM'
WHERE category IN ('CE', 'CEM', 'Civil Engineering');

-- 3. Update existing Event departments array ('CE' / 'CEM' -> 'CE/CEM' and add 'CY' if missing)
UPDATE public.events
SET departments = ARRAY(
  SELECT DISTINCT
    CASE
      WHEN elem IN ('CE', 'CEM') THEN 'CE/CEM'
      ELSE elem
    END
  FROM unnest(departments) AS elem
);

-- 4. Add 'CY' to active/existing events' participating department lists if not present
UPDATE public.events
SET departments = array_append(departments, 'CY')
WHERE NOT ('CY' = ANY(departments));

COMMIT;
