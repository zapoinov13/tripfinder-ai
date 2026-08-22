/**
 * Публичные ответы турфирмы на отзывы туристов.
 */

alter table public.company_reviews
  add column if not exists reply text,
  add column if not exists reply_at timestamptz,
  add column if not exists reply_by_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists reply_by_name text;

drop policy if exists company_reviews_update on public.company_reviews;
create policy company_reviews_update on public.company_reviews for update using (
  user_id = auth.uid()
  or organization_id = private.my_org_id()
  or private.is_platform_admin()
);
