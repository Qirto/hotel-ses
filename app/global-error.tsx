"use client";

import "./globals.css";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";
import { resolvedTheme } from "@/lib/theme";

/**
 * Last-resort error page when the root layout itself fails. It replaces the whole
 * document, so it loads the global styles and applies the theme itself.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" data-theme={typeof window === "undefined" ? "dark" : resolvedTheme()} suppressHydrationWarning>
      <body>
        <title>Une erreur est survenue · Hotel SES</title>
        <StatusScreen
          icon={<TriangleAlert />}
          tone="danger"
          title="Hotel SES n’a pas pu démarrer"
          actions={
            <Button variant="primary" size="lg" onClick={retry} leftIcon={<RotateCw className="size-4" aria-hidden />} className="w-full justify-center">
              Réessayer
            </Button>
          }
        >
          <p>Une erreur est survenue lors du chargement de l’application. Réessayez dans un instant.</p>
          {error.digest && <p className="mt-2 font-mono text-xs">Référence : {error.digest}</p>}
        </StatusScreen>
      </body>
    </html>
  );
}
