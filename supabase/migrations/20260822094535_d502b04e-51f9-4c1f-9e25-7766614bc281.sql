DROP POLICY IF EXISTS orgs_read_public_safe_cols ON public.organizations;
DROP POLICY IF EXISTS config_read_public_safe_cols ON public.platform_config;

REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;

ALTER VIEW public.organizations_public SET (security_invoker = false);
ALTER VIEW public.platform_config_public SET (security_invoker = false);

REVOKE ALL ON public.organizations_public FROM anon;
REVOKE ALL ON public.platform_config_public FROM anon;
GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;