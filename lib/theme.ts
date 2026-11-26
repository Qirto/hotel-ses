"use client";

import { useSyncExternalStore } from "react";
import { LIGHT_QUERY, THEME_STORAGE_KEY } from "@/lib/theme-script";

/**
 * Theme preference: "system" (default) follows the device's light/dark setting live;
 * "light" / "dark" pin one. Stored per device in localStorage; the applied theme is
 * the `data-theme` attribute on <html>, which the CSS tokens read.
 *
 * The first paint is set by THEME_INIT_SCRIPT (lib/theme-script) in the root layout (no flash);
 * `watchTheme` (mounted once in ThemeProvider) keeps it current afterwards.
 */

export type ThemePreference = "system" | "light" | "dark";

const CHANGE_EVENT = "ses-theme-change";

export const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function readPreference(): ThemePreference {
  try {
    const p = localStorage.getItem(THEME_STORAGE_KEY);
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

const resolve = (p: ThemePreference): "light" | "dark" =>
  p === "system" ? (window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark") : p;

/** The theme to show now ("light" | "dark"), from the stored preference and the device. */
export const resolvedTheme = () => resolve(readPreference());

function apply(): void {
  document.documentElement.setAttribute("data-theme", resolvedTheme());
}

export function setThemePreference(p: ThemePreference): void {
  try {
    if (p === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, p);
  } catch {
    // storage blocked: still apply for this page
  }
  apply();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Re-applies on device theme changes (when "system") and on changes from other tabs. */
export function watchTheme(): () => void {
  const mql = window.matchMedia(LIGHT_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY && e.key !== null) return;
    apply();
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  mql.addEventListener("change", apply);
  window.addEventListener("storage", onStorage);
  return () => {
    mql.removeEventListener("change", apply);
    window.removeEventListener("storage", onStorage);
  };
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
};

/** The stored preference (not the resolved theme), for the settings control. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}
