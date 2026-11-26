"use client";

import { logoutRole } from "@/app/actions";
import { forgetRememberedRole } from "@/lib/remembered-role";
import { ROLE_COOKIE } from "@/lib/portals";

/**
 * Ends the portal session and goes to /login. If the server action cannot be
 * reached (dev server restarting, flaky network), the role cookie is cleared
 * locally instead of surfacing a runtime error.
 *
 * Note: the local fallback only works while `hotel_role` is not httpOnly. Once
 * the session cookie is hardened, the server action is the only path.
 */
export async function signOutToLogin(): Promise<void> {
  forgetRememberedRole();
  try {
    await logoutRole();
  } catch (err) {
    console.warn("Sign-out request failed; clearing the session cookie locally.", err);
    document.cookie = `${ROLE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  }
  window.location.assign("/login");
}
