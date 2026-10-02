"use client";

import React from "react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f17",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            color: "#38bdf8",
            marginBottom: 20,
          }}
        >
          📶
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#fbbf24",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Offline Mode
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 10px", color: "#ffffff", letterSpacing: "-0.02em" }}>
          No Internet Connection
        </h1>

        <p style={{ fontSize: 14, color: "#c1cad8", lineHeight: 1.6, marginBottom: 24 }}>
          Hotel SES requires an active network connection to synchronize real-time room statuses and incident tickets.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              background: "#0284c7",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Reconnecting
          </button>

          <Link
            href="/login"
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "transparent",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box",
              display: "inline-block",
            }}
          >
            Return to Login Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
