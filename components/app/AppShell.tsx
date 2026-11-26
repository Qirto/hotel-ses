"use client";

import { memo, useCallback, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Sidebar, useSidebar, type SidebarItem, type SidebarSection } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { signOutToLogin } from "@/lib/session";
import { HOTEL_NAME, ROLE_BADGE, ROLE_LABEL, type Role } from "@/lib/roles";
import { ConnectionBanner } from "./ConnectionBanner";
import { BottomNav } from "./BottomNav";
import { useAppNav, type NavBadges, type NavTabItem } from "./nav";

const TONE_TEXT = { muted: "text-fg-muted", success: "text-success", special: "text-special" } as const;

const signOut = () => void signOutToLogin();

interface AppShellProps {
  /** The signed-in role: decides the menu (lib/routes.ts) and the brand chip. */
  role: Role;
  /** Counts shown on the Rooms and Requests entries. */
  badges: NavBadges;
  children: ReactNode;
}

/**
 * The app's one shell, for every role. Desktop (md+): collapsible easyui Sidebar +
 * top bar. Mobile: top bar + fixed bottom tab bar. Each menu entry is a page; the
 * active one follows the URL. The page itself scrolls; the sidebar is sticky, so
 * there is never a nested scroll container.
 */
export default function AppShell({ role, badges, children }: AppShellProps) {
  const { items, title } = useAppNav(role, badges);

  // Latest items behind a ref so the sidebar callback never changes identity.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const activeId = items.find((i) => i.isActive)?.id ?? "";
  const onActiveChange = useCallback((id: string) => {
    itemsRef.current.find((i) => i.id === id)?.onClick();
  }, []);

  // Rebuild sidebar data only when what it displays changes.
  // Daily work first, then « Administration » (accounts, room configuration) when the role has it.
  const navKey = items.map((i) => `${i.id}:${i.label}:${i.badge ?? ""}`).join("|");
  const sections = useMemo<SidebarSection[]>(
    () => {
      const toItem = (i: NavTabItem): SidebarItem => ({ id: i.id, label: i.label, icon: i.icon, badge: i.badge ? i.badge : undefined, badgeTone: i.badgeTone });
      const daily = itemsRef.current.filter((i) => !i.group).map(toItem);
      const admin = itemsRef.current.filter((i) => i.group === "admin").map(toItem);
      return [{ items: daily }, ...(admin.length ? [{ title: "Administration", items: admin }] : [])];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navKey]
  );

  return (
    <div className="flex min-h-dvh">
      <ShellSidebar sections={sections} activeId={activeId} onActiveChange={onActiveChange} role={role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[var(--safe-top)] backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 md:px-6 lg:px-8">
            <Brand role={role} className="flex-1 md:hidden" />
            <h1 className="hidden min-w-0 flex-1 truncate text-base font-semibold tracking-tight md:block">{title}</h1>

            <div className="flex shrink-0 items-center gap-1">
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
          <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 md:gap-6">
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
  role,
}: {
  sections: SidebarSection[];
  activeId: string;
  onActiveChange: (id: string) => void;
  role: Role;
}) {
  const header = useMemo(() => <Brand role={role} />, [role]);
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

/** Logo, "Hotel SES" and the role: sidebar header and mobile top bar. */
export const Brand = memo(function Brand({ role, className }: { role: Role; className?: string }) {
  const badge = ROLE_BADGE[role];
  const label = ROLE_LABEL[role];
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img src="/hotel-logo.png" alt={HOTEL_NAME} className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight">Hotel SES</p>
        <p className="truncate text-xs text-fg-muted">
          <span className={cn("font-semibold uppercase tracking-wide", TONE_TEXT[badge.tone])}>{badge.code}</span>
          {/* show the full label only when it says more than the code */}
          {label.toLocaleLowerCase("fr") !== badge.code.toLocaleLowerCase("fr") && (
            <>
              <span aria-hidden> · </span>
              {label}
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
