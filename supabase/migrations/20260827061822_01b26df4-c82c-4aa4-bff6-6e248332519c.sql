
-- Helper functions (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION private.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.my_status()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_org_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = private.my_org_id()
      AND upper(m.role) IN ('OWNER','ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION private.booking_snapshot(_id uuid)
RETURNS public.bookings LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT * FROM public.bookings WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION private.my_role(), private.my_status(), private.is_org_manager(), private.booking_snapshot(uuid) FROM public, anon, authenticated;

-- PROFILES: block self role/status/organization changes at the policy level too
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING ((id = auth.uid()) OR private.is_platform_admin())
WITH CHECK (
  private.is_platform_admin()
  OR (
    id = auth.uid()
    AND role IS NOT DISTINCT FROM private.my_role()
    AND status IS NOT DISTINCT FROM private.my_status()
    AND organization_id IS NOT DISTINCT FROM private.my_org_id()
  )
);

-- BOOKINGS: customers may only cancel / edit passengers, never pricing or payment
DROP POLICY IF EXISTS bookings_update ON public.bookings;
CREATE POLICY bookings_update ON public.bookings
FOR UPDATE TO authenticated
USING (private.is_platform_admin() OR (organization_id = private.my_org_id()) OR (user_id = auth.uid()))
WITH CHECK (
  private.is_platform_admin()
  OR (organization_id = private.my_org_id())
  OR (
    user_id = auth.uid()
    AND payment_status IS NOT DISTINCT FROM (private.booking_snapshot(id)).payment_status
    AND price IS NOT DISTINCT FROM (private.booking_snapshot(id)).price
    AND currency IS NOT DISTINCT FROM (private.booking_snapshot(id)).currency
    AND organization_id IS NOT DISTINCT FROM (private.booking_snapshot(id)).organization_id
    AND operator_id IS NOT DISTINCT FROM (private.booking_snapshot(id)).operator_id
    AND tour_offer_id IS NOT DISTINCT FROM (private.booking_snapshot(id)).tour_offer_id
    AND external_booking_id IS NOT DISTINCT FROM (private.booking_snapshot(id)).external_booking_id
    AND (
      status IS NOT DISTINCT FROM (private.booking_snapshot(id)).status
      OR status = 'CANCELLED'
    )
  )
);

-- ORGANIZATION MEMBERS: only platform admins or org owners/admins may write
DROP POLICY IF EXISTS members_write ON public.organization_members;

CREATE POLICY members_insert ON public.organization_members
FOR INSERT TO authenticated
WITH CHECK (
  private.is_platform_admin()
  OR (organization_id = private.my_org_id() AND private.is_org_manager())
);

CREATE POLICY members_update ON public.organization_members
FOR UPDATE TO authenticated
USING (
  private.is_platform_admin()
  OR (organization_id = private.my_org_id() AND private.is_org_manager())
)
WITH CHECK (
  private.is_platform_admin()
  OR (organization_id = private.my_org_id() AND private.is_org_manager())
);

CREATE POLICY members_delete ON public.organization_members
FOR DELETE TO authenticated
USING (
  private.is_platform_admin()
  OR (organization_id = private.my_org_id() AND private.is_org_manager())
);

-- Defense in depth: trigger blocking self role escalation inside an organization
CREATE OR REPLACE FUNCTION public.prevent_member_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
BEGIN
  IF private.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'Not allowed to change your own organization role';
  END IF;
  IF NOT private.is_org_manager() THEN
    RAISE EXCEPTION 'Only organization owners can manage members';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_prevent_escalation ON public.organization_members;
CREATE TRIGGER organization_members_prevent_escalation
BEFORE INSERT OR UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_member_role_escalation();
