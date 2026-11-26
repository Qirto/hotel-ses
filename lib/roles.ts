/**
 * Account roles. A role decides which pages and actions an account has (see
 * lib/permissions.ts); it is stored in the signed session (app_metadata.role).
 * Plain module: used by the proxy, server pages and client components.
 */

export const ROLES = ["reception", "rh", "gm", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Role for people (account lists, settings). */
export const ROLE_LABEL: Record<Role, string> = {
  reception: "Réception",
  rh: "Ressources humaines",
  gm: "Direction",
  admin: "Administrateur",
};

/** Short code shown with the brand in the shell, and its accent. */
export const ROLE_BADGE: Record<Role, { code: string; tone: "muted" | "success" | "special" }> = {
  reception: { code: "Réception", tone: "muted" },
  rh: { code: "RH", tone: "success" },
  gm: { code: "Direction", tone: "muted" },
  admin: { code: "Admin", tone: "special" },
};

export const HOTEL_NAME = "Hôtel Méditerranée Thalasso Golf Hammamet";
