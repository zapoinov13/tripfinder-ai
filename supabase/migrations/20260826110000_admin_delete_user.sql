/**
 * Настоящее удаление пользователя из админки.
 *
 * До этого «Удалить» стирал запись только в браузере: админ-панель при
 * загрузке подтягивает public.profiles целиком, и удалённые «возвращались».
 * RPC удаляет запись в auth.users (профиль и связанные данные уходят по
 * каскаду), поэтому аккаунт исчезает навсегда и войти им больше нельзя.
 *
 * Защита: только платформенный админ; себя удалить нельзя.
 */

create or replace function public.admin_delete_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_user = auth.uid() then
    raise exception 'cannot delete your own account';
  end if;

  delete from auth.users where id = target_user;
  -- Профиль мог остаться без auth-записи (сид/скрипты) — подчистим и его.
  delete from public.profiles where id = target_user;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated, service_role;
