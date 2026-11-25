"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissedRecently, InstallCard, isStandaloneApp, rememberDismissal } from "@/components/app/InstallCard";

const KEY = "hotel-pwa-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBannerAndroid() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneApp() || dismissedRecently(KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  const dismiss = () => {
    rememberDismissal(KEY);
    setDeferredPrompt(null);
  };
  const install = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <InstallCard
      title="Install Hotel SES"
      icon={<Smartphone />}
      onDismiss={dismiss}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button variant="primary" size="sm" onClick={install} leftIcon={<Download className="size-3.5" aria-hidden />}>
            Install
          </Button>
        </>
      }
    >
      Open it from your home screen, full screen and faster.
    </InstallCard>
  );
}
