/**
 * Shared by the account scripts (create_account.mjs, seed_demo_accounts.mjs).
 * Same rules as the app (lib/accounts.ts, app/admin/actions.ts): keep them in step.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, read from .env.local
 * (gitignored) then .env. The secret key never goes in the committed .env.
 */
import { existsSync, readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const ROLES = ["reception", "rh", "gm", "admin"];
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const AUTH_EMAIL_DOMAIN = "staff.hotel-ses.local";
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

export function adminClient() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (put the secret key in .env.local).");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 12 characters, letters and digits, nothing ambiguous to read aloud. */
export function temporaryPassword() {
  for (;;) {
    const value = Array.from({ length: 12 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
    if (/[a-zA-Z]/.test(value) && /\d/.test(value)) return value;
  }
}

/**
 * Creates an Auth user + profile with a temporary password (changed at first sign-in).
 * Returns { created: true, password } or { created: false, reason }.
 */
export async function createAccount(admin, { username, role, displayName, staffId = null }) {
  username = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) return { created: false, reason: `invalid username "${username}"` };
  if (!ROLES.includes(role)) return { created: false, reason: `invalid role "${role}" (${ROLES.join(", ")})` };

  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { created: false, reason: `username "${username}" already exists` };

  const password = temporaryPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@${AUTH_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    app_metadata: { role, username, must_change_password: true },
    user_metadata: { display_name: displayName },
  });
  if (error) return { created: false, reason: error.message };

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, username, display_name: displayName, role, staff_id: staffId, is_active: true, must_change_password: true });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { created: false, reason: profileError.message };
  }
  return { created: true, password };
}
