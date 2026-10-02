"use client";

import React, { useEffect, useState } from "react";

export default function InstallBannerIOS() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only detect on client
    if (typeof window === "undefined") return;

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;

    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (!isIOS || isStandalone) return;

    // Check 7-day dismissal
    const dismissedAt = localStorage.getItem("hotel-ios-pwa-dismissed");
    if (dismissedAt) {
      const daysPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) return;
    }

    // Delay 2 seconds to not immediately flash on page load
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("hotel-ios-pwa-dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Hotel SES on iOS"
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 32px))",
        background: "#111827",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        borderRadius: 16,
        padding: "1.25rem",
        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.6)",
        zIndex: 99999,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/icons/apple-touch-icon.png"
            alt="Hotel SES Icon"
            style={{ width: 38, height: 38, borderRadius: 9 }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
              Install Hotel SES App
            </div>
            <div style={{ fontSize: 11, color: "#c1cad8" }}>
              For iPhone & iPad Safari
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Close installation guide"
          style={{
            background: "transparent",
            border: "none",
            color: "#8b97a8",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#c1cad8", lineHeight: 1.6, marginBottom: 14 }}>
        Install without an App Store download in 3 quick steps:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: 12, color: "#e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a2234", padding: "8px 10px", borderRadius: 8 }}>
          <span style={{ fontWeight: 800, color: "#38bdf8", width: 16 }}>1.</span>
          <span>Tap the Safari <strong>Share</strong> button <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> below</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a2234", padding: "8px 10px", borderRadius: 8 }}>
          <span style={{ fontWeight: 800, color: "#38bdf8", width: 16 }}>2.</span>
          <span>Scroll down and tap <strong>Add to Home Screen</strong> [+]</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a2234", padding: "8px 10px", borderRadius: 8 }}>
          <span style={{ fontWeight: 800, color: "#38bdf8", width: 16 }}>3.</span>
          <span>Tap <strong>Add</strong> in the top-right corner</span>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleDismiss}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: 8,
          border: "none",
          background: "#0284c7",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Got it!
      </button>
    </div>
  );
}
