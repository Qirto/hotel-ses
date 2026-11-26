import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { isPortalRole, PORTALS, ROLE_COOKIE } from "@/lib/portals";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  // A portal only for its own role.
  const portal = Object.values(PORTALS).find((p) => under(pathname, p.path));
  if (portal && role !== portal.role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Pages for any signed-in portal (not tied to one role).
  if (under(pathname, "/settings") && !isPortalRole(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return createClient(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|serwist/|manifest.webmanifest|offline|icons|splash|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};

