-- =====================================================================
-- HOTEL MANAGEMENT DATABASE SCHEMA (ERD) & 341-ROOM SEED
-- Tables: ROOMS, RESIDENTS, STAFF, RECLAMATIONS
-- Price column has been removed.
-- Total Rooms: 341 (Skipping all rooms ending with 13)
-- =====================================================================

-- 0. Clean old tables in reverse dependency order
drop table if exists public.reclamations cascade;
drop table if exists public.residents cascade;
drop table if exists public.staff cascade;
drop table if exists public.rooms cascade;

-- =====================================================================
-- 1. TABLE: ROOMS
-- =====================================================================
create table public.rooms (
  id bigint generated always as identity primary key,
  room_number text not null unique,
  floor int not null check (floor in (1, 2, 3)),
  block text not null check (block in ('BLOCK_A', 'BLOCK_B')),
  is_occupied boolean not null default false,
  cleaning_status text not null default 'CLEAN' check (cleaning_status in ('DIRTY', 'CLEANING', 'INSPECTING', 'CLEAN')),
  qr_code_hash text not null unique,
  created_at timestamptz not null default now()
);

create index idx_rooms_block on public.rooms (block);
create index idx_rooms_floor on public.rooms (floor);
create index idx_rooms_occupied on public.rooms (is_occupied);
create index idx_rooms_cleaning on public.rooms (cleaning_status);

-- =====================================================================
-- 2. TABLE: RESIDENTS (ROOM <-> RESIDENT : 1-to-Many)
-- =====================================================================
create table public.residents (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone_number text,
  check_in_date timestamptz not null default now(),
  check_out_date timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CHECKED_OUT')),
  created_at timestamptz not null default now()
);

create index idx_residents_room_id on public.residents (room_id);
create index idx_residents_status on public.residents (status);

-- =====================================================================
-- 3. TABLE: STAFF
-- =====================================================================
create table public.staff (
  id bigint generated always as identity primary key,
  full_name text not null,
  role text not null check (role in ('master', 'manager', 'receptionist', 'maintenance', 'governance')),
  department text not null check (department in ('RECEPTION', 'HOUSEKEEPING', 'TECHNICAL', 'MANAGEMENT')),
  phone_number text,
  shift_status text not null default 'OFF_SHIFT' check (shift_status in ('ON_SHIFT', 'OFF_SHIFT', 'ON_BREAK')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_staff_role on public.staff (role);
create index idx_staff_department on public.staff (department);
create index idx_staff_shift on public.staff (shift_status);

-- =====================================================================
-- 4. TABLE: RECLAMATIONS (Dual Staff links, Room link, Resident link)
-- =====================================================================
create table public.reclamations (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  resident_id bigint references public.residents(id) on delete set null,
  created_by_staff_id bigint references public.staff(id) on delete set null,
  assigned_staff_id bigint references public.staff(id) on delete set null,
  department text not null check (department in ('MAINTENANCE', 'GOVERNANCE')),
  category text not null,
  description text not null,
  priority text not null default 'STANDARD' check (priority in ('EMERGENCY', 'HIGH', 'STANDARD')),
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create index idx_reclamations_room_id on public.reclamations (room_id);
create index idx_reclamations_resident_id on public.reclamations (resident_id);
create index idx_reclamations_created_by on public.reclamations (created_by_staff_id);
create index idx_reclamations_assigned on public.reclamations (assigned_staff_id);
create index idx_reclamations_status on public.reclamations (status);
create index idx_reclamations_priority on public.reclamations (priority);
create index idx_reclamations_department on public.reclamations (department);

-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
alter table public.rooms enable row level security;
alter table public.residents enable row level security;
alter table public.staff enable row level security;
alter table public.reclamations enable row level security;

-- Read policies for public / anon
create policy "Allow read access to rooms" on public.rooms for select using (true);
create policy "Allow read access to residents" on public.residents for select using (true);
create policy "Allow read access to staff" on public.staff for select using (true);
create policy "Allow read access to reclamations" on public.reclamations for select using (true);

-- Insert / Update policies for authenticated & anon clients
create policy "Allow all access to rooms" on public.rooms for all using (true) with check (true);
create policy "Allow all access to residents" on public.residents for all using (true) with check (true);
create policy "Allow all access to staff" on public.staff for all using (true) with check (true);
create policy "Allow all access to reclamations" on public.reclamations for all using (true) with check (true);

-- =====================================================================
-- 6. SEED DATA: INSERT ALL 341 ROOMS (No Price Column)
-- =====================================================================
insert into public.rooms (room_number, floor, block, is_occupied, cleaning_status, qr_code_hash)
values
  ('1001', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1001-5b9bdf8e32fe4c71'),
  ('1003', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1003-995ad76d32c605a8'),
  ('1005', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1005-40c00b4f7785bc4d'),
  ('1007', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1007-97510b11270ab1f3'),
  ('1009', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1009-af43d83d848e7193'),
  ('1011', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1011-c72e0d277c8e2dcf'),
  ('1015', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1015-e524206a038fc2b6'),
  ('1017', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1017-4f2bc2c095323ff6'),
  ('1019', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1019-743ff5d7060f6ad0'),
  ('1021', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1021-6fc67bb1bde074ea'),
  ('1023', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1023-0984e66c3e652e64'),
  ('1025', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1025-eb72bac39e33d50e'),
  ('1027', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1027-48fc66eeba1b5643'),
  ('1029', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1029-c1a5bb4c2a40c1eb'),
  ('1031', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1031-4b2a05614c03e90c'),
  ('1033', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1033-5ea0d72763c4e9ac'),
  ('1035', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1035-a62e0900f9312361'),
  ('1037', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1037-ae5e6e0695e8f752'),
  ('1039', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1039-cd45c65bb935987b'),
  ('1041', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1041-5115feb6d3bab8b9'),
  ('1043', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1043-5bf90fcee5f3962f'),
  ('1045', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1045-688a7892bec99559'),
  ('1047', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1047-5c33d00988508fa1'),
  ('1049', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1049-12f4d3fce1d4cceb'),
  ('1051', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1051-50585773981bd29c'),
  ('1053', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1053-01b31ecdce81190a'),
  ('1055', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1055-a3c7eb2f4339ed1f'),
  ('1057', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1057-6ce0efd364dbb64c'),
  ('1059', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1059-28592883818e95d6'),
  ('1061', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1061-2d9db6ceb4fac692'),
  ('1063', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1063-d1a3579d691d0780'),
  ('1065', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1065-c23b25f8fe4775ff'),
  ('1067', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1067-135a780b879852ae'),
  ('2001', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2001-9d3f6afca3ad4872'),
  ('2003', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2003-096f88900f7de6f9'),
  ('2005', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2005-cbdad4c321cdd1b2'),
  ('2007', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2007-dfcbec51fc373fa8'),
  ('2009', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2009-73ed6bd005dd5fa1'),
  ('2011', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2011-49b997400de8a5ad'),
  ('2015', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2015-b3faad2db68aebad'),
  ('2017', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2017-52c683e38abd7447'),
  ('2019', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2019-ad6829a41debbb69'),
  ('2021', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2021-c402cc3e839a4e57'),
  ('2023', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2023-e29f2e7444cffef4'),
  ('2025', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2025-12341ebba3d80514'),
  ('2027', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2027-85ff580610f48599'),
  ('2029', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2029-6478b0dc313f09fd'),
  ('2031', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2031-2eeff28bf7b7ba63'),
  ('2033', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2033-2fa75db9ed085219'),
  ('2035', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2035-4ab82e2830b4da28'),
  ('2037', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2037-864a060f2df274d5'),
  ('2039', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2039-487c78cba9ca0b69'),
  ('2041', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2041-ff65e5222c8a4de3'),
  ('2043', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2043-4698608aefa16824'),
  ('2045', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2045-7aa3f0047a16530a'),
  ('2047', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2047-c7b8dffafd0253a8'),
  ('2049', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2049-84dcc3e7fbec8cd0'),
  ('2051', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2051-f6f3d9dcc2b1d0f6'),
  ('2053', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2053-43c657b65da4995c'),
  ('2055', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2055-f72b62e5330fb6cc'),
  ('2057', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2057-1f026d6ce11314de'),
  ('2059', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2059-273756b89d45b57f'),
  ('2061', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2061-846302ce365c9336'),
  ('2063', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2063-492d44bf05fcf25d'),
  ('2065', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2065-207aa6bd64028559'),
  ('2067', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2067-5c3cfd489bc57479'),
  ('3001', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3001-7dba438bd695e0d6'),
  ('3003', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3003-85b5c6ade77ab108'),
  ('3005', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3005-4f9bf6725f4edd4d'),
  ('3007', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3007-cedd48531aedb132'),
  ('3009', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3009-7d3d93248122fd03'),
  ('3011', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3011-7c21094bd42ba3d1'),
  ('3015', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3015-00ab8dc6c2eecc00'),
  ('3017', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3017-614b23b6aba7747a'),
  ('3019', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3019-88e1c42426b54c39'),
  ('3021', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3021-31fbf052a4de28f5'),
  ('3023', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3023-fd7a52127ce3986f'),
  ('3025', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3025-01f6c3b7e53d934b'),
  ('3027', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3027-ab8e7f0fbd8b171a'),
  ('3029', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3029-916271a5633e7404'),
  ('3031', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3031-ca1faecf1238d002'),
  ('3033', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3033-c525a5f82cbd9b5c'),
  ('3035', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3035-bc5c25772079fafe'),
  ('3037', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3037-b5410b95ab39a969'),
  ('3039', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3039-089dca07fb03f18c'),
  ('3041', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3041-11127970a8990973'),
  ('3043', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3043-c4c3e594bb3b6287'),
  ('3045', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3045-1db3ccdb1b5617b7'),
  ('3047', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3047-07c1dc39582dd3d8'),
  ('3049', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3049-c99e0079cd48aba6'),
  ('3051', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3051-f40607cc5bd4af8c'),
  ('3053', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3053-6e1faec1d99e226a'),
  ('3055', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3055-fecfeb2b335475df'),
  ('3057', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3057-a67f110671c20036'),
  ('3059', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3059-004a24f0a7464340'),
  ('3061', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3061-ce57973853770c38'),
  ('3063', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3063-457f640e4f7cb4fa'),
  ('3065', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3065-6a639db4f35b53ee'),
  ('3067', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3067-54bb73c17ab85964'),
  ('1002', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1002-8835d1ba7b5531f6'),
  ('1004', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1004-de28f5e269528d87'),
  ('1006', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1006-00150728ddb44c58'),
  ('1008', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1008-58f014d643621339'),
  ('1010', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1010-5aedc639876970d4'),
  ('1012', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1012-f35dee44fcc1045e'),
  ('1014', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1014-01fb9f7c7e71ff58'),
  ('1016', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1016-4c83419ca4782266'),
  ('1018', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1018-35cc401cd2c16cd0'),
  ('1020', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1020-672bee14c7074f95'),
  ('1022', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1022-567017b1ae90fd9a'),
  ('1024', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1024-20932c020a1d7f7a'),
  ('1026', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1026-9d760b51c54aebd1'),
  ('1028', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1028-25f3b084264c9f29'),
  ('1030', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1030-db225e78b778dde9'),
  ('1032', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1032-b8b7b3a8aaa671a7'),
  ('1034', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1034-4b99d27a4f6f3990'),
  ('1036', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1036-2d03c657f1c91e5f'),
  ('1038', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1038-7c6af87a32999781'),
  ('1040', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1040-2d49e553f2ccd8a9'),
  ('1042', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1042-7e0ecb251a660fcf'),
  ('1044', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1044-50c8757e8aedb2bb'),
  ('1046', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1046-9b04dcb1c8c6e18d'),
  ('1048', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1048-6d9d35df8d01534c'),
  ('1050', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1050-8f7b498dc8b97ea5'),
  ('1052', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1052-6a471a0bbb3c181d'),
  ('1054', 1, 'BLOCK_A', false, 'CLEAN', 'QR-1054-2aa4e05fece16f1d'),
  ('2002', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2002-b3b117c711c92164'),
  ('2004', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2004-4c7842433817ed08'),
  ('2006', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2006-231f5ea16062794b'),
  ('2008', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2008-462454dc6887b6a3'),
  ('2010', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2010-c682536d1e8aee76'),
  ('2012', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2012-090913593d3abbe3'),
  ('2014', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2014-68bb7ea85aac81f8'),
  ('2016', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2016-bbcc789fb3757258'),
  ('2018', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2018-d682c964a7d1e953'),
  ('2020', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2020-8341dc8fafac5360'),
  ('2022', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2022-2fb35d9ef97f7238'),
  ('2024', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2024-02dd62d935b97505'),
  ('2026', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2026-537ce5378cdd0158'),
  ('2028', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2028-bbab66d4c244a293'),
  ('2030', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2030-082f62ad97745b02'),
  ('2032', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2032-a0a4c065c0458231'),
  ('2034', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2034-d6d7ae71d1efa1d4'),
  ('2036', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2036-312cdce4c2ab51fc'),
  ('2038', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2038-3e1b7700d078ca9e'),
  ('2040', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2040-b8eccafd779be37d'),
  ('2042', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2042-7ebfce0b2b354afa'),
  ('2044', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2044-d7639f1e7fe76184'),
  ('2046', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2046-3f0cadd3282b52e6'),
  ('2048', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2048-7b8192e858366862'),
  ('2050', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2050-bf2ddb5faa6d5c2e'),
  ('2052', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2052-3a70f149bcf970cf'),
  ('2054', 2, 'BLOCK_A', false, 'CLEAN', 'QR-2054-3cd54505d3210eb9'),
  ('3002', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3002-d9659b3860f5f8f3'),
  ('3004', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3004-788d86194774a45d'),
  ('3006', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3006-a920e720b8b38ccf'),
  ('3008', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3008-84840d7676cc834a'),
  ('3010', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3010-0e3b43dc6ccade7b'),
  ('3012', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3012-f8a0e1bf54a5d0aa'),
  ('3014', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3014-e9f2945ed77ddb8b'),
  ('3016', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3016-25044c3a40936a33'),
  ('3018', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3018-904311d48ee2fb70'),
  ('3020', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3020-e6e3692c33425334'),
  ('3022', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3022-3ee82596453ec298'),
  ('3024', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3024-c262e016cca2ec83'),
  ('3026', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3026-b3b2a1c71145e7a2'),
  ('3028', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3028-8b65a54fd796de30'),
  ('3030', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3030-bf70ca17ed4d6d1c'),
  ('3032', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3032-de602a3b5079e270'),
  ('3034', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3034-00a5f16badd4b6ae'),
  ('3036', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3036-beb66db9f42fc4e7'),
  ('3038', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3038-9b1f4de5a8473ad9'),
  ('3040', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3040-5b9c0fcf2858fb11'),
  ('3042', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3042-d852191dd8976703'),
  ('3044', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3044-4fb3f7960bfa0964'),
  ('3046', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3046-d9cca7c5324a0356'),
  ('3048', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3048-da76c1f6109cc586'),
  ('3050', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3050-eaac293e4a410b0f'),
  ('3052', 3, 'BLOCK_A', false, 'CLEAN', 'QR-3052-40652671add7b8fa'),
  ('1071', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1071-aff6021a088ce3e7'),
  ('1073', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1073-3553120065449227'),
  ('1075', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1075-f80ec02a88789e6a'),
  ('1077', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1077-0d6b2703447e2f26'),
  ('1079', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1079-8fa329b491046349'),
  ('1081', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1081-95a4e0ab8b0089c9'),
  ('1083', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1083-2dc71128b33bcdd1'),
  ('1085', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1085-3ec20c2ac0486a66'),
  ('1087', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1087-527966d8fea85a8a'),
  ('1089', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1089-044c4e15a1d6eaa6'),
  ('1091', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1091-90d86d38729556ab'),
  ('1093', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1093-0902daa9ece4a42d'),
  ('1095', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1095-c86924eee7881a3b'),
  ('1097', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1097-75d6c85f83dec4e5'),
  ('1099', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1099-e7e45332d5f030f3'),
  ('1101', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1101-419e2fc299b9e7ce'),
  ('1103', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1103-66bcc4b2e7242950'),
  ('1105', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1105-be541f84909e0951'),
  ('1107', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1107-d652afb264b69705'),
  ('1109', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1109-5cef48c74afba8fd'),
  ('1111', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1111-e41c2b12396584ff'),
  ('1115', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1115-5704284abe04533f'),
  ('1117', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1117-0112b13d815a3e1f'),
  ('1119', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1119-5cc5b69c084aff02'),
  ('1121', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1121-5090f42b7c1971c1'),
  ('1123', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1123-cedddad516f3fb69'),
  ('1125', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1125-3a272a7a9789c3aa'),
  ('1127', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1127-614c85dd3847e61d'),
  ('1129', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1129-9318d8e2ed41222d'),
  ('1131', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1131-0b6a4e63502e2963'),
  ('1133', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1133-278952d53fbba47c'),
  ('1135', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1135-74b51eb71f98c490'),
  ('2071', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2071-5e140089d392eb79'),
  ('2073', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2073-a56ad9be331e2cec'),
  ('2075', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2075-20d998c311d98926'),
  ('2077', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2077-54684895e53894dc'),
  ('2079', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2079-3f59a8400e7b39e4'),
  ('2081', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2081-708538ea1c52f586'),
  ('2083', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2083-f47dbc3b6f7b3066'),
  ('2085', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2085-e597211185e15667'),
  ('2087', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2087-dbf929440c6366b5'),
  ('2089', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2089-eb4c4d698bd0960e'),
  ('2091', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2091-9d43b32997c8f866'),
  ('2093', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2093-6a823ad6fa5a3a26'),
  ('2095', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2095-755edfb1f9e88c8c'),
  ('2097', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2097-957b5e76aa605a46'),
  ('2099', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2099-f844907eda811ebc'),
  ('2101', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2101-a52cbf913f1397ea'),
  ('2103', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2103-ab078286193a8ad1'),
  ('2105', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2105-153497cb3c292060'),
  ('2107', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2107-8079ea5814cd33c3'),
  ('2109', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2109-185188a84d254f97'),
  ('2111', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2111-b11f8dc333aa236c'),
  ('2115', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2115-b51a992836f64ed8'),
  ('2117', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2117-2f478f6418cfa5d3'),
  ('2119', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2119-bfda3c875a6f4761'),
  ('2121', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2121-0867665406063c5b'),
  ('2123', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2123-b4c569c8860359c8'),
  ('2125', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2125-e142244b994cb713'),
  ('2127', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2127-2abbfe7fe027acef'),
  ('2129', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2129-5d8e7a8f1418b2e4'),
  ('2131', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2131-8f4ef721a166b49b'),
  ('2133', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2133-10d30a39733517bc'),
  ('2135', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2135-819e8a79ee2d372f'),
  ('3091', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3091-7564bede218fab7a'),
  ('3093', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3093-22fef96619661d9e'),
  ('3095', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3095-4208dd238cedc26e'),
  ('3097', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3097-e0fa66aacfad49ea'),
  ('3099', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3099-072657c654d21380'),
  ('3101', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3101-201fe76c4e636ec4'),
  ('3103', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3103-a3333dbfab5c0f83'),
  ('3105', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3105-c226705dc84e4e61'),
  ('3107', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3107-8c0d44bd7c7710c8'),
  ('3109', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3109-0f755a8e10a728de'),
  ('3111', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3111-1189afb64943c5c5'),
  ('3115', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3115-ee5a0e4a22430154'),
  ('3117', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3117-342237b9e1d79461'),
  ('3119', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3119-56e527a59aecf03d'),
  ('3121', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3121-dc2873841b777329'),
  ('3123', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3123-029c9969f66fdfe0'),
  ('3125', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3125-3ba2fd43c300b43d'),
  ('3127', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3127-9da7f0602291e7f2'),
  ('3129', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3129-9a1cb251950e1ef0'),
  ('3131', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3131-db151c8777b0d873'),
  ('3133', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3133-583d0d3bcd5c649c'),
  ('1070', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1070-02581abdff765fb4'),
  ('1072', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1072-11c58d726a09bc0b'),
  ('1074', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1074-f1d21fba994c07dc'),
  ('1076', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1076-64157fd4e35caf0f'),
  ('1078', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1078-d63c53fe52e6fdd8'),
  ('1080', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1080-8aa75f6e2e5e6a4a'),
  ('1082', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1082-0edd78fa856d3228'),
  ('1084', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1084-11bff1bc06f90bb8'),
  ('1086', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1086-c3193f8c655eae24'),
  ('1088', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1088-7839367a9e0a0606'),
  ('1090', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1090-65e7d57488a66300'),
  ('1092', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1092-4457c5acbff46cb6'),
  ('1094', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1094-592653e353dc7e14'),
  ('1096', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1096-62eb92461416df85'),
  ('1098', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1098-d26f0fbcad1b58a0'),
  ('1100', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1100-10f2a94ead0caddf'),
  ('1102', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1102-6c1f3c8d6c449a03'),
  ('1104', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1104-256453e5eade515c'),
  ('1106', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1106-44c140773df2c38c'),
  ('1108', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1108-19b49707f05436b3'),
  ('1110', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1110-4da720c66e30ded0'),
  ('1112', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1112-065bce06857bca49'),
  ('1114', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1114-98109dc670c62258'),
  ('1116', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1116-2bbe19b3461894e2'),
  ('1118', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1118-152af79218c4d83e'),
  ('1120', 1, 'BLOCK_B', false, 'CLEAN', 'QR-1120-65d9f9410508429e'),
  ('2070', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2070-7d6239aef0ffc012'),
  ('2072', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2072-4905daa32a3fc974'),
  ('2074', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2074-94ec1904b910e785'),
  ('2076', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2076-fbc677246c75c9d8'),
  ('2078', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2078-c26f8eb19bb91ef3'),
  ('2080', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2080-96db11deb6ce17ad'),
  ('2082', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2082-00104f5a25e60e6a'),
  ('2084', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2084-2c0bbda0e3f1fdb0'),
  ('2086', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2086-1ce2ad20b536e5b8'),
  ('2088', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2088-40436f14883bccce'),
  ('2090', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2090-b9b610c8c21799cd'),
  ('2092', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2092-2d74e1463ebfe5ee'),
  ('2094', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2094-16f81ffdd4355230'),
  ('2096', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2096-5dc6e4152e19d92f'),
  ('2098', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2098-766f41f1fa91b90a'),
  ('2100', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2100-14cff406a4eb7212'),
  ('2102', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2102-cf0154e721753c7a'),
  ('2104', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2104-da8e67ec8e03d8d3'),
  ('2106', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2106-8ee328a7cb301671'),
  ('2108', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2108-eafe6cc2c07a86fd'),
  ('2110', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2110-98c001f136ebd1ad'),
  ('2112', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2112-9dd90915b8dc3b57'),
  ('2114', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2114-10995fe93fff2e0c'),
  ('2116', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2116-b8924b8a05b48827'),
  ('2118', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2118-02a5199685aab25b'),
  ('2120', 2, 'BLOCK_B', false, 'CLEAN', 'QR-2120-132ddbbfd4f1af4a'),
  ('3070', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3070-c6b91e4829841499'),
  ('3072', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3072-914bcbfc90c0a6a9'),
  ('3074', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3074-136d6a4a91f6f3d7'),
  ('3076', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3076-513a6fbeecaa658e'),
  ('3078', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3078-e2f8bbd6d420411b'),
  ('3080', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3080-6e03d687239ddce2'),
  ('3082', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3082-c5bc72e1527cf16d'),
  ('3084', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3084-99d73e68a763d115'),
  ('3086', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3086-1320400a40e20cf8'),
  ('3088', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3088-4a3f803f51c80dee'),
  ('3090', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3090-dd417e527914e07a'),
  ('3092', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3092-e1abd50afe2361eb'),
  ('3094', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3094-5186f4a7a80a0274'),
  ('3096', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3096-6233d804bb03eb48'),
  ('3098', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3098-9a1c2de6fd2a0d77'),
  ('3100', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3100-7d169adad89fdafa'),
  ('3102', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3102-03dd3ceb33a5e783'),
  ('3104', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3104-434bd5e9f6c1cc3a'),
  ('3106', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3106-e9e5e4c47f679cbc'),
  ('3108', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3108-ca881f3f76233d97'),
  ('3110', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3110-912fe4ba0fc50c64'),
  ('3112', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3112-04124361c74d4eb3'),
  ('3114', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3114-6d2296ed3c9ef411'),
  ('3116', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3116-8cd1b8dc4bccb188'),
  ('3118', 3, 'BLOCK_B', false, 'CLEAN', 'QR-3118-bd9dcbb44afef5fc')
on conflict (room_number) do update set
  floor = excluded.floor,
  block = excluded.block,
  is_occupied = excluded.is_occupied,
  cleaning_status = excluded.cleaning_status,
  qr_code_hash = excluded.qr_code_hash;

-- =====================================================================
-- 7. SEED DATA: SAMPLE STAFF MEMBERS
-- =====================================================================
insert into public.staff (full_name, role, department, phone_number, shift_status)
values
  ('Alice Moreau', 'manager', 'MANAGEMENT', '+33 6 12 34 56 78', 'ON_SHIFT'),
  ('Karim Benali', 'receptionist', 'RECEPTION', '+33 6 23 45 67 89', 'ON_SHIFT'),
  ('Elena Rostova', 'governance', 'HOUSEKEEPING', '+33 6 34 56 78 90', 'ON_SHIFT'),
  ('David Laurent', 'maintenance', 'TECHNICAL', '+33 6 45 67 89 01', 'ON_SHIFT'),
  ('Samira Mansour', 'master', 'MANAGEMENT', '+33 6 56 78 90 12', 'OFF_SHIFT');

-- =====================================================================
-- 8. SEED DATA: SAMPLE RESIDENTS & RECLAMATIONS (Connected by Foreign Keys)
-- =====================================================================
do $$
declare
  v_room_id bigint;
  v_resident_id bigint;
  v_receptionist_id bigint;
  v_tech_id bigint;
  v_housekeeper_id bigint;
begin
  select id into v_room_id from public.rooms where room_number = '1001' limit 1;
  select id into v_receptionist_id from public.staff where role = 'receptionist' limit 1;
  select id into v_tech_id from public.staff where role = 'maintenance' limit 1;
  select id into v_housekeeper_id from public.staff where role = 'governance' limit 1;

  if v_room_id is not null then
    -- Mark room 1001 as occupied
    update public.rooms set is_occupied = true where id = v_room_id;

    -- Add resident
    insert into public.residents (room_id, first_name, last_name, phone_number, check_in_date, status)
    values (v_room_id, 'Jean', 'Dupont', '+33 7 89 01 23 45', now() - interval '2 days', 'ACTIVE')
    returning id into v_resident_id;

    -- Add sample reclamation 1: A/C maintenance
    insert into public.reclamations (
      room_id, resident_id, created_by_staff_id, assigned_staff_id,
      department, category, description, priority, status
    ) values (
      v_room_id, v_resident_id, v_receptionist_id, v_tech_id,
      'MAINTENANCE', 'A/C', 'Air conditioner is making unusual noise and cooling slowly.', 'HIGH', 'IN_PROGRESS'
    );

    -- Add sample reclamation 2: Extra towels (Governance)
    insert into public.reclamations (
      room_id, resident_id, created_by_staff_id, assigned_staff_id,
      department, category, description, priority, status
    ) values (
      v_room_id, v_resident_id, v_receptionist_id, v_housekeeper_id,
      'GOVERNANCE', 'Towels', 'Resident requested 2 extra bath towels and toiletries.', 'STANDARD', 'OPEN'
    );
  end if;
end $$;
