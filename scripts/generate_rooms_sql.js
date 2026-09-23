const fs = require('fs');
const path = require('path');

function generateRooms() {
  const rooms = [];

  // ----------------------------------------------------
  // BLOCK A
  // ----------------------------------------------------
  // Right side: odd numbers, skipping rooms ending in 13
  // Ground floor: 1001 - 1067
  // First floor:  2001 - 2067
  // Second floor: 3001 - 3067
  const blockARightFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1001, end: 1067 },
    { floorName: 'First Floor', level: 1, start: 2001, end: 2067 },
    { floorName: 'Second Floor', level: 2, start: 3001, end: 3067 },
  ];

  for (const f of blockARightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          roomNumber: n.toString(),
          block: 'A',
          floorLevel: f.level,
          floorName: f.floorName,
          side: 'Right',
        });
      }
    }
  }

  // Left side: even numbers
  // Ground floor: 1002 - 1054
  // First floor:  2002 - 2054
  // Second floor: 3002 - 3052
  const blockALeftFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1002, end: 1054 },
    { floorName: 'First Floor', level: 1, start: 2002, end: 2054 },
    { floorName: 'Second Floor', level: 2, start: 3002, end: 3052 },
  ];

  for (const f of blockALeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          roomNumber: n.toString(),
          block: 'A',
          floorLevel: f.level,
          floorName: f.floorName,
          side: 'Left',
        });
      }
    }
  }

  // ----------------------------------------------------
  // BLOCK B
  // ----------------------------------------------------
  // Left side: odd numbers
  // Ground floor: 1071 - 1135
  // First floor:  2071 - 2135
  // Second floor: 3091 - 3133
  const blockBLeftFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1071, end: 1135 },
    { floorName: 'First Floor', level: 1, start: 2071, end: 2135 },
    { floorName: 'Second Floor', level: 2, start: 3091, end: 3133 },
  ];

  for (const f of blockBLeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          roomNumber: n.toString(),
          block: 'B',
          floorLevel: f.level,
          floorName: f.floorName,
          side: 'Left',
        });
      }
    }
  }

  // Other side (Right): even numbers
  // Ground floor: 1070 - 1120
  // First floor:  2070 - 2120
  // Second floor: 3070 - 3118
  const blockBRightFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1070, end: 1120 },
    { floorName: 'First Floor', level: 1, start: 2070, end: 2120 },
    { floorName: 'Second Floor', level: 2, start: 3070, end: 3118 },
  ];

  for (const f of blockBRightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          roomNumber: n.toString(),
          block: 'B',
          floorLevel: f.level,
          floorName: f.floorName,
          side: 'Right',
        });
      }
    }
  }

  return rooms;
}

const rooms = generateRooms();

const header = `-- =====================================================================
-- HOTEL ROOMS DATABASE SCHEMA & SEED DATA (SUPABASE / POSTGRESQL)
-- 
-- Hotel Configuration:
--   Blocks: A and B
--   Levels: Ground Floor (0), First Floor (1), Second Floor (2)
--   Total Rooms: ${rooms.length}
--   Skipped Rooms: All room numbers ending in 13 (e.g. 1013, 2013, 3013, 1113, 2113, 3113)
-- =====================================================================

-- 1. Create table public.rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique,
  block text not null check (block in ('A', 'B')),
  floor_level smallint not null check (floor_level in (0, 1, 2)),
  floor_name text not null,
  side text not null check (side in ('Left', 'Right')),
  room_type text not null default 'Standard' check (room_type in ('Standard', 'Deluxe', 'Suite')),
  status text not null default 'available' check (status in ('available', 'occupied', 'reserved', 'maintenance', 'cleaning')),
  price_per_night numeric(10, 2) not null default 100.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Performance indexes
create index if not exists idx_rooms_block on public.rooms (block);
create index if not exists idx_rooms_floor_level on public.rooms (floor_level);
create index if not exists idx_rooms_status on public.rooms (status);
create index if not exists idx_rooms_block_floor on public.rooms (block, floor_level);
create index if not exists idx_rooms_side on public.rooms (side);

-- 3. Row Level Security (RLS)
alter table public.rooms enable row level security;

-- Policy: Allow read access to all users (public)
drop policy if exists "Allow public read access to rooms" on public.rooms;
create policy "Allow public read access to rooms"
  on public.rooms for select
  using (true);

-- Policy: Allow full modifications for authenticated users
drop policy if exists "Allow full access to authenticated users" on public.rooms;
create policy "Allow full access to authenticated users"
  on public.rooms for all
  to authenticated
  using (true)
  with check (true);

-- 4. Seed Data: All 341 Hotel Rooms
insert into public.rooms (room_number, block, floor_level, floor_name, side, room_type, status, price_per_night)
values
`;

const rows = rooms.map(r => {
  let type = 'Standard';
  let price = 100.00;
  if (r.floorLevel === 2) {
    type = 'Deluxe';
    price = 140.00;
  }
  return `  ('${r.roomNumber}', '${r.block}', ${r.floorLevel}, '${r.floorName}', '${r.side}', '${type}', 'available', ${price.toFixed(2)})`;
}).join(',\n');

const footer = `
on conflict (room_number) do update set
  block = excluded.block,
  floor_level = excluded.floor_level,
  floor_name = excluded.floor_name,
  side = excluded.side,
  updated_at = now();
`;

const fullSql = header + rows + footer;

const supabaseDir = path.join(__dirname, '..', 'supabase');
if (!fs.existsSync(supabaseDir)) {
  fs.mkdirSync(supabaseDir, { recursive: true });
}

const outputPath = path.join(supabaseDir, 'hotel_rooms.sql');
fs.writeFileSync(outputPath, fullSql, 'utf-8');

console.log(`Generated ${outputPath} with ${rooms.length} hotel rooms successfully.`);
