import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PortalRole } from "@/lib/portals";

/** An account as the Administration screens show it. */
export interface Account {
  id: string;
  username: string;
  display_name: string;
  role: PortalRole;
  staff_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

/**
 * Every account with its last sign-in (from Supabase Auth). Admin pages only: it
 * uses the secret key. Throws when a source fails, so the page shows its error state
 * instead of an empty list that would look real.
 */
export async function loadAccounts(): Promise<Account[]> {
  const admin = createAdminClient();
  const [{ data: profiles, error }, { data: users, error: usersError }] = await Promise.all([
    admin.from("profiles").select("*").order("username"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) throw new Error(`Could not load accounts: ${error.message}`);
  if (usersError) throw new Error(`Could not load sign-in history: ${usersError.message}`);
  const lastSignIn = new Map(users.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
  return (profiles ?? []).map((p) => ({ ...(p as Omit<Account, "last_sign_in_at">), last_sign_in_at: lastSignIn.get(p.id) ?? null }));
}
