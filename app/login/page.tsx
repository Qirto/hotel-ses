"use client";

import { useActionState, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { signInWithForm, type FormState } from "@/app/auth-actions";
import { AuthField, AuthLayout, PasswordField } from "@/components/app/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Personal sign-in: username + password. A real form action (POST + redirect), so
 * it works before hydration and password-manager autofill always counts.
 */
export default function LoginPage() {
  const [state, action, pending] = useActionState(signInWithForm, null);
  const [dismissed, setDismissed] = useState<FormState>(null);
  const error = state && state !== dismissed ? state.error : null;
  const clearError = () => error && setDismissed(state);

  return (
    <AuthLayout title="Connexion" description="Connectez-vous avec l’identifiant et le mot de passe fournis par l’administrateur.">
      <form action={action} noValidate className="mt-5 flex flex-col gap-4">
        <AuthField
          id="username"
          name="username"
          label="Identifiant"
          icon={<UserRound />}
          placeholder="ex. s.trabelsi"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          disabled={pending}
          invalid={Boolean(error)}
          describedBy={error ? "login-error" : undefined}
          onChange={clearError}
        />
        <PasswordField
          id="password"
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
          disabled={pending}
          invalid={Boolean(error)}
          describedBy={error ? "login-error" : undefined}
          onChange={clearError}
        />

        {error && (
          <Alert id="login-error" tone="danger">
            {error}
          </Alert>
        )}

        <Button type="submit" variant="primary" size="lg" isLoading={pending} loadingText="Vérification" rightIcon={<ArrowRight className="size-4" aria-hidden />} className="w-full justify-center">
          Se connecter
        </Button>
        <p className="text-center text-xs text-fg-muted">Mot de passe oublié ? Demandez à l’administrateur de le réinitialiser.</p>
      </form>
    </AuthLayout>
  );
}
