/**
 * The portals, defined once: route, how they are named in the shell and on the
 * settings page, and their accent. A portal's key is also the account role that
 * owns it (stored in the signed session: app_metadata.role).
 * (No "use client": used by server pages and the proxy too.)
 */

export type PortalRole = "reception" | "rh" | "gm" | "admin";

/** Accent of the portal's short code chip. */
export type PortalTone = "brand" | "success" | "special";

export interface Portal {
  role: PortalRole;
  path: `/${PortalRole}`;
  /** Short code shown in the shell header, e.g. "DG". */
  code: string;
  /** Full name, e.g. "Direction générale". */
  name: string;
  tone: PortalTone;
}

export const PORTALS: Record<PortalRole, Portal> = {
  reception: { role: "reception", path: "/reception", code: "Réception", name: "Réception", tone: "brand" },
  rh: { role: "rh", path: "/rh", code: "RH", name: "Ressources humaines", tone: "success" },
  gm: { role: "gm", path: "/gm", code: "DG", name: "Direction générale", tone: "brand" },
  admin: { role: "admin", path: "/admin", code: "Admin", name: "Administration", tone: "special" },
};

export const PORTAL_ROLES = Object.keys(PORTALS) as PortalRole[];

export const isPortalRole = (value: unknown): value is PortalRole => typeof value === "string" && value in PORTALS;

/** The admin opens every portal; every other role opens only its own. */
export const canOpen = (role: PortalRole | null | undefined, portal: PortalRole) => role === "admin" || role === portal;

/** Label of a role for people (account lists, settings). */
export const ROLE_LABEL: Record<PortalRole, string> = {
  reception: "Réception",
  rh: "Ressources humaines",
  gm: "Direction",
  admin: "Administrateur",
};

export const HOTEL_NAME = "Hôtel Méditerranée Thalasso Golf Hammamet";
