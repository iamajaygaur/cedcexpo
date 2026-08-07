-- Allow first-admin bootstrap: service role / SQL editor have auth.uid() = NULL.
-- Authenticated clients still cannot escalate their own role.

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- SQL Editor / service_role (no JWT) may promote the first admin.
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'only admins can change profile roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Promote the CEDC admin mailbox (safe to re-run).
-- Login no longer auto-promotes this email — use this SQL (or Dashboard) instead.
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = lower('engineering@ucdenver.edu');
