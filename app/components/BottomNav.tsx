"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
  isActive: boolean;
}

interface BottomNavProps {
  items: NavTabItem[];
  showThemeToggle?: boolean;
}

export default function BottomNav({ items, showThemeToggle = true }: BottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={`bottom-nav-item ${item.isActive ? "active" : ""}`}
          aria-label={item.label}
          aria-current={item.isActive ? "page" : undefined}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {item.icon}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="bottom-nav-badge">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </div>
          <span>{item.label}</span>
        </button>
      ))}

      {showThemeToggle && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 6px" }}>
          <ThemeToggle />
        </div>
      )}
    </nav>
  );
}
