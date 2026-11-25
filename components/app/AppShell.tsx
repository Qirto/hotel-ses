"use client";

import { memo, useCallback, useMemo, useRef, type ReactNode } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { Sidebar, useSidebar, type SidebarItem, type SidebarSection } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { clearCachesAndReload } from "@/lib/pwa";
import { signOutToLogin } from "@/lib/session";
import { BottomNav } from "./BottomNav";
import { NoticeOutlet } from "./notice";
import { ThemeToggle } from "./ThemeToggle";
import type { DepartmentTone, NavTabItem } from "./nav";

const HOTEL_NAME = "Hôtel Méditerranée Thalasso Golf Hammamet";

const TONE_TEXT: Record<DepartmentTone, string> = {
  brand: "text-fg-muted",
  success: "text-success",
  special: "text-special",
};

interface AppShellProps {
  items: NavTabItem[];
  departmentName: string;
  departmentCode: string;
  tone?: DepartmentTone;
  /** Extra actions shown in the top bar on every screen size. */
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * Portal layout. Desktop (md+): collapsible easyui Sidebar + top bar.
 * Mobile: top bar + fixed bottom tab bar. The page itself scrolls; the
 * sidebar is sticky, so there is never a nested scroll container.
 *
 * Re-renders: the sidebar, bottom nav and brand are memoised and receive
 * stable props, so typing or filtering inside a portal only re-renders
 * the portal content, not the shell.
 */
export default function AppShell({
  items,
  departmentName,
  departmentCode,
  tone = "brand",
  headerActions,
  children,
}: AppShellProps) {
  // Latest values behind refs so the callbacks below never change identity.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const activeId = items.find((i) => i.isActive)?.id ?? "";
  const activeLabel = items.find((i) => i.isActive)?.label ?? departmentName;

  const onActiveChange = useCallback((id: string) => {
    itemsRef.current.find((i) => i.id === id)?.onClick();
  }, []);
  const signOut = useCallback(() => void signOutToLogin(), []);

  // Rebuild sidebar data only when what it displays changes.
  const navKey = items.map((i) => `${i.id}:${i.label}:${i.badge ?? ""}:${i.badgeTone ?? ""}`).join("|");
  const sections = useMemo<SidebarSection[]>(
    () => [
      {
        items: itemsRef.current.map<SidebarItem>((i) => ({
          id: i.id,
          label: i.label,
          icon: i.icon,
          badge: i.badge ? i.badge : undefined,
          badgeTone: i.badgeTone,
        })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navKey]
  );

  return (
    <div className="flex min-h-dvh">
      <ShellSidebar
        sections={sections}
        activeId={activeId}
        onActiveChange={onActiveChange}
        departmentCode={departmentCode}
        departmentName={departmentName}
        tone={tone}
        onSignOut={signOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[var(--safe-top)] backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 md:px-6 lg:px-8">
            <MobileBrand name={departmentName} code={departmentCode} tone={tone} />
            <h1 className="hidden min-w-0 flex-1 truncate text-base font-semibold tracking-tight md:block">
              {activeLabel}
            </h1>

            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <GhostIconButton label="Clear cache and reload" onClick={clearCachesAndReload}>
                <RefreshCw aria-hidden />
              </GhostIconButton>
              <ThemeToggle className="md:hidden" />
              <GhostIconButton label="Sign out" onClick={signOut} className="hover:bg-danger-subtle hover:text-danger md:hidden">
                <LogOut aria-hidden />
              </GhostIconButton>
            </div>
          </div>
        </header>

        <main
          id="main"
          className="flex-1 px-4 pb-[calc(5rem+var(--safe-bottom))] pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            <NoticeOutlet className="mb-4 md:mb-6" />
            {children}
          </div>
        </main>
      </div>

      <BottomNav items={items} />
    </div>
  );
}

/* ───────────── memoised shell parts ───────────── */

const ShellSidebar = memo(function ShellSidebar({
  sections,
  activeId,
  onActiveChange,
  departmentCode,
  departmentName,
  tone,
  onSignOut,
}: {
  sections: SidebarSection[];
  activeId: string;
  onActiveChange: (id: string) => void;
  departmentCode: string;
  departmentName: string;
  tone: DepartmentTone;
  onSignOut?: () => void;
}) {
  const header = useMemo(
    () => <SidebarBrand code={departmentCode} name={departmentName} tone={tone} />,
    [departmentCode, departmentName, tone]
  );
  const footer = useMemo(() => <SidebarFooter onSignOut={onSignOut} />, [onSignOut]);
  return (
    <Sidebar
      className="sticky top-0 h-dvh"
      sections={sections}
      activeId={activeId}
      onActiveChange={onActiveChange}
      header={header}
      footer={footer}
    />
  );
});

const MobileBrand = memo(function MobileBrand({ name, code, tone }: { name: string; code: string; tone: DepartmentTone }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 md:hidden">
      <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight">Hotel SES</p>
        <p className="truncate text-xs text-fg-muted">
          <span className={cn("font-semibold uppercase tracking-wide", TONE_TEXT[tone])}>{code}</span>
          <span aria-hidden> · </span>
          {name}
        </p>
      </div>
    </div>
  );
});

function SidebarBrand({ code, name, tone }: { code: string; name: string; tone: DepartmentTone }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight">Hotel SES</p>
        <p className="truncate text-xs text-fg-muted">
          <span className={cn("font-semibold uppercase tracking-wide", TONE_TEXT[tone])}>{code}</span>
          <span aria-hidden> · </span>
          {name}
        </p>
      </div>
    </div>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut?: () => void }) {
  const { collapsed } = useSidebar();
  return (
    <>
      {collapsed ? <ThemeToggle className="size-9" /> : <ThemeToggle variant="full" />}
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          aria-label={collapsed ? "Sign out" : undefined}
          className="focus-ring flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-fg-muted transition-colors hover:bg-danger-subtle hover:text-danger"
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

/** Borderless icon button: 40px visual, 44px hit area. */
export function GhostIconButton({
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
        "focus-ring relative grid size-10 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
        "after:absolute after:-inset-0.5 after:content-[''] [&>svg]:size-5",
        className
      )}
    >
      {children}
    </button>
  );
}
