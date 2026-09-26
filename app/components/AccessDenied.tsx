"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutRole } from "@/app/actions";

interface Props {
  requiredRole: "reception" | "rh" | "gm";
  currentRole: string | null;
}

const ROLE_NAMES: Record<string, string> = {
  reception: "🛎️ Receptionist",
  rh: "👥 RH / HR Manager",
  gm: "👔 General Manager (GM)",
};

export default function AccessDenied({ requiredRole, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutRole();
      router.push("/login");
      router.refresh();
    });
  };

  const requiredRoleName = ROLE_NAMES[requiredRole] || requiredRole;
  const currentRoleName = currentRole ? ROLE_NAMES[currentRole] || currentRole : "Unauthenticated Guest";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "rgba(15, 23, 42, 0.85)",
          border: "2px solid rgba(239, 68, 68, 0.4)",
          borderRadius: 20,
          padding: "2.25rem",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(239, 68, 68, 0.2)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>⛔</div>
        <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 999, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
          HTTP 403 FORBIDDEN • ROLE MISMATCH
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 10px", color: "#ffffff" }}>
          Access Denied
        </h1>

        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 16 }}>
          This portal is strictly restricted to <strong>{requiredRoleName}</strong> users only.
        </p>

        <div style={{ padding: "12px", borderRadius: 10, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          Your current session: <strong style={{ color: "#f87171" }}>{currentRoleName}</strong>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {currentRole && currentRole !== requiredRole && (
            <button
              onClick={() => router.push(`/${currentRole}`)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid rgba(56, 189, 248, 0.4)",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              &larr; Return to My Portal ({ROLE_NAMES[currentRole] || currentRole})
            </button>
          )}

          <button
            disabled={isPending}
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {isPending ? "Logging out..." : "Log Out & Select Another Portal 🚪"}
          </button>
        </div>
      </div>
    </div>
  );
}
