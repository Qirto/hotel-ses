"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { House, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";

/**
 * Error page for every route under the root layout (portals, settings, login...).
 * "Try again" re-fetches and re-renders the failed segment (Next 16 `retry`).
 * Server errors arrive with a generic message and a `digest` that matches the
 * server log, so details never leak to the browser.
 */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<TriangleAlert />}
      tone="danger"
      title="Une erreur est survenue"
      actions={
        <>
          <Button variant="primary" size="lg" onClick={retry} leftIcon={<RotateCw className="size-4" aria-hidden />} className="w-full justify-center">
            Réessayer
          </Button>
          <ButtonLink href="/" variant="outline" size="lg" fullWidth leftIcon={<House className="size-4" aria-hidden />}>
            Retour à mon espace
          </ButtonLink>
        </>
      }
    >
      <p>Impossible de charger cette page. Vérifiez la connexion et réessayez ; aucune donnée enregistrée n’a été perdue.</p>
      {error.digest && <p className="mt-2 font-mono text-xs">Référence : {error.digest}</p>}
    </StatusScreen>
  );
}
