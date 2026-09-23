-- =====================================================================
-- MIGRATION: Expand Staff Departments & Roles to Support All Hotel Departments
-- =====================================================================

-- 1. Remove restrictive department check constraint on staff
alter table public.staff drop constraint if exists staff_department_check;

-- 2. Remove restrictive role check constraint on staff to allow departmental titles (Chef, Concierge, Security Officer, etc.)
alter table public.staff drop constraint if exists staff_role_check;
