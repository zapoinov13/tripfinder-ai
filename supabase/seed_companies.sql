/**
 * Выполнить в Supabase Dashboard → SQL Editor после seed.sql и seed_catalog.sql.
 *
 * Зачем: в базе была только одна проверенная турфирма, поэтому турист получал
 * одно предложение и не мог ничего сравнить, а демо-кабинет турфирмы не видел
 * ни одной заявки. Скрипт добавляет ещё три проверенные компании и раздаёт им
 * часть туров. Запускать можно повторно: он идемпотентный.
 */

insert into public.organizations (
  id, name, legal_name, registration_number, country, city, address,
  phone, email, website, contact_person, status, plan_code
)
values
  ('11111111-1111-1111-1111-111111111102', 'Sunrise Tours', 'Sunrise Tours LLP', 'BIN-100001',
   'Казахстан', 'Астана', 'ул. Туристов 2', '+7 701 000 001', 'ops@op-2.demo',
   'https://op-2.demo', 'Менеджер Sunrise', 'APPROVED', 'PRO'),
  ('11111111-1111-1111-1111-111111111103', 'Blue Horizon', 'Blue Horizon LLP', 'BIN-100002',
   'Казахстан', 'Алматы', 'ул. Туристов 3', '+7 701 000 002', 'ops@op-3.demo',
   'https://op-3.demo', 'Менеджер Blue Horizon', 'APPROVED', 'START'),
  ('11111111-1111-1111-1111-111111111104', 'Nomad Travel', 'Nomad Travel LLP', 'BIN-100003',
   'Казахстан', 'Астана', 'ул. Туристов 4', '+7 701 000 003', 'ops@op-4.demo',
   'https://op-4.demo', 'Менеджер Nomad', 'APPROVED', 'START')
on conflict (id) do update set status = 'APPROVED';

-- Часть туров крупнейшей компании переводим на новые фирмы: так у туриста
-- появляются предложения от разных компаний, которые можно сравнить.
with numbered as (
  select id, row_number() over (order by id) as rn
  from public.tour_offers
  where operator_org_id = '11111111-1111-1111-1111-111111111101'
)
update public.tour_offers as t
set operator_org_id = case numbered.rn % 4
  when 1 then '11111111-1111-1111-1111-111111111102'::uuid
  when 2 then '11111111-1111-1111-1111-111111111103'::uuid
  when 3 then '11111111-1111-1111-1111-111111111104'::uuid
  else t.operator_org_id
end
from numbered
where numbered.id = t.id;

select o.name, o.status, count(t.id) as tours
from public.organizations o
left join public.tour_offers t on t.operator_org_id = o.id
group by o.name, o.status
order by o.name;
