import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isPortalRole, type PortalRole } from "@/lib/portals";

export interface Session {
  userId: string;
  username: string;
  displayName: string;
  role: PortalRole;
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
  if (!isPortalRole(role)) return null;
  return {
    userId: claims.sub,
    username: String(app.username ?? ""),
    displayName: String((claims.user_metadata as Record<string, unknown> | undefined)?.display_name ?? app.username ?? ""),
    role,
    mustChangePassword: app.must_change_password === true,
  };
});

/** The signed-in role, or null. */
export async function getPortalRole(): Promise<PortalRole | null> {
  return (await getSession())?.role ?? null;
}

/** Standard refusal returned by a server action called without the right role. */
export const NOT_ALLOWED = { success: false as const, error: "Action non autorisée pour votre compte." };

/**
 * First line of every server action: null when the caller's role is allowed,
 * otherwise the refusal to return. The admin is allowed everywhere.
 *   const denied = await deny(["rh"]); if (denied) return denied;
 */
export async function deny(roles: readonly PortalRole[]): Promise<typeof NOT_ALLOWED | null> {
  const session = await getSession();
  if (!session || session.mustChangePassword) return NOT_ALLOWED;
  return session.role === "admin" || roles.includes(session.role) ? null : NOT_ALLOWED;
}
