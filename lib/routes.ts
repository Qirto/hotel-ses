import { can, type Capability } from "./permissions";
import type { Role } from "./roles";

/**
 * The app's pages, one table: who may open each one (by capability) and how it
 * appears in the menu. Read by the proxy, the pages (requireRoute) and the shell.
 * Plain data (no React): the proxy imports it.
 */

export type NavIcon = "dashboard" | "rooms" | "requests" | "staff" | "analytics" | "accounts" | "inventory";

export interface AppRoute {
  path: string;
  capability: Capability;
  /** In the menu when set. `group: "admin"` puts it under « Administration », apart from daily work. */
  nav?: { label: string; shortLabel?: string; icon: NavIcon; badge?: "attention" | "open"; group?: "admin" };
}

export const ROUTES: AppRoute[] = [
  { path: "/dashboard", capability: "dashboard.view", nav: { label: "Tableau de bord", shortLabel: "Accueil", icon: "dashboard" } },
  { path: "/rooms", capability: "rooms.view", nav: { label: "Chambres", icon: "rooms", badge: "attention" } },
  { path: "/requests", capability: "requests.view", nav: { label: "Demandes", icon: "requests", badge: "open" } },
  { path: "/staff", capability: "staff.manage", nav: { label: "Personnel", icon: "staff" } },
  { path: "/analytics", capability: "analytics.view", nav: { label: "Analyses", icon: "analytics" } },
  { path: "/admin/accounts", capability: "accounts.manage", nav: { label: "Comptes", icon: "accounts", group: "admin" } },
  { path: "/admin/rooms", capability: "rooms.inventory", nav: { label: "Parc des chambres", shortLabel: "Parc", icon: "inventory", group: "admin" } },
];

/** Pages any signed-in account may open. */
export const ACCOUNT_PATHS = ["/settings", "/account"];
export const PASSWORD_PATH = "/account/password";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** The route a path belongs to (longest matching prefix), or undefined. */
export function routeFor(pathname: string): AppRoute | undefined {
  return ROUTES.filter((r) => under(pathname, r.path)).sort((a, b) => b.path.length - a.path.length)[0];
}

/** Whether a signed-in role may open a path; unknown paths are left to Next (404). */
export function canOpenPath(role: Role, pathname: string): boolean {
  if (ACCOUNT_PATHS.some((p) => under(pathname, p))) return true;
  const route = routeFor(pathname);
  return route ? can(role, route.capability) : true;
}

/** Where a role lands after signing in (and when it opens a page it may not). */
export function homeFor(role: Role): string {
  return can(role, "dashboard.view") ? "/dashboard" : can(role, "staff.manage") ? "/staff" : "/rooms";
}

/** The menu of a role: allowed pages in table order, its home page first (RH lands on Personnel). */
export function navFor(role: Role): AppRoute[] {
  const home = homeFor(role);
  const routes = ROUTES.filter((r) => r.nav && can(role, r.capability));
  return [...routes.filter((r) => r.path === home), ...routes.filter((r) => r.path !== home)];
}
