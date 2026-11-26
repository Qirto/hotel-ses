import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { isRole } from "@/lib/roles";
import { ACCOUNT_PATHS, canOpenPath, homeFor, PASSWORD_PATH, routeFor } from "@/lib/routes";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/**
 * Every request: refresh the Supabase session, verify it (getClaims checks the JWT
 * signature) and gate the app's pages through the route table (lib/routes.ts).
 * Pages and server actions check again on their own; this only keeps people out of
 * screens they cannot use.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response, redirect } = createClient(request);

  const { data } = await supabase.auth.getClaims();
  const app = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const role = isRole(app.role) ? app.role : null;
  const mustChangePassword = role !== null && app.must_change_password === true;

  // Signed-in: the login page and the root send you to your home.
  if (pathname === "/login" || pathname === "/") {
    if (!role) return pathname === "/" ? redirect("/login") : response();
    return redirect(mustChangePassword ? PASSWORD_PATH : homeFor(role));
  }

  // A temporary password is changed before anything else.
  if (mustChangePassword && !under(pathname, PASSWORD_PATH)) return redirect(PASSWORD_PATH);

  // App pages and account pages need a session; app pages also the capability.
  const isAppPage = routeFor(pathname) !== undefined || ACCOUNT_PATHS.some((p) => under(pathname, p));
  if (isAppPage && !role) return redirect("/login");
  if (role && !canOpenPath(role, pathname)) return redirect(homeFor(role));

  return response();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|serwist/|manifest.webmanifest|offline|icons|splash|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
