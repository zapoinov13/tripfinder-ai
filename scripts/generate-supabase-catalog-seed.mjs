#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = `-- Dubai-only launch catalog for TourGo.
-- The marketplace is designed for many countries, but the first supply catalog is Dubai.

insert into public.destinations (id, country, city, flag, blurb, tours_count, image_key) values
('dubai-beach','Пляжный Дубай','JBR & Marina','🇦🇪','Отели у моря, прогулки, рестораны и семейный отдых',428,'dubai-hero'),
('dubai-palm','Palm Jumeirah','The Palm','🇦🇪','Премиальные резорты, Atlantis, пляжи и аквапарки',286,'dubai-palm'),
('dubai-downtown','Downtown Dubai','Burj Khalifa','🇦🇪','Dubai Mall, фонтаны, рестораны и городские отели',314,'dubai-downtown'),
('dubai-family','Семейный Дубай','Parks & Resorts','🇦🇪','Kids club, аквапарки, парки развлечений и трансферы',245,'dubai-family'),
('dubai-budget','Доступный Дубай','Deira & Al Barsha','🇦🇪','Практичные отели, метро рядом и честный бюджет',372,'dubai-old-city'),
('dubai-experiences','Экскурсии в Дубае','Safari, Yacht, Tickets','🇦🇪','Сафари, яхты, обзорные туры, билеты и трансферы',198,'dubai-safari')
on conflict (id) do update set country=excluded.country, city=excluded.city, blurb=excluded.blurb, tours_count=excluded.tours_count, image_key=excluded.image_key;

insert into public.operators (id, name, rating, tours_count, organization_id) values
('op-1','Dubai Select DMC',4.9,428,'11111111-1111-1111-1111-111111111101'),
('op-2','Emirates Family Travel',4.8,316,'11111111-1111-1111-1111-111111111101'),
('op-3','Marina Experience Co.',4.7,184,'11111111-1111-1111-1111-111111111101'),
('op-4','CIS Dubai Holidays',4.8,272,'11111111-1111-1111-1111-111111111101'),
('op-5','Desert Gate Partners',4.6,198,'11111111-1111-1111-1111-111111111105')
on conflict (id) do update set name=excluded.name, rating=excluded.rating, tours_count=excluded.tours_count, organization_id=excluded.organization_id;

insert into public.hotels (id, name, destination_id, city, country, flag, stars, rating, reviews, district, beach_line, distance_to_sea, amenities, image_key) values
('hotel-1','Rixos Premium Dubai JBR','dubai-beach','JBR','Дубай, ОАЭ','🇦🇪',5,9.4,420,'Jumeirah Beach Residence',1,50,ARRAY['Beach','Pool','Kids Club','Spa','Wi-Fi','Transfer']::text[],'dubai-hotel-beach'),
('hotel-2','Address Beach Resort','dubai-beach','JBR','Дубай, ОАЭ','🇦🇪',5,9.3,566,'JBR',1,90,ARRAY['Beach','Pool','Spa','Wi-Fi','Transfer']::text[],'dubai-hotel-beach'),
('hotel-3','Grosvenor House Dubai','dubai-beach','Dubai Marina','Дубай, ОАЭ','🇦🇪',5,9.1,712,'Dubai Marina',2,650,ARRAY['Pool','Spa','Wi-Fi','Transfer']::text[],'dubai-yacht'),
('hotel-4','Sofitel Dubai Jumeirah Beach','dubai-beach','JBR','Дубай, ОАЭ','🇦🇪',5,8.9,858,'The Walk',1,120,ARRAY['Beach','Pool','Kids Club','Wi-Fi','Transfer']::text[],'dubai-jumeirah-beach'),
('hotel-5','Atlantis The Palm','dubai-palm','Palm Jumeirah','Дубай, ОАЭ','🇦🇪',5,9.6,1004,'Atlantis Area',1,80,ARRAY['Beach','Pool','Kids Club','Spa','Wi-Fi','Transfer']::text[],'dubai-palm'),
('hotel-6','W Dubai The Palm','dubai-palm','Palm Jumeirah','Дубай, ОАЭ','🇦🇪',5,9.1,1150,'Crescent Palm',1,70,ARRAY['Beach','Pool','Spa','Wi-Fi','Transfer']::text[],'dubai-palm'),
('hotel-7','Dukes The Palm','dubai-palm','Palm Jumeirah','Дубай, ОАЭ','🇦🇪',5,8.8,1296,'Palm West Beach',1,100,ARRAY['Beach','Pool','Kids Club','Wi-Fi','Transfer']::text[],'dubai-resort-pool'),
('hotel-8','Address Downtown','dubai-downtown','Downtown','Дубай, ОАЭ','🇦🇪',5,9.4,1442,'Burj Khalifa District',3,15000,ARRAY['Pool','Spa','Wi-Fi','Transfer']::text[],'dubai-downtown'),
('hotel-9','Palace Downtown','dubai-downtown','Downtown','Дубай, ОАЭ','🇦🇪',5,9.2,1588,'Old Town',3,14500,ARRAY['Pool','Spa','Wi-Fi','Transfer']::text[],'dubai-downtown'),
('hotel-10','Pullman Dubai Downtown','dubai-downtown','Business Bay','Дубай, ОАЭ','🇦🇪',5,8.6,1734,'Business Bay',3,13000,ARRAY['Pool','Spa','Wi-Fi']::text[],'dubai-downtown'),
('hotel-11','Lapita Dubai Parks and Resorts','dubai-family','Dubai Parks','Дубай, ОАЭ','🇦🇪',4,8.7,1880,'Dubai Parks',3,23000,ARRAY['Pool','Kids Club','Spa','Wi-Fi','Transfer']::text[],'dubai-family'),
('hotel-12','Jumeirah Beach Hotel','dubai-family','Jumeirah','Дубай, ОАЭ','🇦🇪',5,9.2,2026,'Umm Suqeim',1,40,ARRAY['Beach','Pool','Kids Club','Spa','Wi-Fi','Transfer']::text[],'dubai-jumeirah-beach'),
('hotel-13','Vida Creek Harbour','dubai-family','Creek Harbour','Дубай, ОАЭ','🇦🇪',4,8.9,2172,'Dubai Creek Harbour',3,14000,ARRAY['Pool','Kids Club','Wi-Fi','Transfer']::text[],'dubai-old-city'),
('hotel-14','Centro Barsha','dubai-budget','Al Barsha','Дубай, ОАЭ','🇦🇪',3,8.0,2318,'Al Barsha',3,4200,ARRAY['Pool','Wi-Fi','Transfer']::text[],'dubai-resort-pool'),
('hotel-15','Rove Downtown','dubai-budget','Downtown','Дубай, ОАЭ','🇦🇪',3,8.8,2464,'Zaabeel',3,13000,ARRAY['Pool','Wi-Fi','Transfer']::text[],'dubai-downtown'),
('hotel-16','Hyatt Place Dubai Al Rigga','dubai-budget','Deira','Дубай, ОАЭ','🇦🇪',4,8.3,2610,'Al Rigga',3,9000,ARRAY['Pool','Wi-Fi','Transfer']::text[],'dubai-old-city'),
('hotel-17','Canopy by Hilton Dubai Al Seef','dubai-budget','Bur Dubai','Дубай, ОАЭ','🇦🇪',4,8.6,2756,'Al Seef',3,8500,ARRAY['Pool','Spa','Wi-Fi']::text[],'dubai-old-city'),
('hotel-18','Dubai Safari Camp Package','dubai-experiences','Desert Safari','Дубай, ОАЭ','🇦🇪',4,9.0,2902,'Lahbab Desert',3,45000,ARRAY['Transfer','Wi-Fi']::text[],'dubai-safari'),
('hotel-19','Private Yacht Marina Experience','dubai-experiences','Yacht Marina','Дубай, ОАЭ','🇦🇪',5,9.5,3048,'Dubai Marina',2,300,ARRAY['Transfer','Wi-Fi']::text[],'dubai-yacht'),
('hotel-20','Burj Khalifa and Downtown Pass','dubai-experiences','City Tickets','Дубай, ОАЭ','🇦🇪',4,9.1,3194,'Downtown',3,15000,ARRAY['Transfer','Wi-Fi']::text[],'dubai-downtown')
on conflict (id) do update set name=excluded.name, destination_id=excluded.destination_id, city=excluded.city, country=excluded.country, rating=excluded.rating, amenities=excluded.amenities, image_key=excluded.image_key;

with generated as (
  select
    gs as n,
    'tour-' || gs as id,
    'hotel-' || (((gs - 1) % 20) + 1) as hotel_id,
    'op-' || (((gs - 1) % 5) + 1) as operator_id,
    (array['Алматы','Астана','Ташкент','Бишкек','Москва','Санкт-Петербург'])[((gs - 1) % 6) + 1] as from_city,
    (array[3,5,7,9,10,12,14,16])[((gs - 1) % 8) + 1] as nights,
    date '2026-08-03' + (((gs * 5) % 55)::int) as departure,
    (array['RO','BB','HB','FB','AI','UAI'])[((gs - 1) % 6) + 1] as meal_code,
    (array['Без питания','Завтрак','Полупансион','Полный пансион','All Inclusive','Ultra All Inclusive'])[((gs - 1) % 6) + 1] as meal,
    round((620000 + (((gs * 137) % 17) * 62000) + ((((gs - 1) % 5) + 3) * 95000)) / 1000) * 1000 as price,
    case when gs % 5 = 0 then ARRAY['hot']::text[] when gs % 7 = 3 then ARRAY['premium']::text[] when gs % 9 = 2 then ARRAY['sponsored']::text[] when gs % 11 = 1 then ARRAY['best']::text[] else ARRAY[]::text[] end as tags
  from generate_series(1, 120) as gs
)
insert into public.tour_offers (
  id, hotel_id, operator_id, operator_org_id, external_id, room_type, from_city, nights,
  date_start, date_end, departure, meal_code, meal, price, old_price, premium_price, currency,
  tags, adults, children, transfer, views, bookings, availability, status, last_synced_at, created_at
)
select
  id,
  hotel_id,
  operator_id,
  case when operator_id = 'op-5' then '11111111-1111-1111-1111-111111111105'::uuid else '11111111-1111-1111-1111-111111111101'::uuid end,
  'ext-' || id,
  'Standard Double',
  from_city,
  nights,
  to_char(departure, 'FMDD TMMonth'),
  to_char(departure + nights, 'FMDD TMMonth'),
  departure,
  meal_code,
  meal,
  price,
  case when n % 5 = 0 then round((price * 1.28) / 1000) * 1000 else null end,
  case when n % 7 = 3 then round((price * 0.82) / 1000) * 1000 else null end,
  'KZT',
  tags,
  (array[2,2,1,3,2,4])[((n - 1) % 6) + 1],
  (array[0,2,1,0,2,1])[((n - 1) % 6) + 1],
  n % 3 <> 0,
  1200 + ((n * 371) % 9000),
  3 + ((n * 7) % 40),
  8,
  'active',
  now(),
  departure - interval '60 days'
from generated
on conflict (id) do update set hotel_id=excluded.hotel_id, operator_id=excluded.operator_id, price=excluded.price, tags=excluded.tags, status=excluded.status, availability=excluded.availability;
`;

const out = resolve("supabase/seed_catalog.sql");
writeFileSync(out, sql);
console.log(`Wrote ${out}`);
