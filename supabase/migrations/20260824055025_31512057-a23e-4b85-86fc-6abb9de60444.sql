DROP POLICY IF EXISTS orgs_anon_read_approved ON public.organizations;
DROP POLICY IF EXISTS config_anon_read ON public.platform_config;
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.platform_config FROM anon;
GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;