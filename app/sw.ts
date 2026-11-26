/// <reference lib="webworker" />
/**
 * Hotel SES service worker (Serwist), bundled and served by app/serwist/[path]/route.ts.
 *
 * Rules: operational data must never be stale.
 * - Precache (cache-first, replaced on every deploy): build JS/CSS/fonts, icons, the
 *   logo and the static /offline page. These hold no user data.
 * - Page navigations: network only. If the network is down, show /offline instead of
 *   the browser's error page (installed apps have no reload button).
 * - Everything else (RSC payloads, server actions, Supabase REST + realtime): not
 *   intercepted at all, so it always goes to the network.
 * - New versions wait until the user accepts the "Update available" prompt.
 */
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // injected at build time by createSerwistRoute
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// One-time cleanup of the previous hand-written worker's caches ("hotel-ses-v6", ...),
// which stored signed-in pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("hotel-ses-")).map((k) => caches.delete(k))))
  );
});
