
-- audit_logs: prevent actor spoofing
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- profiles: block self role / organization escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF private.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to change role, organization or status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING ((id = auth.uid()) OR private.is_platform_admin())
  WITH CHECK ((id = auth.uid()) OR private.is_platform_admin());

-- bookings: customers may not tamper with status/payment/price
CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF private.is_platform_admin() OR OLD.organization_id = private.my_org_id() THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'CANCELLED' THEN
    RAISE EXCEPTION 'Not allowed to change booking status';
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.operator_id IS DISTINCT FROM OLD.operator_id
     OR NEW.tour_offer_id IS DISTINCT FROM OLD.tour_offer_id
     OR NEW.external_booking_id IS DISTINCT FROM OLD.external_booking_id THEN
    RAISE EXCEPTION 'Not allowed to change booking payment or pricing fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_tampering ON public.bookings;
CREATE TRIGGER bookings_prevent_tampering
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_field_tampering();

DROP POLICY IF EXISTS bookings_update ON public.bookings;
CREATE POLICY bookings_update ON public.bookings FOR UPDATE TO authenticated
  USING (private.is_platform_admin() OR (organization_id = private.my_org_id()) OR (user_id = auth.uid()))
  WITH CHECK (private.is_platform_admin() OR (organization_id = private.my_org_id()) OR (user_id = auth.uid()));
