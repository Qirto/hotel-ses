-- =====================================================================
-- MIGRATION: Departments CRUD Table & Cross-Hotel Operations
-- =====================================================================

-- 1. Create departments table with full CRUD fields
create table if not exists public.departments (
  id bigint generated always as identity primary key,
  code text unique not null,
  name text not null,
  icon text not null default '🏢',
  description text,
  head_of_department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS and setup permissive policies for hotel system
alter table public.departments enable row level security;
drop policy if exists "Allow read access to departments" on public.departments;
drop policy if exists "Allow all access to departments" on public.departments;

create policy "Allow read access to departments" on public.departments for select using (true);
create policy "Allow all access to departments" on public.departments for all using (true) with check (true);

-- 3. Seed all core hotel operational departments
insert into public.departments (code, name, icon, description, head_of_department)
values
  ('RECEPTION', 'Reception & Front Desk', '🛎️', 'Guest check-in/out, switchboard, inquiries and concierge dispatches', 'Sophie Mercier'),
  ('HOUSEKEEPING', 'Housekeeping & Gouvernante', '🧹', 'Room cleaning, linen management, amenity restocking and floor inspections', 'Martine Aubry'),
  ('TECHNICAL', 'Technical & Maintenance', '🔧', 'Plumbing, electrical, HVAC, fixtures and preventive facilities maintenance', 'Pierre Dubois'),
  ('FOOD_AND_BEVERAGE', 'Food & Beverage (F&B)', '🍽️', 'Kitchen, restaurants, banquets, room service and bars', 'Chef Antoine Girard'),
  ('MANAGEMENT', 'Executive & General Management', '👔', 'Hotel operations oversight, executive decisions, VIP relations and strategy', 'Jean-Paul Bonnet'),
  ('SECURITY', 'Security & Safety', '🛡️', 'Premises surveillance, access control, keycards, guest safety and emergency protocols', 'Marc Lambert'),
  ('CONCIERGE', 'Concierge & Guest Relations', '🚗', 'Valet parking, luggage handling, excursions, transport and VIP guest assistance', 'Lucie Moreau'),
  ('SPA_AND_WELLNESS', 'Spa, Wellness & Fitness', '🧖', 'Massage treatments, thermal baths, sauna, gym and wellness therapies', 'Camille Roux'),
  ('SALES_AND_MARKETING', 'Sales, Marketing & Events', '📈', 'Group bookings, corporate events, weddings, digital marketing and PR', 'Helene Fontaine'),
  ('FINANCE_AND_ACCOUNTING', 'Finance, Accounting & Audit', '💳', 'Night audit, billing, purchasing, payroll and revenue management', 'Bernard Leroy'),
  ('HUMAN_RESOURCES', 'Human Resources (HR)', '👥', 'Recruitment, employee onboarding, scheduling, payroll and training', 'Claire Delacroix')
on conflict (code) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  head_of_department = excluded.head_of_department;

-- 4. Drop restrictive reclamation department check constraint so any department can receive requests/tickets
alter table public.reclamations drop constraint if exists reclamations_department_check;
