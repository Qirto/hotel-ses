import { cookies } from "next/headers";
import { isPortalRole, ROLE_COOKIE, type PortalRole } from "@/lib/portals";

/** The signed-in portal role from the session cookie, or null. Server only. */
export async function getPortalRole(): Promise<PortalRole | null> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value;
  return isPortalRole(value) ? value : null;
}
