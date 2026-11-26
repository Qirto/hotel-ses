import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRole, type Role } from "@/lib/roles";
import { can, type Capability } from "@/lib/permissions";
import { canOpenPath, homeFor } from "@/lib/routes";

export interface Session {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

/**
 * The signed-in account, or null. Verified, not just read: getClaims() checks the
 * JWT signature. The role comes from app_metadata, which only the server (secret
 * key) can write. Cached per request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) return null;
  const app = (claims.app_metadata ?? {}) as Record<string, unknown>;
  const role = app.role;
  if (!isRole(role)) return null;
  return {
    userId: claims.sub,
    username: String(app.username ?? ""),
    displayName: String((claims.user_metadata as Record<string, unknown> | undefined)?.display_name ?? app.username ?? ""),
    role,
    mustChangePassword: app.must_change_password === true,
  };
});

/**
 * First line of every page in the app: the session, or a redirect (to /login, or to
 * the role's home when the role may not open `path`). The proxy does the same
 * check; this keeps each page safe on its own.
 */
export async function requireRoute(path: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canOpenPath(session.role, path)) redirect(homeFor(session.role));
  return session;
}

/** Standard refusal returned by a server action called without the right capability. */
export const NOT_ALLOWED = { success: false as const, error: "Action non autorisée pour votre compte." };

/**
 * First line of every server action: null when the caller has the capability (see
 * lib/permissions.ts), otherwise the refusal to return. Refused too while the
 * account still has a temporary password.
 *   const denied = await deny("requests.delete"); if (denied) return denied;
 */
export async function deny(capability: Capability): Promise<typeof NOT_ALLOWED | null> {
  const session = await getSession();
  if (!session || session.mustChangePassword) return NOT_ALLOWED;
  return can(session.role, capability) ? null : NOT_ALLOWED;
}
