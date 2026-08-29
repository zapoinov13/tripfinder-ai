-- Телефон в профиле.
--
-- В настройках человек должен править свои данные: имя, город, телефон,
-- пароль. Имя и город в профиле были, пароль меняется через сам вход, а
-- телефона не было вовсе — при регистрации его спрашивали и тут же теряли.
-- Для партнёра это не мелочь: телефон и есть способ, которым с ним свяжется
-- турист.

alter table public.profiles
  add column if not exists phone text not null default '';

comment on column public.profiles.phone is
  'Личный телефон пользователя. У компании отдельный, в organizations.phone.';

select 'Колонка profiles.phone' as "часть",
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
       ) then 'есть' else 'НЕТ' end as "итог";
