"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, Smartphone } from "lucide-react";
import { dismissedRecently, InstallCard, isStandaloneApp, rememberDismissal } from "@/components/app/InstallCard";

const KEY = "hotel-ios-pwa-dismissed";

export default function InstallBannerIOS() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    if (!isIOS || isStandaloneApp() || dismissedRecently(KEY)) return;
    // Wait a moment so it doesn't flash on page load.
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <InstallCard
      title="Add Hotel SES to your Home Screen"
      icon={<Smartphone />}
      onDismiss={() => {
        rememberDismissal(KEY);
        setVisible(false);
      }}
    >
      <ol className="mt-1 flex flex-col gap-1.5">
        <li className="flex items-center gap-2">
          <Share className="size-4 shrink-0 text-fg" aria-hidden /> Tap Share in Safari
        </li>
        <li className="flex items-center gap-2">
          <SquarePlus className="size-4 shrink-0 text-fg" aria-hidden /> Choose “Add to Home Screen”
        </li>
      </ol>
    </InstallCard>
  );
}
