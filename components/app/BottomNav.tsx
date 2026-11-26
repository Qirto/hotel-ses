"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavTabItem } from "./nav";

/**
 * Mobile tab bar (below md). easyui has no bottom-nav component, so this one
 * follows its conventions: neutral surfaces, spring indicator, 44px+ targets.
 */
export function BottomNav({ items }: { items: NavTabItem[] }) {
  return (
    <nav
      aria-label="Rubriques"
      className="glass-surface fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[var(--safe-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.onClick}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "focus-ring relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                item.isActive ? "text-brand" : "text-fg-muted hover:text-fg"
              )}
            >
              {item.isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand"
                  aria-hidden
                />
              )}
              <span className="relative grid size-6 place-items-center [&>svg]:size-5">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute -right-2.5 -top-1.5 min-w-[1.125rem] rounded-full px-1 text-center text-[10px] font-semibold leading-[1.125rem] tabular-nums",
                      item.badgeTone === "alert" ? "bg-danger-solid text-white" : "bg-surface-hover text-fg-secondary"
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                    <span className="sr-only">{item.badgeTone === "alert" ? " à traiter" : ""}</span>
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
