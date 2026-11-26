"use client";

import { ButtonLink } from "@/components/ui/button-link";
import { RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";

export default function OfflinePage() {
  return (
    <StatusScreen
      icon={<WifiOff />}
      tone="warning"
      title="Vous êtes hors ligne"
      actions={
        <>
          <Button variant="primary" size="lg" onClick={() => window.location.reload()} leftIcon={<RotateCw className="size-4" aria-hidden />} className="w-full justify-center">
            Réessayer
          </Button>
          <ButtonLink href="/login" variant="outline" size="lg" fullWidth>
            Retour à la connexion
          </ButtonLink>
        </>
      }
    >
      Hotel SES a besoin d’une connexion pour synchroniser l’état des chambres et les demandes. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.
    </StatusScreen>
  );
}
