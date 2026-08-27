-- Партнёр не может сам себе выдать статус, тариф и деньги.
--
-- Политика orgs_update разрешает владельцу менять свою организацию целиком,
-- а значит и поля, которыми распоряжается платформа: статус модерации,
-- тариф и балансы. С валидным токеном партнёра это делается одним запросом
-- из браузера: status='APPROVED' даёт знак «Проверенная компания» без
-- проверки документов, plan_code='BUSINESS' — платный тариф даром,
-- promotion_balance — бесплатное продвижение.
--
-- Сузить саму политику нельзя: RLS работает на уровне строки, не колонки.
-- Поэтому ставим триггер: для всех, кроме админа платформы, эти поля
-- возвращаются к прежним значениям (при вставке — к безопасным началам).
-- Клиентский синк продолжает слать их в общем наборе полей — они просто
-- игнорируются, а обратная гидрация приносит правду с сервера.

create or replace function private.guard_org_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  -- Админ платформы меняет статус, тариф и балансы из своей панели.
  if private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'PENDING_APPROVAL';
    new.plan_code := 'START';
    new.advertising_balance := 0;
    new.promotion_balance := 0;
    new.additional_tour_limit := 0;
    return new;
  end if;

  new.status := old.status;
  new.plan_code := old.plan_code;
  new.advertising_balance := old.advertising_balance;
  new.promotion_balance := old.promotion_balance;
  new.additional_tour_limit := old.additional_tour_limit;
  return new;
end;
$$;

revoke all on function private.guard_org_platform_fields() from public, anon, authenticated;

drop trigger if exists organizations_guard_platform_fields on public.organizations;
create trigger organizations_guard_platform_fields
  before insert or update on public.organizations
  for each row execute function private.guard_org_platform_fields();

comment on function private.guard_org_platform_fields() is
  'Статус модерации, тариф и балансы организации меняет только админ платформы.';
