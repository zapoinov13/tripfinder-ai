-- Prevent authenticated users from escalating their own role/status/org via direct REST updates.

CREATE OR REPLACE FUNCTION public.protect_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id AND NOT private.is_platform_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'profile_role_change_forbidden';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'profile_status_change_forbidden';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'profile_organization_change_forbidden';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_self_update ON public.profiles;
CREATE TRIGGER protect_profile_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_self_update();
