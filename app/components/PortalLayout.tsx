"use client";

import React from "react";

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
  return (
    <div className="app-shell-root">
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        {sidebar}
      </aside>

      <div className="app-content-area">
        {/* Mobile Header */}
        <header className="mobile-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/hotel-logo.png"
              alt="Hôtel Méditerranée Thalasso Golf Hammamet"
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
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
        </header>

        <main className="app-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

