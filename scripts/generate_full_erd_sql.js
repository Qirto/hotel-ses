const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateAllRooms() {
  const rooms = [];

  // ====================================================
  // BLOCK A
  // ====================================================
  // Right side: odd numbers (1001-1067, 2001-2067, 3001-3067), skip ending in 13
  const blockARightFloors = [
    { floor: 1, start: 1001, end: 1067 },
    { floor: 2, start: 2001, end: 2067 },
    { floor: 3, start: 3001, end: 3067 },
  ];

  for (const f of blockARightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        const qrHash = crypto.createHash('sha256').update(`HOTEL_DOOR_${roomNum}_BLOCK_A`).digest('hex').slice(0, 16);
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: 'BLOCK_A',
          is_occupied: false,
          cleaning_status: 'CLEAN',
          qr_code_hash: `QR-${roomNum}-${qrHash}`,
        });
      }
    }
  }

  // Left side: even numbers (1002-1054, 2002-2054, 3002-3052), skip ending in 13
  const blockALeftFloors = [
    { floor: 1, start: 1002, end: 1054 },
    { floor: 2, start: 2002, end: 2054 },
    { floor: 3, start: 3002, end: 3052 },
  ];

  for (const f of blockALeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        const qrHash = crypto.createHash('sha256').update(`HOTEL_DOOR_${roomNum}_BLOCK_A`).digest('hex').slice(0, 16);
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: 'BLOCK_A',
          is_occupied: false,
          cleaning_status: 'CLEAN',
          qr_code_hash: `QR-${roomNum}-${qrHash}`,
        });
      }
    }
  }

  // ====================================================
  // BLOCK B
  // ====================================================
  // Left side: odd numbers (1071-1135, 2071-2135, 3091-3133), skip ending in 13
  const blockBLeftFloors = [
    { floor: 1, start: 1071, end: 1135 },
    { floor: 2, start: 2071, end: 2135 },
    { floor: 3, start: 3091, end: 3133 },
  ];

  for (const f of blockBLeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        const qrHash = crypto.createHash('sha256').update(`HOTEL_DOOR_${roomNum}_BLOCK_B`).digest('hex').slice(0, 16);
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: 'BLOCK_B',
          is_occupied: false,
          cleaning_status: 'CLEAN',
          qr_code_hash: `QR-${roomNum}-${qrHash}`,
        });
      }
    }
  }

  // Right side: even numbers (1070-1120, 2070-2120, 3070-3118), skip ending in 13
  const blockBRightFloors = [
    { floor: 1, start: 1070, end: 1120 },
    { floor: 2, start: 2070, end: 2120 },
    { floor: 3, start: 3070, end: 3118 },
  ];

  for (const f of blockBRightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        const qrHash = crypto.createHash('sha256').update(`HOTEL_DOOR_${roomNum}_BLOCK_B`).digest('hex').slice(0, 16);
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: 'BLOCK_B',
          is_occupied: false,
          cleaning_status: 'CLEAN',
          qr_code_hash: `QR-${roomNum}-${qrHash}`,
        });
      }
    }
  }

  return rooms;
}

const rooms = generateAllRooms();

const sqlContent = `-- =====================================================================
-- HOTEL MANAGEMENT DATABASE SCHEMA (ERD) & 341-ROOM SEED
-- Tables: ROOMS, RESIDENTS, STAFF, RECLAMATIONS
-- Price column has been removed.
-- Total Rooms: ${rooms.length} (Skipping all rooms ending with 13)
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
` + rooms.map(r => `  ('${r.room_number}', ${r.floor}, '${r.block}', ${r.is_occupied}, '${r.cleaning_status}', '${r.qr_code_hash}')`).join(',\n') + `
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
`;

const outputPath = path.join(__dirname, '..', 'supabase', 'hotel_rooms.sql');
fs.writeFileSync(outputPath, sqlContent, 'utf-8');
console.log(`Generated complete ERD schema and seed in ${outputPath} with ${rooms.length} rooms.`);
