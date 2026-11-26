"use client";

import { useTransition } from "react";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";
import { signOutToLogin } from "@/lib/session";
import { useRouter } from "next/navigation";
import { PORTALS, type PortalRole } from "@/lib/portals";

interface Props {
  requiredRole: PortalRole;
  currentRole: PortalRole | null;
}

export default function AccessDenied({ requiredRole, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const required = PORTALS[requiredRole].name;
  const current = currentRole ? PORTALS[currentRole].name : null;

  return (
    <StatusScreen
      icon={<ShieldAlert />}
      tone="danger"
      title="Accès non autorisé à cet espace"
      actions={
        <>
          {currentRole && currentRole !== requiredRole && (
            <Button variant="primary" size="lg" onClick={() => router.push(PORTALS[currentRole].path)} leftIcon={<ArrowLeft className="size-4" aria-hidden />} className="w-full justify-center">
              Ouvrir {current}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            isLoading={isPending}
            loadingText="Déconnexion"
            onClick={() => startTransition(() => signOutToLogin())}
            leftIcon={<LogOut className="size-4" aria-hidden />}
            className="w-full justify-center"
          >
            Se connecter avec un autre code d’accès
          </Button>
        </>
      }
    >
      <p>
        Cette page est réservée au personnel habilité : <strong className="font-semibold text-fg">{required}</strong>.
      </p>
      <p className="mt-1">{current ? `Vous êtes connecté avec l’accès « ${current} ».` : "Vous n’êtes pas connecté."}</p>
    </StatusScreen>
  );
}
