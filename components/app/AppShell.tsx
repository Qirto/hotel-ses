"use client";

import type { ReactNode } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { Sidebar, useSidebar, type SidebarItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { clearCachesAndReload, forgetPersistedRole } from "@/lib/pwa";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import type { DepartmentTone, NavTabItem } from "./nav";

const HOTEL_NAME = "Hôtel Méditerranée Thalasso Golf Hammamet";

const TONE_CHIP: Record<DepartmentTone, string> = {
  brand: "border-brand/30 bg-brand-subtle text-brand",
  success: "border-success/30 bg-success-subtle text-success",
  special: "border-special/30 bg-special-subtle text-special",
};

interface AppShellProps {
  items: NavTabItem[];
  departmentName: string;
  departmentCode: string;
  tone?: DepartmentTone;
  /** Extra actions shown in the top bar on every screen size. */
  headerActions?: ReactNode;
  onSignOut?: () => void;
  children: ReactNode;
}

/**
 * Portal layout. Desktop (md+): collapsible easyui Sidebar + top bar.
 * Mobile: top bar + fixed bottom tab bar. The page itself scrolls; the
 * sidebar is sticky, so there is never a nested scroll container.
 */
export default function AppShell({
  items,
  departmentName,
  departmentCode,
  tone = "brand",
  headerActions,
  onSignOut,
  children,
}: AppShellProps) {
  const active = items.find((i) => i.isActive);
  const signOut = onSignOut
    ? () => {
        forgetPersistedRole();
        onSignOut();
      }
    : undefined;

  const sections: { items: SidebarItem[] }[] = [
    {
      items: items.map((i) => ({
        id: i.id,
        label: i.label,
        icon: i.icon,
        badge: i.badge ? i.badge : undefined,
        badgeTone: i.badgeTone,
      })),
    },
  ];

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        className="sticky top-0 h-dvh"
        sections={sections}
        activeId={active?.id ?? ""}
        onActiveChange={(id) => items.find((i) => i.id === id)?.onClick()}
        header={<Brand code={departmentCode} name={departmentName} tone={tone} />}
        footer={<SidebarFooter onSignOut={signOut} />}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0 pt-[var(--safe-top)]">
          <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 md:px-6 lg:px-8">
            {/* Mobile: brand. Desktop: the sidebar carries the brand, show the section title. */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 md:hidden">
              <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg object-cover" />
              {/* Phones: logo + department chip identify the portal; the name needs sm+ width. */}
              <span className="hidden truncate text-[15px] font-bold tracking-tight sm:inline">Hotel SES</span>
              <DeptChip code={departmentCode} tone={tone} />
            </div>
            <h1 className="hidden min-w-0 flex-1 truncate text-lg font-semibold tracking-tight md:block">
              {active?.label ?? departmentName}
            </h1>

            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              <IconButton label="Clear cache and reload" onClick={() => void clearCachesAndReload()}>
                <RefreshCw aria-hidden />
              </IconButton>
              <ThemeToggle className="md:hidden" />
              {signOut && (
                <IconButton label="Sign out" onClick={signOut} className="text-danger hover:text-danger md:hidden">
                  <LogOut aria-hidden />
                </IconButton>
              )}
            </div>
          </div>
        </header>

        <main
          id="portal-main"
          className="flex-1 px-4 pb-[calc(5rem+var(--safe-bottom))] pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>

      <BottomNav items={items} />
    </div>
  );
}

function DeptChip({ code, tone }: { code: string; tone: DepartmentTone }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        TONE_CHIP[tone]
      )}
    >
      {code}
    </span>
  );
}

function Brand({ code, name, tone }: { code: string; name: string; tone: DepartmentTone }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg border border-border object-cover" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold tracking-tight">Hotel SES</span>
          <DeptChip code={code} tone={tone} />
        </div>
        <p className="truncate text-xs text-fg-muted">{name}</p>
      </div>
    </div>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut?: () => void }) {
  const { collapsed } = useSidebar();
  return (
    <>
      {collapsed ? <ThemeToggle className="size-9 border-0" /> : <ThemeToggle variant="full" />}
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          aria-label={collapsed ? "Sign out" : undefined}
          className="focus-ring flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-danger transition-colors hover:bg-danger-subtle"
        >
          <span className="grid size-5 shrink-0 place-items-center">
            <LogOut className="size-[18px]" aria-hidden />
          </span>
          {!collapsed && <span className="flex-1 truncate text-left">Sign out</span>}
        </button>
      )}
    </>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring grid size-11 place-items-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg [&>svg]:size-[18px]",
        className
      )}
    >
      {children}
    </button>
  );
}
