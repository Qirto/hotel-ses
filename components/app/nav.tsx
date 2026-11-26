"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BedDouble, ChartColumn, ClipboardList, DoorOpen, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { navFor, routeFor, type NavIcon } from "@/lib/routes";
import type { Role } from "@/lib/roles";

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
  /** Menu section: "admin" items are listed under « Administration ». */
  group?: "admin";
  onClick: () => void;
  isActive: boolean;
}

const ICONS: Record<NavIcon, ReactNode> = {
  dashboard: <LayoutDashboard aria-hidden />,
  rooms: <BedDouble aria-hidden />,
  requests: <ClipboardList aria-hidden />,
  staff: <Users aria-hidden />,
  analytics: <ChartColumn aria-hidden />,
  accounts: <UsersRound aria-hidden />,
  inventory: <DoorOpen aria-hidden />,
};

export type NavBadges = { attention: number; open: number };

/**
 * The menu of a role, from the route table (lib/routes.ts): each entry is a page,
 * active when the URL is in it (detail pages included). Pages are prefetched so
 * switching is instant.
 */
export function useAppNav(role: Role, badges: NavBadges) {
  const pathname = usePathname();
  const router = useRouter();
  const routes = useMemo(() => navFor(role), [role]);
  const active = routeFor(pathname)?.path;

  useEffect(() => {
    routes.forEach((r) => router.prefetch(r.path));
  }, [routes, router]);

  const items = useMemo<NavTabItem[]>(
    () =>
      routes.map((r) => ({
        id: r.path,
        label: r.nav!.label,
        shortLabel: r.nav!.shortLabel,
        icon: ICONS[r.nav!.icon],
        badge: r.nav!.badge ? badges[r.nav!.badge] : undefined,
        badgeTone: "alert" as const,
        group: r.nav!.group,
        isActive: r.path === active,
        onClick: () => router.push(r.path),
      })),
    [routes, badges, active, router]
  );

  return { items, title: routes.find((r) => r.path === active)?.nav?.label ?? "" };
}
