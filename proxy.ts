import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const ROLE_ROUTES: Record<string, string> = {
  "/reception": "reception",
  "/rh": "rh",
  "/gm": "gm",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedRoute = Object.keys(ROLE_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (matchedRoute) {
    const role = request.cookies.get("hotel_role")?.value;
    if (role !== ROLE_ROUTES[matchedRoute]) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return createClient(request);
}

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline|icons|splash|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};

