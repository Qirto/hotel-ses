const CACHE_NAME = "hotel-ses-v5";
const PRECACHE_URLS = [
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico"
];

// Install: pre-cache shell assets & skip waiting immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: prune ALL outdated caches immediately & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log("[PWA SW] Purging old cache key:", k);
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Message listener for manual cache purge or skip waiting
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CLEAR_ALL_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// Fetch: Network-First strategy ensures the phone ALWAYS receives the latest updates when online
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Don't intercept Supabase API / auth requests
  if (request.url.includes("supabase.co") || request.url.includes("/api/")) {
    return;
  }

  // Network-First for navigations and all resources
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(request);
        if (cached) return cached;

        // If offline and navigating to a page, serve the offline page or login
        if (request.mode === "navigate") {
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;
          return caches.match("/login");
        }

        return new Response("Network unavailable", { status: 503, statusText: "Offline" });
      })
  );
});
