"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A page's filters, kept in the URL (`?status=DIRTY&floor=1`): refresh, back /
 * forward and shared links keep them. Values equal to their default are left out of
 * the URL. Updates use the browser history API, which Next.js syncs with
 * useSearchParams without a server round trip (typing in a search box stays instant).
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const params = useSearchParams();
  const pathname = usePathname();

  const values = useMemo(
    () => Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, params.get(key) ?? fallback])) as T,
    [params, defaults]
  );

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === defaults[key]) next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [params, pathname, defaults]
  );

  return [values, set] as const;
}
