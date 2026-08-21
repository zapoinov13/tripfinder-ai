ALTER VIEW public.organizations_public SET (security_invoker = true);
ALTER VIEW public.platform_config_public SET (security_invoker = true);

-- Column-scoped anon reads: only non-sensitive columns are granted
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;

GRANT SELECT (id, name, country, city, website, status, plan_code, created_at)
  ON public.organizations TO anon;
GRANT SELECT (id, premium_monthly_price, premium_currency, operator_plans)
  ON public.platform_config TO anon;

CREATE POLICY orgs_read_public_safe_cols ON public.organizations
  FOR SELECT TO anon USING (status = 'APPROVED');
CREATE POLICY config_read_public_safe_cols ON public.platform_config
  FOR SELECT TO anon USING (true);