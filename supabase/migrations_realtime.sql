-- =====================================================================
-- MIGRATION: live updates (Supabase Realtime)
--
-- The portals refresh when rooms, requests, staff or services change. Supabase only
-- streams changes of tables in the `supabase_realtime` publication; on 2026-11-26
-- none of these four were in it (no event reached any subscriber, even with the
-- secret key). Re-runnable: adds only the tables that are missing.
-- Each subscriber still only receives rows its role may read (migrations_accounts.sql).
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['rooms', 'reclamations', 'staff', 'departments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
