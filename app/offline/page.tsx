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
      title="You're offline"
      actions={
        <>
          <Button variant="primary" size="lg" onClick={() => window.location.reload()} leftIcon={<RotateCw className="size-4" aria-hidden />} className="w-full justify-center">
            Try again
          </Button>
          <ButtonLink href="/login" variant="outline" size="lg" fullWidth>
            Back to sign in
          </ButtonLink>
        </>
      }
    >
      Hotel SES needs a connection to sync room status and tickets. Check Wi-Fi or mobile data, then try again.
    </StatusScreen>
  );
}
