-- 1) Remove anon full-row read policies on base tables
DROP POLICY IF EXISTS orgs_read_public_safe ON public.organizations;
DROP POLICY IF EXISTS config_read_public_safe ON public.platform_config;

REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;

-- 2) Public safe views expose only non-sensitive columns; run as owner so no anon table access is needed
CREATE OR REPLACE VIEW public.organizations_public AS
SELECT id, name, country, city, website, status, plan_code, created_at
FROM public.organizations
WHERE status = 'APPROVED';

CREATE OR REPLACE VIEW public.platform_config_public AS
SELECT id, premium_monthly_price, premium_currency, operator_plans
FROM public.platform_config;

ALTER VIEW public.organizations_public SET (security_invoker = false);
ALTER VIEW public.platform_config_public SET (security_invoker = false);

GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;