-- Lovable Security: organizations_anon_read_contact_info
-- Не отдаём phone/whatsapp анонимам. Контакт через website/telegram/instagram на странице компании.

DROP VIEW IF EXISTS public.organizations_public;

CREATE VIEW public.organizations_public AS
  SELECT
    id,
    name,
    country,
    city,
    website,
    status,
    plan_code,
    created_at,
    instagram,
    telegram,
    about,
    logo_url,
    cover_url,
    photos,
    videos,
    services,
    countries,
    client_countries,
    languages
  FROM public.organizations
  WHERE status = 'APPROVED';

ALTER VIEW public.organizations_public SET (security_invoker = false);

REVOKE ALL ON public.organizations_public FROM anon;
GRANT SELECT ON public.organizations_public TO anon, authenticated;

-- Прямые контакты только для авторизованных (страница компании после входа).
CREATE OR REPLACE VIEW public.organizations_contacts AS
  SELECT id, phone, whatsapp
  FROM public.organizations
  WHERE status = 'APPROVED';

ALTER VIEW public.organizations_contacts SET (security_invoker = true);

REVOKE ALL ON public.organizations_contacts FROM anon;
GRANT SELECT ON public.organizations_contacts TO authenticated;
