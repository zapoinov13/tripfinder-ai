/**
 * Раздел «AI и ключи»: платформенный админ видит AI-запросы всех
 * пользователей (что люди спрашивают у консьержа). Писать чужие записи
 * по-прежнему нельзя — with check остаётся только на свои.
 */

drop policy if exists ai_own on public.ai_searches;
create policy ai_own on public.ai_searches for all to authenticated
  using (user_id = auth.uid() or private.is_platform_admin())
  with check (user_id = auth.uid());
