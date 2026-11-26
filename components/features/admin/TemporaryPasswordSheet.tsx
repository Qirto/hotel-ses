"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shows a temporary password once, right after creating an account or resetting
 * it. Nothing keeps it: once this closes, only a new reset can show another.
 */
export function TemporaryPasswordSheet({ credentials, onClose }: { credentials: { username: string; password: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Identifiant : ${credentials.username}\nMot de passe temporaire : ${credentials.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ResponsiveSheet
      open={credentials !== null}
      onOpenChange={(o) => {
        if (!o) {
          setCopied(false);
          onClose();
        }
      }}
      title="Mot de passe temporaire"
      description="Transmettez-le à la personne : elle choisira le sien à sa première connexion."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={copy} leftIcon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} className="justify-center">
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button variant="primary" onClick={onClose} className="justify-center">
            J’ai noté le mot de passe
          </Button>
        </div>
      }
    >
      {credentials && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm">
            <dt className="text-fg-muted">Identifiant</dt>
            <dd className="font-mono font-medium">{credentials.username}</dd>
            <dt className="text-fg-muted">Mot de passe</dt>
            <dd className="select-all font-mono text-base font-semibold tracking-wide">{credentials.password}</dd>
          </dl>
          <Alert tone="warning">Il ne sera plus affiché. En cas de perte, réinitialisez-le à nouveau.</Alert>
        </div>
      )}
    </ResponsiveSheet>
  );
}
