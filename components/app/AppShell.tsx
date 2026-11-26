"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Sidebar, useSidebar, type SidebarItem, type SidebarSection } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { rememberRole } from "@/lib/remembered-role";
import { signOutToLogin } from "@/lib/session";
import { HOTEL_NAME, PORTALS, type Portal, type PortalRole, type PortalTone } from "@/lib/portals";
import { ConnectionBanner } from "./ConnectionBanner";
import { BottomNav } from "./BottomNav";
import type { NavTabItem } from "./nav";

const TONE_TEXT: Record<PortalTone, string> = {
  brand: "text-fg-muted",
  success: "text-success",
  special: "text-special",
};

const signOut = () => void signOutToLogin();

interface AppShellProps {
  /** Portal this shell belongs to: its name, code and accent come from lib/portals. */
  role: PortalRole;
  items: NavTabItem[];
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
export default function AppShell({ role, items, headerActions, children }: AppShellProps) {
  const portal = PORTALS[role];
  useEffect(() => rememberRole(role), [role]);

  // Latest values behind refs so the callbacks below never change identity.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const activeId = items.find((i) => i.isActive)?.id ?? "";
  const activeLabel = items.find((i) => i.isActive)?.label ?? portal.name;

  const onActiveChange = useCallback((id: string) => {
    itemsRef.current.find((i) => i.id === id)?.onClick();
  }, []);

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
      <ShellSidebar sections={sections} activeId={activeId} onActiveChange={onActiveChange} portal={portal} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[var(--safe-top)] backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 md:px-6 lg:px-8">
            <Brand portal={portal} className="flex-1 md:hidden" />
            <h1 className="hidden min-w-0 flex-1 truncate text-base font-semibold tracking-tight md:block">{activeLabel}</h1>

            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <GhostIconButton label="Paramètres" href="/settings" className="md:hidden">
                <Settings aria-hidden />
              </GhostIconButton>
              <GhostIconButton label="Se déconnecter" onClick={signOut} className="hover:bg-danger-subtle hover:text-danger md:hidden">
                <LogOut aria-hidden />
              </GhostIconButton>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-[calc(5rem+var(--safe-bottom))] pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
          <div className="mx-auto w-full max-w-screen-2xl">
            <ConnectionBanner />
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
  portal,
}: {
  sections: SidebarSection[];
  activeId: string;
  onActiveChange: (id: string) => void;
  portal: Portal;
}) {
  const header = useMemo(() => <Brand portal={portal} />, [portal]);
  return (
    <Sidebar
      className="sticky top-0 h-dvh"
      sections={sections}
      activeId={activeId}
      onActiveChange={onActiveChange}
      header={header}
      footer={SIDEBAR_FOOTER}
    />
  );
});

/** Logo, "Hotel SES" and the portal's code and name: sidebar header and mobile top bar. */
export const Brand = memo(function Brand({ portal, className }: { portal: Portal; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight">Hotel SES</p>
        <p className="truncate text-xs text-fg-muted">
          <span className={cn("font-semibold uppercase tracking-wide", TONE_TEXT[portal.tone])}>{portal.code}</span>
          {/* Reception's code and name are the same word: show it once. */}
          {portal.name.toLocaleLowerCase("fr") !== portal.code.toLocaleLowerCase("fr") && (
            <>
              <span aria-hidden> · </span>
              {portal.name}
            </>
          )}
        </p>
      </div>
    </div>
  );
});

function SidebarFooter() {
  const { collapsed } = useSidebar();
  return (
    <>
      <FooterRow href="/settings" icon={<Settings />} label="Paramètres" collapsed={collapsed} />
      <FooterRow onClick={signOut} icon={<LogOut />} label="Se déconnecter" collapsed={collapsed} className="hover:bg-danger-subtle hover:text-danger" />
    </>
  );
}
const SIDEBAR_FOOTER = <SidebarFooter />;

/** A sidebar footer action: link or button, icon-only when collapsed. */
function FooterRow({
  href,
  onClick,
  icon,
  label,
  collapsed,
  className,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  className?: string;
}) {
  const cls = cn(
    "focus-ring flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
    className
  );
  const content = (
    <>
      <span className="grid size-5 shrink-0 place-items-center [&>svg]:size-[18px]" aria-hidden>
        {icon}
      </span>
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
    </>
  );
  // Collapsed: the rail's styled tooltip (same as nav items), never the browser's `title`.
  const { showTip, hideTip } = useSidebar();
  const a11y = {
    "aria-label": collapsed ? label : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTip(e.currentTarget, label),
    onFocus: (e: React.FocusEvent<HTMLElement>) => showTip(e.currentTarget, label),
    onMouseLeave: hideTip,
    onBlur: hideTip,
  };
  return href ? (
    <Link href={href} className={cls} {...a11y}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} {...a11y}>
      {content}
    </button>
  );
}

/** Borderless icon button or link: 40px visual, 44px hit area. */
export function GhostIconButton({
  label,
  onClick,
  href,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    "focus-ring relative grid size-10 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
    "after:absolute after:-inset-0.5 after:content-[''] [&>svg]:size-5",
    className
  );
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
}
