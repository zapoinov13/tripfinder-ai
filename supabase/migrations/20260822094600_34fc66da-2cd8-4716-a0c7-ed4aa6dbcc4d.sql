ALTER VIEW public.organizations_public SET (security_invoker = true);
ALTER VIEW public.platform_config_public SET (security_invoker = true);

-- Column-scoped anon access: only non-sensitive fields are readable at all.
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;
GRANT SELECT (id, name, country, city, website, status, plan_code, created_at)
  ON public.organizations TO anon;
GRANT SELECT (id, premium_monthly_price, premium_currency, operator_plans)
  ON public.platform_config TO anon;

CREATE POLICY orgs_anon_read_approved ON public.organizations
  FOR SELECT TO anon USING (status = 'APPROVED');
CREATE POLICY config_anon_read ON public.platform_config
  FOR SELECT TO anon USING (true);