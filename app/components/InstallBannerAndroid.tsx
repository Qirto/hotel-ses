"use client";

import React, { useEffect, useState } from "react";

export default function InstallBannerAndroid() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user is already running in standalone/installed mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if user recently dismissed (within 7 days)
    const dismissedAt = localStorage.getItem("hotel-pwa-dismissed");
    if (dismissedAt) {
      const daysPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] User choice:", outcome);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("hotel-pwa-dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Install Hotel SES Web App"
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(520px, calc(100vw - 32px))",
        background: "#111827",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        animation: "slideUp 0.3s ease-out",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <img
          src="/icons/icon-96x96.png"
          alt="Hotel SES"
          style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Install Hotel SES Web App
          </div>
          <div style={{ fontSize: 11, color: "#c1cad8" }}>
            Instant home-screen access & faster offline loading
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "#8b97a8",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px",
          }}
        >
          Later
        </button>

        <button
          className="btn-primary"
          onClick={handleInstallClick}
          style={{
            background: "#0284c7",
            border: "none",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
