"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutRole } from "@/app/actions";

interface Props {
  requiredRole: "reception" | "rh" | "gm";
  currentRole: string | null;
}

const ROLE_NAMES: Record<string, string> = {
  reception: "Reception Desk",
  rh: "Human Resources (HR)",
  gm: "General Manager (GM)",
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
          maxWidth: 500,
          width: "100%",
          background: "#111827",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: 16,
          padding: "2.25rem",
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 14 }}>
          HTTP 403 • Role Access Mismatch
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 10px", color: "#ffffff", letterSpacing: "-0.02em" }}>
          Access Denied
        </h1>

        <p style={{ fontSize: 14, color: "#c1cad8", lineHeight: 1.6, marginBottom: 16 }}>
          This workspace is restricted to <strong>{requiredRoleName}</strong> staff only.
        </p>

        <div style={{ padding: "12px", borderRadius: 8, background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#c1cad8", marginBottom: 20 }}>
          Your current session: <strong style={{ color: "#fca5a5" }}>{currentRoleName}</strong>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {currentRole && currentRole !== requiredRole && (
            <button
              className="btn-primary"
              onClick={() => router.push(`/${currentRole}`)}
              aria-label={`Return to your authorized portal: ${ROLE_NAMES[currentRole] || currentRole}`}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 8,
                border: "1px solid rgba(56, 189, 248, 0.4)",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              &larr; Return to Workspace ({ROLE_NAMES[currentRole] || currentRole})
            </button>
          )}

          <button
            className="btn-primary"
            disabled={isPending}
            onClick={handleLogout}
            aria-label="Log out and switch department"
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isPending ? "Logging out..." : "Log Out & Switch Department"}
          </button>
        </div>
      </div>
    </div>
  );
}
