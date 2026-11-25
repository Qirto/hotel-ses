"use client";

import { useState, type ReactNode } from "react";

/**
 * Keep-alive tab content. Mounts on first visit, then stays mounted and is
 * hidden while inactive, so a view's own filters and search survive a tab
 * switch and coming back does not rebuild it. While active it uses
 * `display: contents`, so its children keep the parent `PageStack` rhythm.
 */
export function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  if (!visited && !active) return null;
  return <div className={active ? "contents" : "hidden"}>{children}</div>;
}
