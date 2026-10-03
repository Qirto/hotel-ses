"use client";

import { useEffect } from "react";

const CURRENT_CACHE_VERSION = "hotel-ses-v5";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Automatic cache-purge on mobile when cache version changes
    if ("caches" in window) {
      try {
        const storedVersion = localStorage.getItem("ses_app_cache_version");
        if (storedVersion !== CURRENT_CACHE_VERSION) {
          caches.keys().then((keys) => {
            Promise.all(keys.map((key) => caches.delete(key))).then(() => {
              console.log("[PWA] Purged old caches for updated version:", CURRENT_CACHE_VERSION);
              localStorage.setItem("ses_app_cache_version", CURRENT_CACHE_VERSION);
            });
          });
        }
      } catch (e) {
        console.warn("[PWA] Error purging caches:", e);
      }
    }

    // 2. Register Service Worker with cache-busting timestamp
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(`/sw.js?v=${CURRENT_CACHE_VERSION}`, { scope: "/" })
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
            // Proactively check for new SW version
            reg.update();

            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // Tell worker to skip waiting and activate immediately
                    newWorker.postMessage("SKIP_WAITING");
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error("[PWA] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
