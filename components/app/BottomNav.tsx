"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveSheet } from "./ResponsiveSheet";
import type { NavTabItem } from "./nav";

/** A phone tab bar stays readable up to five tabs; past that, the last slot becomes « Plus ». */
const MAX_TABS = 5;

/**
 * Mobile tab bar (below md). easyui has no bottom-nav component, so this one
 * follows its conventions: neutral surfaces, spring indicator, 44px+ targets.
 * With more than five entries (the administrator), the first four stay as tabs and
 * the rest open from « Plus », which shows as active when one of them is.
 */
export function BottomNav({ items }: { items: NavTabItem[] }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const overflow = items.length > MAX_TABS;
  const tabs = overflow ? items.slice(0, MAX_TABS - 1) : items;
  const more = overflow ? items.slice(MAX_TABS - 1) : [];
  const moreActive = more.some((i) => i.isActive);
  const moreBadge = more.reduce((n, i) => n + (i.badgeTone === "alert" && i.badge ? i.badge : 0), 0);
  const columns = tabs.length + (overflow ? 1 : 0);

  return (
    <>
      <nav aria-label="Rubriques" className="glass-surface fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[var(--safe-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {tabs.map((item) => (
            <li key={item.id}>
              <Tab active={item.isActive} onClick={item.onClick} icon={item.icon} label={item.shortLabel ?? item.label} badge={item.badgeTone === "alert" ? item.badge : undefined} />
            </li>
          ))}
          {overflow && (
            <li>
              <Tab active={moreActive} onClick={() => setMoreOpen(true)} icon={<Ellipsis aria-hidden />} label="Plus" badge={moreBadge} haspopup />
            </li>
          )}
        </ul>
      </nav>

      {overflow && (
        <ResponsiveSheet open={moreOpen} onOpenChange={setMoreOpen} title="Plus de rubriques">
          <ul className="flex flex-col gap-1">
            {more.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={item.isActive ? "page" : undefined}
                  onClick={() => {
                    setMoreOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "focus-ring flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors [&_svg]:size-5",
                    item.isActive ? "bg-surface-hover text-brand" : "text-fg hover:bg-surface-hover"
                  )}
                >
                  {item.icon}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badgeTone === "alert" && !!item.badge && (
                    <span className="min-w-[1.25rem] rounded-full bg-danger-solid px-1.5 text-center text-xs font-semibold leading-5 text-white tabular-nums">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </ResponsiveSheet>
      )}
    </>
  );
}

function Tab({ active, onClick, icon, label, badge, haspopup }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number; haspopup?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-haspopup={haspopup ? "dialog" : undefined}
      className={cn(
        "focus-ring relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active ? "text-brand" : "text-fg-muted hover:text-fg"
      )}
    >
      {active && (
        <motion.span
          layoutId="bottom-nav-indicator"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand"
          aria-hidden
        />
      )}
      <span className="relative grid size-6 place-items-center [&>svg]:size-5">
        {icon}
        {/* Only counts that need action: the narrow bar has no room for informational ones. */}
        {!!badge && badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[1.125rem] rounded-full bg-danger-solid px-1 text-center text-[10px] font-semibold leading-[1.125rem] text-white tabular-nums">
            {badge > 99 ? "99+" : badge}
            <span className="sr-only"> à traiter</span>
          </span>
        )}
      </span>
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}
