import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { canOpen, isPortalRole, PORTALS } from "@/lib/portals";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Where a signed-in account must change its temporary password. */
const PASSWORD_PAGE = "/compte/mot-de-passe";

/**
 * Every request: refresh the Supabase session, verify it (getClaims checks the JWT
 * signature) and gate the routes by role. Pages and server actions check again on
 * their own; this only keeps people out of screens they cannot use.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response, redirect } = createClient(request);

  const { data } = await supabase.auth.getClaims();
  const app = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const role = isPortalRole(app.role) ? app.role : null;
  const mustChangePassword = role !== null && app.must_change_password === true;

  // Signed-in: the login page sends you to your space.
  if (pathname === "/login") return role ? redirect(mustChangePassword ? PASSWORD_PAGE : PORTALS[role].path) : response();

  // A temporary password is changed before anything else.
  if (mustChangePassword && !under(pathname, PASSWORD_PAGE)) return redirect(PASSWORD_PAGE);

  // A portal: its own role, or the admin.
  const portal = Object.values(PORTALS).find((p) => under(pathname, p.path));
  if (portal && !canOpen(role, portal.role)) return redirect(role ? PORTALS[role].path : "/login");

  // Pages for any signed-in account.
  if ((under(pathname, "/settings") || under(pathname, "/compte")) && !role) return redirect("/login");

  return response();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|serwist/|manifest.webmanifest|offline|icons|splash|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
