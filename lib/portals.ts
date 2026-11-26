/**
 * The three portals, defined once: route, how they are named in the shell and on
 * the settings page, and their accent. Role keys match the `hotel_role` cookie.
 * (No "use client": used by server pages too.)
 */

export type PortalRole = "reception" | "rh" | "gm";

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
};

export const isPortalRole = (value: unknown): value is PortalRole => value === "reception" || value === "rh" || value === "gm";

export const HOTEL_NAME = "Hôtel Méditerranée Thalasso Golf Hammamet";

/** Name of the cookie holding the signed-in portal role. */
export const ROLE_COOKIE = "hotel_role";
