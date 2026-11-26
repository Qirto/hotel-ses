import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the secret key: bypasses row-level security and can manage
 * Auth users. Server only (the "server-only" import fails the build if a client
 * component ever imports this). Used for account management and nothing else.
 *
 * SUPABASE_SECRET_KEY lives in .env.local (gitignored) and the host's environment,
 * never in the committed .env.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not set on the server (see README, Accounts).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
