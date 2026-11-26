import type { ReactNode } from "react";
import { BedDouble, ClipboardList } from "lucide-react";

export interface NavTabItem {
  id: string;
  label: string;
  /** Label for the mobile bottom bar when `label` is too long for its narrow tabs. */
  shortLabel?: string;
  /** A lucide icon element, e.g. <BedDouble aria-hidden /> */
  icon: ReactNode;
  /** Omitted or 0 hides the badge. */
  badge?: number;
  /** "alert" = something needs action (danger colour); "neutral" = informational count. */
  badgeTone?: "neutral" | "alert";
  onClick: () => void;
  isActive: boolean;
}

/** A nav item for a portal tab: active state and click come from the portal state. */
export function navItem<Tab extends string>(
  p: { activeTab: Tab; go: (tab: Tab) => void },
  id: Tab,
  label: string,
  icon: ReactNode,
  extra?: Pick<NavTabItem, "badge" | "badgeTone" | "shortLabel">
): NavTabItem {
  return { id, label, icon, ...extra, isActive: p.activeTab === id, onClick: () => p.go(id) };
}

/** The Rooms and Tickets items, identical in every portal (badges: rooms needing attention, open tickets). */
export function sharedNavItems<Tab extends string>(p: {
  activeTab: Tab;
  go: (tab: Tab) => void;
  attentionCount: number;
  openCount: number;
}): NavTabItem[] {
  return [
    navItem(p, "ROOMS" as Tab, "Chambres", <BedDouble aria-hidden />, { badge: p.attentionCount, badgeTone: "alert" }),
    navItem(p, "RECLAMATIONS" as Tab, "Demandes", <ClipboardList aria-hidden />, { badge: p.openCount, badgeTone: "alert" }),
  ];
}
