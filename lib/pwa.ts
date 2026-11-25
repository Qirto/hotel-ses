/**
 * Drops every Cache Storage entry and service worker registration, then
 * reloads. Used by the "Clear cache and reload" controls when a device is
 * stuck on an old PWA build.
 */
export async function clearCachesAndReload(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
    localStorage.removeItem("ses_app_cache_version");
  } catch {
    // Reload anyway: a fresh network fetch is the goal.
  }
  window.location.reload();
}

/** Forget the remembered portal so the login page does not auto-restore it. */
export function forgetPersistedRole(): void {
  try {
    localStorage.removeItem("hotel_persisted_role");
  } catch {
    // Storage unavailable (private mode): nothing to forget.
  }
}
