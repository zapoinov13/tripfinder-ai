/**
 * Совместимость двух защит профиля.
 *
 * 20260826050452 добавила триггер prevent_profile_privilege_escalation,
 * который блокирует смену role/organization_id/status всем, кроме
 * платформенных админов. Он ломает:
 *  - register_company (SECURITY DEFINER назначает OPERATOR_ADMIN при
 *    регистрации турфирмы — см. 20260825090000);
 *  - service-role скрипты (ensure-owner-admin, review-users): у них
 *    auth.uid() null, is_platform_admin() false -> исключение.
 *
 * Разрешаем: бутстрап-флаг register_company и запросы без JWT
 * (service_role и так обходит RLS; триггер не должен резать админ-скрипты).
 */

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF current_setting('tourgo.allow_profile_bootstrap', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF private.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to change role, organization or status';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
