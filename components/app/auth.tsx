"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { HOTEL_NAME } from "@/lib/portals";
import { INPUT_ICON } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** Centred card with the hotel's logo: the sign-in and password pages. */
export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-[calc(2.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex flex-col items-center text-center">
          <img src="/hotel-logo.png" alt={HOTEL_NAME} className="mb-4 size-16 rounded-2xl object-cover shadow-float ring-1 ring-border" />
          <h1 className="text-2xl font-semibold tracking-tight">Hotel SES</h1>
          <p className="mt-1 text-sm text-fg-muted">{HOTEL_NAME}</p>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-float sm:p-6">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
          {children}
        </section>

        <footer className="mt-6 text-center text-xs text-fg-muted">
          <p>
            Réservé au personnel autorisé. Un cookie de session strictement nécessaire maintient votre connexion.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
              Confidentialité
            </Link>{" "}
            ·{" "}
            <Link href="/tos" className="underline underline-offset-2 hover:text-fg">
              Conditions d’utilisation
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

const fieldClass = (invalid: boolean) =>
  cn(
    "focus-ring h-12 w-full rounded-lg border bg-surface pl-9 text-base text-fg placeholder:text-fg-muted disabled:opacity-60",
    invalid ? "border-danger" : "border-border-strong"
  );

/** Labelled text field with a leading icon (16px text: no zoom on iOS). */
export function AuthField({
  id,
  label,
  icon,
  invalid = false,
  describedBy,
  ...input
}: React.ComponentProps<"input"> & { id: string; label: string; icon: ReactNode; invalid?: boolean; describedBy?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <div className="relative">
        <span className={cn(INPUT_ICON, "[&>svg]:size-4")} aria-hidden>
          {icon}
        </span>
        <input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cn(fieldClass(invalid), "pr-3")} {...input} />
      </div>
    </div>
  );
}

/** Password field with a show / hide toggle. */
export function PasswordField({
  id,
  label,
  invalid = false,
  describedBy,
  hint,
  ...input
}: React.ComponentProps<"input"> & { id: string; label: string; invalid?: boolean; describedBy?: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <div className="relative">
        <KeyRound className={INPUT_ICON} aria-hidden />
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(fieldClass(invalid), "pr-12")}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="focus-ring absolute inset-y-1 right-1 grid w-10 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
