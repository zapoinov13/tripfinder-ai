-- Use invoker-rights views; restrict anon at the column + policy level instead
CREATE OR REPLACE VIEW public.organizations_public
WITH (security_invoker = true) AS
  SELECT id, name, country, city, website, status, plan_code, created_at
  FROM public.organizations
  WHERE status = 'APPROVED';

CREATE OR REPLACE VIEW public.platform_config_public
WITH (security_invoker = true) AS
  SELECT id, premium_monthly_price, premium_currency, operator_plans
  FROM public.platform_config;

-- anon may read only non-sensitive columns
GRANT SELECT (id, name, country, city, website, status, plan_code, created_at)
  ON public.organizations TO anon;
CREATE POLICY orgs_read_public ON public.organizations
  FOR SELECT TO anon USING (status = 'APPROVED');

GRANT SELECT (id, premium_monthly_price, premium_currency, operator_plans)
  ON public.platform_config TO anon;
CREATE POLICY config_read_public ON public.platform_config
  FOR SELECT TO anon USING (true);