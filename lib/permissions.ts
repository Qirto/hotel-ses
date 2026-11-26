import type { Role } from "./roles";

/**
 * Who can do what: the single source for the proxy (lib/routes.ts), the pages, the
 * menus, the buttons and the server actions (deny(capability)). The admin has every
 * capability. The database rules (supabase/migrations_accounts.sql) are a coarser
 * backstop of the same split.
 */
const RULES = {
  // pages
  "dashboard.view": ["reception", "gm"],
  "analytics.view": ["reception", "rh", "gm"],
  "analytics.rooms": ["gm"], // room patterns (rush hour, repeat problems)
  "analytics.staff": ["rh"], // headcount by service

  // rooms
  "rooms.view": ["reception", "rh", "gm"],
  "rooms.stay": ["reception"], // check-in / check-out
  "rooms.headcount": ["reception"],
  "rooms.cleaning": ["reception", "rh", "gm"],
  "rooms.inventory": [], // add / renumber / delete rooms

  // requests
  "requests.view": ["reception", "rh", "gm"],
  "requests.create": ["reception", "rh", "gm"], // from a room, or a past incident
  "requests.dispatch": ["reception"], // front desk: « Créer la demande » everywhere
  "requests.acknowledge": ["reception"],
  "requests.resolve": ["reception", "gm"],
  "requests.edit": ["reception", "gm"],
  "requests.delete": ["reception", "gm"],

  // people
  "staff.manage": ["rh"], // directory, shifts, absences
  "departments.manage": ["rh"],
  "accounts.manage": [],
} as const satisfies Record<string, readonly Exclude<Role, "admin">[]>;

export type Capability = keyof typeof RULES;

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return role === "admin" || (RULES[capability] as readonly Role[]).includes(role);
}
