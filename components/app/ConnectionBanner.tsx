"use client";

import { RadioTower, WifiOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useOnline, useRealtimeState } from "@/lib/connection";

/**
 * Tells staff when what they see may be out of date, above every portal page.
 * Offline: changes are refused (usePortalState). Live updates down: changes still
 * work, but other people's changes are not arriving until it reconnects.
 * Both refetch automatically on recovery.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const realtime = useRealtimeState();

  if (!online) {
    return (
      <Alert tone="warning" icon={<WifiOff />} className="mb-4 md:mb-6">
        <p className="font-medium">You&apos;re offline</p>
        <p className="text-fg-secondary">This screen may be out of date and changes are paused. It refreshes as soon as you&apos;re back online.</p>
      </Alert>
    );
  }

  if (realtime === "reconnecting") {
    return (
      <Alert tone="warning" icon={<RadioTower />} className="mb-4 md:mb-6">
        <p className="font-medium">Live updates paused</p>
        <p className="text-fg-secondary">Reconnecting. Other people&apos;s changes will appear once the connection is back.</p>
      </Alert>
    );
  }

  return null;
}
