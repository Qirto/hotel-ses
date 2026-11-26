import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Builds and serves the service worker at /serwist/sw.js (statically, at build time).
 * The precache list is generated from this build, so every deploy ships a new,
 * versioned worker: no hand-maintained cache version.
 */

// Revision for /offline (a page, so it has no content hash): the deployed commit.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  // App shell only: build output plus the few public files every page uses.
  // (iOS splash images are fetched by the OS itself, not by the app.)
  // Fonts: only the preloaded ("*.p.*") Latin files; other next/font subsets load on demand.
  globPatterns: [
    ".next/static/**/*.{js,css}",
    ".next/static/media/*.p.*.woff2",
    "public/{favicon.ico,hotel-logo.png,manifest.webmanifest}",
    "public/icons/{icon-192x192,icon-512x512,apple-touch-icon}.png",
  ],
});
