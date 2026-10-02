"use client";

import React from "react";
import { NavTabItem } from "./BottomNav";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  items: NavTabItem[];
  departmentName: string;
  departmentCode: string;
  departmentColor?: string;
  onSignOut?: () => void;
  signOutAction?: React.ReactNode;
}

export default function Sidebar({
  items,
  departmentName,
  departmentCode,
  departmentColor = "var(--accent-amber)",
  onSignOut,
  signOutAction,
}: SidebarProps) {
  return (
    <aside className="desktop-sidebar" aria-label="Main Navigation">
      {/* Top Brand Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem", padding: "0 6px" }}>
          <img
            src="/icons/icon-96x96.png"
            alt="Hotel SES Logo"
            style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border-subtle)" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
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
                  letterSpacing: "0.05em",
                }}
              >
                {departmentCode}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {departmentName}
            </div>
          </div>
        </div>

        {/* Navigation Item List */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`sidebar-nav-btn ${item.isActive ? "active" : ""}`}
              aria-current={item.isActive ? "page" : undefined}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 9999,
                    background: "var(--status-rose)",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Theme Toggle & Sign Out */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
        {/* Full Theme Toggle Button */}
        <ThemeToggle variant="full" />

        {/* Sign Out */}
        {signOutAction ? (
          signOutAction
        ) : onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--status-rose)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--status-rose-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
