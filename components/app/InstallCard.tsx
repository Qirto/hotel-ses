"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { DAY_MS } from "@/lib/format";

/** True when the banner was dismissed less than `days` ago. Storage failures count as "not dismissed". */
export function dismissedRecently(key: string, days = 7): boolean {
  try {
    const at = Number(localStorage.getItem(key));
    return Boolean(at) && Date.now() - at < days * DAY_MS;
  } catch {
    return false;
  }
}

export function rememberDismissal(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Private mode: the banner simply shows again next visit.
  }
}

export function isStandaloneApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Install prompt card: above the mobile bottom nav, bottom-right on desktop. */
export function InstallCard({
  title,
  icon,
  onDismiss,
  children,
  actions,
}: {
  title: string;
  icon: ReactNode;
  onDismiss: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="fixed inset-x-4 bottom-[calc(5.5rem+var(--safe-bottom))] z-40 mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-float md:inset-x-auto md:bottom-6 md:right-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-hover text-fg [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <div className="mt-1 text-sm text-fg-muted">{children}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="focus-ring -mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {actions && <div className="mt-3 flex justify-end gap-2">{actions}</div>}
    </aside>
  );
}
