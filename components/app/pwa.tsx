"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Registers the service worker (app/sw.ts, served at /serwist/sw.js) and offers
 * new versions with an explicit prompt.
 *
 * - Production only: in development the worker would cache dev bundles.
 * - cacheOnNavigation off: visited pages hold signed-in data and must not be cached.
 * - reloadOnOnline off: a forced reload would wipe half-filled forms; the portals
 *   refetch their data on reconnect instead (useRealtimeRefresh).
 * - updateViaCache "none": the browser always revalidates the worker script.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV !== "production"}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ scope: "/", type: "classic", updateViaCache: "none" }}
    >
      {children}
      <UpdatePrompt />
    </SerwistProvider>
  );
}

/** "Update available": the new worker waits until the user chooses to reload. */
function UpdatePrompt() {
  const { serwist } = useSerwist();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setWaiting(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  if (!waiting || !serwist) return null;

  const update = () => {
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  };

  return (
    <div className="fixed inset-x-4 bottom-[calc(5rem+var(--safe-bottom,0px))] z-[75] mx-auto max-w-md md:bottom-6">
      <Alert
        tone="neutral"
        icon={<RefreshCw />}
        className="shadow-float"
        actionsBelow
        action={
          <>
            <Button type="button" variant="ghost" size="touch" onClick={() => setWaiting(false)}>
              Plus tard
            </Button>
            <Button type="button" variant="primary" size="touch" onClick={update}>
              Recharger
            </Button>
          </>
        }
      >
        <AlertTitle>Mise à jour disponible</AlertTitle>
        <AlertDescription>Une nouvelle version de Hotel SES est prête.</AlertDescription>
      </Alert>
    </div>
  );
}
