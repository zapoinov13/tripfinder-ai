-- ===========================================================================
-- TourGo · применить в Supabase SQL Editor
-- https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
--
-- День рождения туриста. Вставьте целиком и нажмите Run — внизу будет
-- таблица «часть / итог».
-- ===========================================================================

-- День рождения туриста — по желанию, ради бонусов.
--
-- Просить его при регистрации имеет смысл только если есть куда положить:
-- иначе человек вводит дату, а она теряется вместе с вкладкой. Поле
-- необязательное и остаётся пустым у всех, кто не захотел его называть.

alter table public.profiles
  add column if not exists birthday date;

comment on column public.profiles.birthday is
  'День рождения туриста. Заполняется по желанию, нужен для бонусов ко дню рождения.';

select 'Колонка profiles.birthday' as "часть",
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = 'birthday'
       ) then 'есть' else 'НЕТ' end as "итог"
union all
select 'Колонка profiles.phone',
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
       ) then 'есть' else 'НЕТ' end;
