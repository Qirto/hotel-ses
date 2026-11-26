"use client";

import { RadioTower, WifiOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useOnline, useRealtimeState } from "@/lib/connection";

/**
 * Tells staff when what they see may be out of date, above every portal page.
 * Offline: changes are refused (useActions). Live updates down: changes still
 * work, but other people's changes are not arriving until it reconnects.
 * Both refetch automatically on recovery.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const realtime = useRealtimeState();

  if (!online) {
    return (
      <Alert tone="warning" icon={<WifiOff />} className="mb-4 md:mb-6">
        <p className="font-medium">Vous êtes hors ligne</p>
        <p className="text-fg-secondary">Cet écran n’est peut-être pas à jour et les modifications sont suspendues. Il se met à jour dès le retour de la connexion.</p>
      </Alert>
    );
  }

  if (realtime === "reconnecting") {
    return (
      <Alert tone="warning" icon={<RadioTower />} className="mb-4 md:mb-6">
        <p className="font-medium">Mises à jour en direct suspendues</p>
        <p className="text-fg-secondary">Reconnexion en cours. Les modifications de vos collègues s’afficheront dès le retour de la connexion.</p>
      </Alert>
    );
  }

  return null;
}
