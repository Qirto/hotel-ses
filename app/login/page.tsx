"use client";

import { INPUT_ICON } from "@/lib/styles";
import React, { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { restorePersistedSession, signInWithForm, type SignInState } from "@/app/actions";
import { HOTEL_NAME } from "@/lib/portals";
import { forgetRememberedRole, readRememberedRole } from "@/lib/remembered-role";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [showPasscode, setShowPasscode] = useState(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-restore login on phones/browsers if previously logged in
  useEffect(() => {
    const savedRole = readRememberedRole();
    if (!savedRole) return;
    setSuccessRole(savedRole);
    startTransition(async () => {
      const res = await restorePersistedSession(savedRole);
      if (res.success) {
        router.push(res.redirectUrl);
        router.refresh();
      } else {
        forgetRememberedRole();
        setSuccessRole(null);
      }
    });
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
            alt={HOTEL_NAME}
            className="mb-4 size-16 rounded-2xl object-cover shadow-float ring-1 ring-border"
          />
          <h1 className="text-2xl font-semibold tracking-tight">Hotel SES</h1>
          <p className="mt-1 text-sm text-fg-muted">{HOTEL_NAME}</p>
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
                <KeyRound className={INPUT_ICON} aria-hidden />
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
              <Alert id="passcode-error" tone="danger">
                {errorMessage}
              </Alert>
            )}
            {successRole && <Alert tone="success">Signed in. Opening your workspace.</Alert>}

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
        </footer>
      </div>
    </main>
  );
}
