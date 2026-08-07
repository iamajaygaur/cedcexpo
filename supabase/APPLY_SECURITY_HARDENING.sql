-- Paste in Supabase Dashboard → SQL Editor if you are not using `supabase db push`.
-- Mirrors: supabase/migrations/20260731230000_security_hardening.sql

-- 1) profiles INSERT: self-insert only as judge
DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;

CREATE POLICY profiles_insert_admin
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (id = auth.uid() AND role = 'judge'::public.user_role)
  );

-- 2) Targeted username → email lookup
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_count integer;
  v_email text;
BEGIN
  v_slug := lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-z0-9]', '', 'g'));
  IF length(v_slug) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer, min(p.email)
  INTO v_count, v_email
  FROM public.profiles p
  WHERE p.email IS NOT NULL
    AND (
      lower(p.email) = v_slug || '@cedc-expo.local'
      OR regexp_replace(lower(split_part(p.email, '@', 1)), '[^a-z0-9]', '', 'g') = v_slug
      OR regexp_replace(lower(coalesce(p.full_name, '')), '[^a-z0-9]', '', 'g') = v_slug
    );

  IF v_count = 1 THEN
    RETURN v_email;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO service_role;

-- 3) Remove blanket anon SELECT
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT ON TABLES FROM anon;

-- 4) FORCE RLS on report_jobs
ALTER TABLE IF EXISTS public.report_jobs FORCE ROW LEVEL SECURITY;
