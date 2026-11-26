"use client";

import type { ReactNode } from "react";
import { ArrowLeft, AtSign, KeyRound, LogOut, Monitor, Moon, Palette, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { GhostIconButton } from "@/components/app/AppShell";
import { Panel } from "@/components/features/Panel";
import { Segmented } from "@/components/features/Forms";
import { PORTALS, ROLE_LABEL, type PortalRole } from "@/lib/portals";
import { signOutToLogin } from "@/lib/session";
import { setThemePreference, THEME_OPTIONS, useThemePreference, type ThemePreference } from "@/lib/theme";

const THEME_ICONS: Record<ThemePreference, ReactNode> = {
  system: <Monitor aria-hidden />,
  light: <Sun aria-hidden />,
  dark: <Moon aria-hidden />,
};
const THEME_CHOICES = THEME_OPTIONS.map((o) => ({ ...o, icon: THEME_ICONS[o.value] }));

/**
 * Settings page: per-device preferences and the signed-in account.
 * Sections are Panels of SettingRows, so new settings slot in without new layout.
 */
export function SettingsView({ role, username, displayName }: { role: PortalRole; username: string; displayName: string }) {
  const portal = PORTALS[role];
  const theme = useThemePreference();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-2 md:px-4">
          <GhostIconButton label={`Retour à l’espace ${portal.name}`} href={portal.path}>
            <ArrowLeft aria-hidden />
          </GhostIconButton>
          <h1 className="text-base font-semibold tracking-tight">Paramètres</h1>
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-[calc(2rem+var(--safe-bottom))] pt-4 md:gap-6 md:pt-6">
        <Panel title="Apparence" description="Apparence de Hotel SES sur cet appareil." icon={<Palette />}>
          <SettingRow label="Thème" description="Le mode Système suit le réglage clair ou sombre de votre appareil.">
            <Segmented<ThemePreference> label="Thème" hideLabel value={theme} onChange={setThemePreference} options={THEME_CHOICES} />
          </SettingRow>
        </Panel>

        <Panel title="Compte" description="Votre compte personnel." icon={<UserRound />}>
          <div className="flex flex-col divide-y divide-border">
            <SettingRow label="Nom">
              <span className="text-sm text-fg">{displayName}</span>
            </SettingRow>
            <SettingRow label="Identifiant">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm text-fg">
                <AtSign className="size-4 text-fg-muted" aria-hidden /> {username}
              </span>
            </SettingRow>
            <SettingRow label="Rôle" description="Fixé par l’administrateur.">
              <span className="text-sm text-fg">{ROLE_LABEL[role]}</span>
            </SettingRow>
            <SettingRow label="Mot de passe" description="Changez-le régulièrement, et tout de suite si vous pensez qu’il est connu.">
              <ButtonLink href="/compte/mot-de-passe" variant="outline" size="touch" leftIcon={<KeyRound className="size-4" aria-hidden />}>
                Changer le mot de passe
              </ButtonLink>
            </SettingRow>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" size="touch" onClick={() => void signOutToLogin()} leftIcon={<LogOut className="size-4" aria-hidden />}>
              Se déconnecter
            </Button>
          </div>
        </Panel>
      </main>
    </div>
  );
}

/** One setting: label and help text on the left, its control on the right (stacked on phones). */
function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="shrink-0 sm:min-w-72">{children}</div>
    </div>
  );
}
