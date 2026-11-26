"use client";

import { signOut } from "@/app/auth-actions";

/**
 * Ends the session and goes to /login. If the server cannot be reached (dev server
 * restarting, flaky network), the page still goes to /login: the proxy keeps an
 * unverified session out of every portal anyway.
 */
export async function signOutToLogin(): Promise<void> {
  try {
    await signOut();
  } catch (err) {
    console.warn("Sign-out request failed.", err);
  }
  window.location.assign("/login");
}
