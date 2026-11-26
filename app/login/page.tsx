"use client";

import React, { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Eye, EyeOff, KeyRound, RefreshCw, WifiOff } from "lucide-react";
import { restorePersistedSession, signInWithForm, type SignInState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { clearCachesAndReload, forgetPersistedRole } from "@/lib/pwa";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [showPasscode, setShowPasscode] = useState(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-restore login on phones/browsers if previously logged in
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem("hotel_persisted_role");
      if (savedRole === "reception" || savedRole === "rh" || savedRole === "gm") {
        setSuccessRole(savedRole);
        startTransition(async () => {
          const res = await restorePersistedSession(savedRole);
          if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl);
            router.refresh();
          } else {
            localStorage.removeItem("hotel_persisted_role");
            setSuccessRole(null);
          }
        });
      }
    } catch (_) {}
  }, [router]);

  // Real form action: submits (POST + redirect) even before hydration, and reads
  // the field itself, so password-manager autofill always counts.
  const [signIn, signInAction, signingIn] = useActionState(signInWithForm, null);
  const [dismissedError, setDismissedError] = useState<SignInState>(null);
  const errorMessage = signIn && signIn !== dismissedError ? signIn.error : null;
  const busy = isPending || signingIn;

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-[calc(2.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex flex-col items-center text-center">
          <img
            src="/hotel-logo.png"
            alt="Hôtel Méditerranée Thalasso Golf Hammamet"
            className="mb-4 size-16 rounded-2xl object-cover shadow-float ring-1 ring-border"
          />
          <h1 className="text-2xl font-semibold tracking-tight">Hotel SES</h1>
          <p className="mt-1 text-sm text-fg-muted">Hôtel Méditerranée Thalasso Golf Hammamet</p>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-float sm:p-6">
          <h2 className="text-base font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-fg-muted">Enter the passcode for your department.</p>

          <form action={signInAction} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="passcode-input" className="text-sm font-medium text-fg-secondary">
                Passcode
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
                <input
                  id="passcode-input"
                  name="passcode"
                  type={showPasscode ? "text" : "password"}
                  inputMode="numeric"
                  autoFocus
                  required
                  autoComplete="current-password"
                  onChange={() => errorMessage && setDismissedError(signIn)}
                  placeholder="Enter passcode"
                  disabled={busy || Boolean(successRole)}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? "passcode-error" : undefined}
                  className={cn(
                    "focus-ring h-12 w-full rounded-lg border bg-surface pl-9 pr-12 text-base text-fg placeholder:text-fg-muted disabled:opacity-60",
                    !showPasscode && "[&:not(:placeholder-shown)]:tracking-[0.3em]",
                    errorMessage ? "border-danger" : "border-border-strong"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                  aria-pressed={showPasscode}
                  className="focus-ring absolute inset-y-1 right-1 grid w-10 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  {showPasscode ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p id="passcode-error" role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {errorMessage}
              </p>
            )}
            {successRole && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-subtle px-3 py-2.5 text-sm text-success">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Signed in. Opening your workspace.
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={Boolean(successRole)}
              isLoading={busy}
              loadingText="Checking"
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
              className="w-full justify-center"
            >
              Continue
            </Button>
          </form>
        </section>

        <footer className="mt-6 flex flex-col items-center gap-3 text-center text-xs text-fg-muted">
          <p>
            Authorised staff only. A strictly necessary session cookie keeps you signed in.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
              Privacy
            </Link>{" "}
            ·{" "}
            <Link href="/tos" className="underline underline-offset-2 hover:text-fg">
              Terms
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Link href="/offline" className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-surface-hover hover:text-fg">
              <WifiOff className="size-3.5" aria-hidden /> Offline help
            </Link>
            <button
              type="button"
              onClick={() => {
                forgetPersistedRole();
                void clearCachesAndReload();
              }}
              className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-surface-hover hover:text-fg"
            >
              <RefreshCw className="size-3.5" aria-hidden /> Clear cache and reload
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
