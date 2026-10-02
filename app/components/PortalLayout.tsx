"use client";

import React, { useState, useEffect } from "react";

interface PortalLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  departmentName: string;
  departmentColor: string;
  departmentCode: string;
}

export default function PortalLayout({
  children,
  sidebar,
  departmentName,
  departmentColor,
  departmentCode,
}: PortalLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="portal-mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/icons/icon-96x96.png"
            alt="Hotel SES"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
              Hotel SES
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${departmentColor}22`,
                border: `1px solid ${departmentColor}55`,
                color: departmentColor,
                textTransform: "uppercase",
              }}
            >
              {departmentCode}
            </span>
          </div>
        </div>

        {/* Hamburger Drawer Toggle Button */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          aria-label={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isDrawerOpen}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            width: 38,
            height: 38,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span style={{ width: 18, height: 2, background: "#ffffff", borderRadius: 1 }} />
          <span style={{ width: 18, height: 2, background: "#ffffff", borderRadius: 1 }} />
          <span style={{ width: 18, height: 2, background: "#ffffff", borderRadius: 1 }} />
        </button>
      </header>

      {/* Backdrop for Mobile Drawer */}
      <div
        className={`portal-backdrop ${isDrawerOpen ? "active" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Main Shell Layout */}
      <div className="portal-layout-wrapper">
        <aside className={`portal-sidebar ${isDrawerOpen ? "drawer-open" : ""}`}>
          {sidebar}
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </>
  );
}
