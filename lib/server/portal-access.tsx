import type { ReactElement } from "react";
import AccessDenied from "@/app/components/AccessDenied";
import { canOpen, type PortalRole } from "@/lib/portals";
import { getPortalRole } from "./session";

/**
 * Checked first in every portal page, before any data is loaded: null when the
 * signed-in account may open this portal (its own, or any for the admin),
 * otherwise the "No access" screen to render instead.
 * (The proxy redirects mismatches already; this keeps the page safe on its own.)
 */
export async function denyUnlessPortal(role: PortalRole): Promise<ReactElement | null> {
  const current = await getPortalRole();
  return canOpen(current, role) ? null : <AccessDenied requiredRole={role} currentRole={current} />;
}
