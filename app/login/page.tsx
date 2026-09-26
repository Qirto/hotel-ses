"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAsRole } from "@/app/actions";

export default function LoginPage() {
  const router = Router();
  const [selectedRole, setSelectedRole] = useState<"reception" | "rh" | "gm">("reception");
  const [passcode, setPasscode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function Router() {
    return useRouter();
  }

  const handleLogin = (roleToLogin: "reception" | "rh" | "gm", codeInput?: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await loginAsRole(roleToLogin, codeInput);
      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Login failed.");
      }
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1080, width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <span>🏨 Grand Palace Hotel Portal Gateway</span>
          </div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #ffffff 30%, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Department Access Control & Portal Authentication
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 15, marginTop: 8, maxWidth: 640, marginInline: "auto" }}>
            Select your assigned hotel department to authenticate. Each portal features an isolated workspace with strict role-based access control and custom department styling.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto 2rem",
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 3 DISTINCT DEPARTMENT LOGIN CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 24 }}>
          {/* 1. RECEPTION LOGIN PORTAL (CYAN THEME) */}
          <div
            onClick={() => setSelectedRole("reception")}
            style={{
              background: selectedRole === "reception" ? "linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 132, 199, 0.25))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "reception" ? "#38bdf8" : "rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "1.75rem",
              boxShadow: selectedRole === "reception" ? "0 15px 35px rgba(56, 189, 248, 0.25)" : "0 10px 25px rgba(0,0,0,0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 32 }}>🛎️</span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  CYAN LUXURY THEME
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                Reception Desk
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 16 }}>
                Front desk operations: room check-ins, guest stay states, cleanliness status, and rapid ticket dispatches.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#cbd5e1", marginBottom: 16 }}>
                🔑 <strong>Scope:</strong> Manage Rooms & Manage Reclamations<br />
                🔒 <strong>PIN Code:</strong> <code>1111</code>
              </div>
            </div>

            <div>
              {selectedRole === "reception" && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="password"
                    placeholder="Enter Reception PIN (1111)..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("reception", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid #38bdf8",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                  />
                </div>
              )}

              <button
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("reception", selectedRole === "reception" && passcode ? passcode : "1111");
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
                  transition: "transform 0.1s ease",
                }}
              >
                {isPending && selectedRole === "reception" ? "Authenticating..." : "Login to Reception Portal 🛎️"}
              </button>
            </div>
          </div>

          {/* 2. RH MANAGER LOGIN PORTAL (EMERALD MINT THEME) */}
          <div
            onClick={() => setSelectedRole("rh")}
            style={{
              background: selectedRole === "rh" ? "linear-gradient(145deg, rgba(6, 32, 22, 0.95), rgba(5, 150, 105, 0.25))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "rh" ? "#34d399" : "rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "1.75rem",
              boxShadow: selectedRole === "rh" ? "0 15px 35px rgba(52, 211, 153, 0.25)" : "0 10px 25px rgba(0,0,0,0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 32 }}>👥</span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(52, 211, 153, 0.15)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    color: "#34d399",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  EMERALD MINT THEME
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                RH / HR Manager
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 16 }}>
                Human resources management: staff directory, weekly shift scheduling roster, reclamations overview & room state view.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(6, 32, 22, 0.8)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#cbd5e1", marginBottom: 16 }}>
                🔑 <strong>Scope:</strong> Employees, Shifts, Reclamations & Rooms<br />
                🔒 <strong>PIN Code:</strong> <code>2222</code>
              </div>
            </div>

            <div>
              {selectedRole === "rh" && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="password"
                    placeholder="Enter RH Manager PIN (2222)..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("rh", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(6, 32, 22, 0.9)",
                      border: "1px solid #34d399",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                  />
                </div>
              )}

              <button
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("rh", selectedRole === "rh" && passcode ? passcode : "2222");
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #059669, #34d399)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(52, 211, 153, 0.4)",
                  transition: "transform 0.1s ease",
                }}
              >
                {isPending && selectedRole === "rh" ? "Authenticating..." : "Login to RH Manager Portal 👥"}
              </button>
            </div>
          </div>

          {/* 3. GENERAL MANAGER LOGIN PORTAL (IMPERIAL GOLD THEME) */}
          <div
            onClick={() => setSelectedRole("gm")}
            style={{
              background: selectedRole === "gm" ? "linear-gradient(145deg, rgba(20, 16, 41, 0.95), rgba(217, 119, 6, 0.25))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "gm" ? "#fbbf24" : "rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "1.75rem",
              boxShadow: selectedRole === "gm" ? "0 15px 35px rgba(251, 191, 36, 0.25)" : "0 10px 25px rgba(0,0,0,0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 32 }}>👔</span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(251, 191, 36, 0.15)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    color: "#fbbf24",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  IMPERIAL GOLD THEME
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                General Manager (GM)
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 16 }}>
                Executive lounge: hotel KPIs, analytics, confidential grievance desk, and 341-room state matrix.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(20, 16, 41, 0.8)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#cbd5e1", marginBottom: 16 }}>
                🔑 <strong>Scope:</strong> Statistics, Reclamations & Room State<br />
                🔒 <strong>PIN Code:</strong> <code>3333</code>
              </div>
            </div>

            <div>
              {selectedRole === "gm" && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="password"
                    placeholder="Enter General Manager PIN (3333)..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("gm", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(20, 16, 41, 0.9)",
                      border: "1px solid #fbbf24",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                  />
                </div>
              )}

              <button
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("gm", selectedRole === "gm" && passcode ? passcode : "3333");
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #d97706, #fbbf24)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4)",
                  transition: "transform 0.1s ease",
                }}
              >
                {isPending && selectedRole === "gm" ? "Authenticating..." : "Login to GM Executive Portal 👔"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
