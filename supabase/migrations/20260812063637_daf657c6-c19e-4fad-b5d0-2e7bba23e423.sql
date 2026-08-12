create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('PLATFORM_ADMIN','PLATFORM_MANAGER') and status = 'active'
  );
$$;

create or replace function private.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_platform_admin(), private.my_org_id() to anon, authenticated, service_role;

-- Recreate policies against the private helpers
drop policy if exists tours_read on public.tour_offers;
create policy tours_read on public.tour_offers for select using (
  status = 'active' or private.is_platform_admin() or operator_org_id = private.my_org_id()
);
drop policy if exists config_admin_write on public.platform_config;
create policy config_admin_write on public.platform_config for update to authenticated using (private.is_platform_admin());

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using (
  id = auth.uid() or private.is_platform_admin()
);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (
  id = auth.uid() or private.is_platform_admin()
);

drop policy if exists orgs_read on public.organizations;
create policy orgs_read on public.organizations for select using (
  private.is_platform_admin() or id = private.my_org_id() or status = 'APPROVED'
);
drop policy if exists orgs_update on public.organizations;
create policy orgs_update on public.organizations for update to authenticated using (
  private.is_platform_admin() or id = private.my_org_id()
);

drop policy if exists members_read on public.organization_members;
create policy members_read on public.organization_members for select to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id()
);
drop policy if exists members_write on public.organization_members;
create policy members_write on public.organization_members for all to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id()
) with check (
  private.is_platform_admin() or organization_id = private.my_org_id()
);

drop policy if exists bookings_own_read on public.bookings;
create policy bookings_own_read on public.bookings for select to authenticated using (
  user_id = auth.uid() or private.is_platform_admin() or organization_id = private.my_org_id()
);
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id() or user_id = auth.uid()
);

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated using (
  user_id = auth.uid() or private.is_platform_admin() or organization_id = private.my_org_id()
);

drop policy if exists subs_read on public.subscriptions;
create policy subs_read on public.subscriptions for select to authenticated using (
  user_id = auth.uid() or private.is_platform_admin() or organization_id = private.my_org_id()
);

drop policy if exists tours_operator_write on public.tour_offers;
create policy tours_operator_write on public.tour_offers for update to authenticated using (
  private.is_platform_admin() or operator_org_id = private.my_org_id()
);
drop policy if exists tours_admin_all on public.tour_offers;
create policy tours_admin_all on public.tour_offers for insert to authenticated with check (
  private.is_platform_admin() or operator_org_id = private.my_org_id()
);

drop policy if exists api_conn_org on public.operator_api_connections;
create policy api_conn_org on public.operator_api_connections for all to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id()
) with check (private.is_platform_admin() or organization_id = private.my_org_id());

drop policy if exists sync_logs_org on public.sync_logs;
create policy sync_logs_org on public.sync_logs for select to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id()
);
drop policy if exists sync_logs_insert on public.sync_logs;
create policy sync_logs_insert on public.sync_logs for insert to authenticated with check (
  private.is_platform_admin() or organization_id = private.my_org_id()
);

drop policy if exists promotions_org on public.promotions;
create policy promotions_org on public.promotions for all to authenticated using (
  private.is_platform_admin() or organization_id = private.my_org_id()
) with check (private.is_platform_admin() or organization_id = private.my_org_id());

drop policy if exists audit_admin on public.audit_logs;
create policy audit_admin on public.audit_logs for select to authenticated using (private.is_platform_admin());
drop policy if exists analytics_admin on public.analytics_events;
create policy analytics_admin on public.analytics_events for select to authenticated using (private.is_platform_admin());

drop function if exists public.is_platform_admin();
drop function if exists public.my_org_id();
drop function if exists public.current_profile();
revoke all on function public.handle_new_user() from public, anon, authenticated;