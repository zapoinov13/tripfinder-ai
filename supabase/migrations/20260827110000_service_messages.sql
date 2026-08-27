/**
 * Переписка клиента и компании по заявке на запись.
 *
 * До этого у зала, проката и посуточной аренды не было канала связи:
 * чат (request_messages) привязан к туровой заявке, поэтому инбокс
 * такого партнёра оставался пустым навсегда. Здесь тред привязан
 * к service_requests — «заявка = переписка».
 *
 * Доступ: автор заявки и сотрудники компании, которой она адресована.
 * Админ платформы читает всё; писать от чужого имени нельзя.
 */

create table if not exists public.service_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_side text not null check (author_side in ('CLIENT', 'COMPANY')),
  author_name text not null default '',
  text text not null default '',
  read_by_client boolean not null default false,
  read_by_company boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists service_messages_thread_idx
  on public.service_messages (request_id, created_at);

alter table public.service_messages enable row level security;

/** Участник треда: автор заявки или сотрудник компании-получателя. */
create or replace function private.can_access_service_request(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.service_requests r
    where r.id = target
      and (
        r.user_id = auth.uid()
        or r.organization_id = private.my_org_id()
        or private.is_platform_admin()
      )
  );
$$;

grant execute on function private.can_access_service_request(uuid) to authenticated, service_role;

drop policy if exists service_messages_read on public.service_messages;
create policy service_messages_read on public.service_messages for select to authenticated using (
  private.can_access_service_request(request_id)
);

-- Писать можно только в свой тред и только от своего имени.
drop policy if exists service_messages_insert on public.service_messages;
create policy service_messages_insert on public.service_messages
  for insert to authenticated
  with check (user_id = auth.uid() and private.can_access_service_request(request_id));

-- Update нужен только для отметок «прочитано».
drop policy if exists service_messages_update on public.service_messages;
create policy service_messages_update on public.service_messages
  for update to authenticated
  using (private.can_access_service_request(request_id))
  with check (private.can_access_service_request(request_id));

grant select, insert, update on public.service_messages to authenticated;
grant all on public.service_messages to service_role;
