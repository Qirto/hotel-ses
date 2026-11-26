import { isPortalRole, type PortalRole } from "@/lib/portals";

/**
 * The last open portal, kept in localStorage so the login page can restore the
 * session where cookies get cleared (e.g. iOS home-screen apps). Per device.
 */
const KEY = "hotel_persisted_role";

export function readRememberedRole(): PortalRole | null {
  try {
    const value = localStorage.getItem(KEY);
    return isPortalRole(value) ? value : null;
  } catch {
    return null; // storage unavailable (private mode)
  }
}

export function rememberRole(role: PortalRole): void {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    // storage unavailable: the session cookie still works
  }
}

/** Forget it, so the login page does not auto-restore (sign-out). */
export function forgetRememberedRole(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
}
