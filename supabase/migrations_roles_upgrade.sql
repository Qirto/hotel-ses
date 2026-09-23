-- =====================================================================
-- MIGRATION: 5-Role Hotel Operations Upgrade
-- Adding guest headcounts, staff skill tags, presence, confidential flags, SLA
-- =====================================================================

-- 1. Update rooms table
alter table public.rooms
  add column if not exists adult_count int not null default 0,
  add column if not exists child_count int not null default 0;

-- 2. Update staff table
alter table public.staff
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists is_present boolean not null default true,
  add column if not exists last_clock_in timestamptz default now();

-- Seed initial skill tags on existing technical staff
update public.staff
set skill_tags = array['Electrical', 'HVAC']
where role = 'maintenance' and full_name = 'David Laurent';

update public.staff
set skill_tags = array['General', 'Plumbing']
where role = 'maintenance' and full_name != 'David Laurent';

-- 3. Update reclamations table
alter table public.reclamations
  add column if not exists is_confidential boolean not null default false,
  add column if not exists sla_deadline timestamptz default (now() + interval '30 minutes');

-- Ensure RLS allows all read/write for demo operations
create index if not exists idx_reclamations_confidential on public.reclamations(is_confidential);
create index if not exists idx_staff_presence on public.staff(is_present);
