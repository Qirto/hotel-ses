"use client";

import React from "react";
import Sidebar from "./Sidebar";
import BottomNav, { NavTabItem } from "./BottomNav";

interface AppShellProps {
  items: NavTabItem[];
  departmentName: string;
  departmentCode: string;
  departmentColor?: string;
  children: React.ReactNode;
  onSignOut?: () => void;
  signOutAction?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export default function AppShell({
  items,
  departmentName,
  departmentCode,
  departmentColor = "var(--accent-amber)",
  children,
  onSignOut,
  signOutAction,
  headerActions,
}: AppShellProps) {
  return (
    <div className="app-shell-root">
      {/* Desktop Sidebar (>= 768px) */}
      <Sidebar
        items={items}
        departmentName={departmentName}
        departmentCode={departmentCode}
        departmentColor={departmentColor}
        onSignOut={onSignOut}
        signOutAction={signOutAction}
      />

      <div className="app-content-area">
        {/* Mobile Top Bar (< 768px) */}
        <header className="mobile-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/icons/icon-96x96.png"
              alt="Hotel SES"
              style={{ width: 28, height: 28, borderRadius: 7 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                Hotel SES
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: `${departmentColor}1f`,
                  border: `1px solid ${departmentColor}44`,
                  color: departmentColor,
                  textTransform: "uppercase",
                }}
              >
                {departmentCode}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Quick Mobile Cache Purge & Hard Reload */}
            <button
              type="button"
              onClick={async () => {
                try {
                  if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                  if ("serviceWorker" in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                      await reg.unregister();
                    }
                  }
                  localStorage.removeItem("ses_app_cache_version");
                  window.location.reload();
                } catch (e) {
                  window.location.reload();
                }
              }}
              aria-label="Clear Cache and Reload"
              title="Clear Cache and Reload"
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "6px 8px",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {headerActions}

            {/* Mobile Sign Out Action */}
            {signOutAction ? (
              signOutAction
            ) : onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign Out"
                title="Sign Out"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "6px 8px",
                  color: "var(--status-rose)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            ) : null}
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="app-main-content">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 768px) */}
      <BottomNav items={items} showThemeToggle={true} />
    </div>
  );
}
