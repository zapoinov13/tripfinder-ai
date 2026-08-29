-- Файл опирается на две уже применённые вещи: категорию компании
-- (COMPANY-CATEGORY.sql) и отметку о проверке документов (AUTO-APPROVE.sql).
-- Если их нет, лучше сказать об этом сразу, чем уронить создание функции с
-- невнятным «column does not exist».
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'category'
  ) then
    raise exception 'Сначала примените supabase/COMPANY-CATEGORY.sql';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations'
      and column_name = 'documents_verified_at'
  ) then
    raise exception 'Сначала примените supabase/AUTO-APPROVE.sql';
  end if;
end;
$$;

-- Документы компаний живут на сервере, а не в браузере партнёра.
--
-- Раньше загруженный файл превращался в data:URL и оставался в локальном
-- сторе того браузера, где его выбрали. Партнёр видел «Загружено», нажимал
-- «Отправить на проверку» — и файл никуда не уходил. У админа в панели была
-- готовая таблица документов, которая всегда оказывалась пустой: показывать
-- было нечего. Проверка компаний физически не могла работать.
--
-- Теперь файл уходит в приватный бакет Storage, а строка с метаданными и
-- решением проверяющего — в public.company_documents.

-- ---------------------------------------------------------------------------
-- 1. Бакет. Приватный: ссылку на документ выдаём подписанную и на 5 минут.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-docs',
  'company-docs',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Путь к файлу: <organization_id>/<тип>-<время>.<расширение>. Первая папка —
-- идентификатор компании, по ней и решаем, чей это документ.
drop policy if exists company_docs_read on storage.objects;
create policy company_docs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-docs'
    and (
      private.is_platform_admin()
      or (storage.foldername(name))[1] = private.my_org_id()::text
    )
  );

drop policy if exists company_docs_insert on storage.objects;
create policy company_docs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-docs'
    and (storage.foldername(name))[1] = private.my_org_id()::text
  );

drop policy if exists company_docs_update on storage.objects;
create policy company_docs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-docs'
    and (storage.foldername(name))[1] = private.my_org_id()::text
  );

-- Удалять свой файл может сама компания; админ — чтобы вычистить мусор,
-- когда компанию удалили или прислали не то.
drop policy if exists company_docs_delete on storage.objects;
create policy company_docs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-docs'
    and (
      private.is_platform_admin()
      or (storage.foldername(name))[1] = private.my_org_id()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Таблица метаданных и решений проверяющего.
-- ---------------------------------------------------------------------------
create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doc_type text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null unique,
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  review_status text not null default 'PENDING'
    check (review_status in ('PENDING', 'APPROVED', 'REJECTED')),
  review_note text not null default '',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  -- Один документ каждого типа: «Заменить» перезаписывает, а не плодит копии.
  unique (organization_id, doc_type)
);

comment on table public.company_documents is
  'Документы компаний на проверку: файл в бакете company-docs, здесь — решение.';

create index if not exists company_documents_org_idx
  on public.company_documents (organization_id);
create index if not exists company_documents_pending_idx
  on public.company_documents (uploaded_at desc) where review_status = 'PENDING';

alter table public.company_documents enable row level security;

drop policy if exists company_documents_read on public.company_documents;
create policy company_documents_read on public.company_documents
  for select to authenticated
  using (private.is_platform_admin() or organization_id = private.my_org_id());

drop policy if exists company_documents_insert on public.company_documents;
create policy company_documents_insert on public.company_documents
  for insert to authenticated
  with check (organization_id = private.my_org_id());

drop policy if exists company_documents_update on public.company_documents;
create policy company_documents_update on public.company_documents
  for update to authenticated
  using (private.is_platform_admin() or organization_id = private.my_org_id())
  with check (private.is_platform_admin() or organization_id = private.my_org_id());

drop policy if exists company_documents_delete on public.company_documents;
create policy company_documents_delete on public.company_documents
  for delete to authenticated
  using (private.is_platform_admin() or organization_id = private.my_org_id());

-- Партнёр не проверяет сам себя.
--
-- RLS работает на уровне строки, не колонки: политика update разрешает
-- владельцу переписать свою строку целиком, включая review_status. Иначе
-- компания одним запросом из браузера ставит себе APPROVED. Поэтому те же
-- грабли, что и с полями организации, лечим тем же способом — триггером.
create or replace function private.guard_company_document_review()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.review_status := 'PENDING';
    new.review_note := '';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.uploaded_by := auth.uid();
    return new;
  end if;

  -- Партнёр перезалил файл — решение проверяющего сбрасывается: смотреть
  -- надо новый документ, а не тот, что одобрили вчера.
  if new.storage_path is distinct from old.storage_path then
    new.review_status := 'PENDING';
    new.review_note := '';
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  new.review_status := old.review_status;
  new.review_note := old.review_note;
  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  return new;
end;
$$;

revoke all on function private.guard_company_document_review() from public, anon, authenticated;

drop trigger if exists company_documents_guard_review on public.company_documents;
create trigger company_documents_guard_review
  before insert or update on public.company_documents
  for each row execute function private.guard_company_document_review();

grant select, insert, update, delete on public.company_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Очередь проверки для админа: документы вместе с названием компании.
--
-- Обычный select по company_documents отдал бы только organization_id, и
-- панель показывала бы список идентификаторов. Джойн делаем на сервере, а не
-- вторым запросом из браузера: список организаций админу и так виден, но так
-- очередь приходит одной страницей и в правильном порядке.
-- ---------------------------------------------------------------------------
create or replace function public.admin_company_documents()
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  organization_city text,
  organization_category text,
  organization_email text,
  organization_phone text,
  registration_number text,
  documents_verified_at timestamptz,
  doc_type text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  uploaded_at timestamptz,
  review_status text,
  review_note text,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    d.id,
    d.organization_id,
    o.name,
    o.city,
    o.category,
    o.email,
    o.phone,
    o.registration_number,
    o.documents_verified_at,
    d.doc_type,
    d.file_name,
    d.mime_type,
    d.size_bytes,
    d.storage_path,
    d.uploaded_at,
    d.review_status,
    d.review_note,
    d.reviewed_at
  from public.company_documents d
  join public.organizations o on o.id = d.organization_id
  where private.is_platform_admin()
  order by (d.review_status = 'PENDING') desc, d.uploaded_at desc;
$$;

revoke all on function public.admin_company_documents() from public, anon;
grant execute on function public.admin_company_documents() to authenticated, service_role;

comment on function public.admin_company_documents() is
  'Очередь проверки документов для админа платформы. Непроверенные — сверху.';

-- Решение по одному документу. Отдельной функцией, а не update из браузера:
-- триггер выше намеренно не даёт менять review_status никому, кроме админа,
-- и решение должно проходить одной проверенной дорогой.
create or replace function public.review_company_document(
  p_document uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'only_platform_admin';
  end if;
  if p_status not in ('PENDING', 'APPROVED', 'REJECTED') then
    raise exception 'unknown_review_status';
  end if;

  update public.company_documents
  set review_status = p_status,
      review_note = coalesce(p_note, ''),
      reviewed_at = case when p_status = 'PENDING' then null else now() end,
      reviewed_by = case when p_status = 'PENDING' then null else auth.uid() end
  where id = p_document;

  if not found then
    raise exception 'document_not_found';
  end if;
end;
$$;

revoke all on function public.review_company_document(uuid, text, text) from public, anon;
grant execute on function public.review_company_document(uuid, text, text) to authenticated, service_role;
