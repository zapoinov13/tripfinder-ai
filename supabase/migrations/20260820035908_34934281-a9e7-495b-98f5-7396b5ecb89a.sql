-- 1) Remove anonymous direct access to base tables
DROP POLICY IF EXISTS orgs_read_public ON public.organizations;
DROP POLICY IF EXISTS config_read_public ON public.platform_config;
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;

-- 2) Tighten authenticated read on organizations to admins and own org
DROP POLICY IF EXISTS orgs_read ON public.organizations;
CREATE POLICY orgs_read ON public.organizations
  FOR SELECT TO authenticated
  USING (private.is_platform_admin() OR id = private.my_org_id());

-- 3) Safe public views (owner-rights so they can read the restricted base tables)
CREATE OR REPLACE VIEW public.organizations_public AS
  SELECT id, name, country, city, website, status, plan_code, created_at
  FROM public.organizations
  WHERE status = 'APPROVED';
ALTER VIEW public.organizations_public SET (security_invoker = false);

CREATE OR REPLACE VIEW public.platform_config_public AS
  SELECT id, premium_monthly_price, premium_currency, operator_plans
  FROM public.platform_config;
ALTER VIEW public.platform_config_public SET (security_invoker = false);

GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;
