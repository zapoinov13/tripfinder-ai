-- 1. analytics_events: prevent spoofed user_id
DROP POLICY IF EXISTS analytics_insert ON public.analytics_events;
CREATE POLICY analytics_insert ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. organizations: hide contact/legal details from anonymous visitors
DROP POLICY IF EXISTS orgs_read ON public.organizations;
CREATE POLICY orgs_read ON public.organizations
  FOR SELECT TO authenticated
  USING (private.is_platform_admin() OR id = private.my_org_id() OR status = 'APPROVED');
REVOKE SELECT ON public.organizations FROM anon;

CREATE OR REPLACE VIEW public.organizations_public
WITH (security_invoker = false) AS
  SELECT id, name, country, city, website, status, plan_code, created_at
  FROM public.organizations
  WHERE status = 'APPROVED';
GRANT SELECT ON public.organizations_public TO anon, authenticated;

-- 3. platform_config: keep ranking weights / promotion prices internal
DROP POLICY IF EXISTS config_read ON public.platform_config;
CREATE POLICY config_read ON public.platform_config
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.platform_config FROM anon;

CREATE OR REPLACE VIEW public.platform_config_public
WITH (security_invoker = false) AS
  SELECT id, premium_monthly_price, premium_currency, operator_plans
  FROM public.platform_config;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;