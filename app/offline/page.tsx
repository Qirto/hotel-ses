"use client";

import Link from "next/link";
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
          <Link
            href="/login"
            className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      Hotel SES needs a connection to sync room status and tickets. Check Wi-Fi or mobile data, then try again.
    </StatusScreen>
  );
}
