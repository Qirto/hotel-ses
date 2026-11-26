"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { changePassword } from "@/app/auth-actions";
import { AuthLayout, PasswordField } from "@/components/app/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/accounts";

export function PasswordForm({ temporary, username }: { temporary: boolean; username: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  const error = state?.error ?? null;

  return (
    <AuthLayout
      title={temporary ? "Choisissez votre mot de passe" : "Changer le mot de passe"}
      description={
        temporary
          ? `Bienvenue ${username}. Le mot de passe fourni est temporaire : choisissez le vôtre pour continuer.`
          : `Compte ${username}. Saisissez votre mot de passe actuel, puis le nouveau.`
      }
    >
      <form action={action} noValidate className="mt-5 flex flex-col gap-4">
        {/* lets password managers attach the new password to the right account */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        {!temporary && <PasswordField id="current" name="current" label="Mot de passe actuel" autoComplete="current-password" required disabled={pending} />}
        <PasswordField
          id="password"
          name="password"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          required
          disabled={pending}
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, avec des lettres et des chiffres.`}
          invalid={Boolean(error)}
          describedBy={error ? "password-error" : undefined}
        />
        <PasswordField id="confirm" name="confirm" label="Confirmer le nouveau mot de passe" autoComplete="new-password" required disabled={pending} invalid={Boolean(error)} />

        {error && (
          <Alert id="password-error" tone="danger">
            {error}
          </Alert>
        )}

        <Button type="submit" variant="primary" size="lg" isLoading={pending} loadingText="Enregistrement" leftIcon={<Save className="size-4" aria-hidden />} className="w-full justify-center">
          Enregistrer le mot de passe
        </Button>
        {!temporary && (
          <Link href="/settings" className="text-center text-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline">
            Retour aux paramètres
          </Link>
        )}
      </form>
    </AuthLayout>
  );
}
