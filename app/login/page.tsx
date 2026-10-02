"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAsRole } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"reception" | "rh" | "gm">("reception");
  const [passcode, setPasscode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        background: "#0b0f17",
        borderTop: "2px solid rgba(217, 119, 6, 0.4)",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1rem",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Sign in to your workspace
          </h1>
          <p
            style={{
              color: "#c1cad8",
              fontSize: 15,
              marginTop: 10,
              maxWidth: 620,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            Select your department. Your workspace opens immediately.
          </p>
        </header>

        {/* Error Feedback */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              maxWidth: 600,
              margin: "0 auto 2rem",
              padding: "12px 18px",
              borderRadius: 8,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cookie & Security Notice Banner */}
        <section
          aria-label="Security and Cookie Disclosure"
          style={{
            maxWidth: 860,
            margin: "0 auto 2rem",
            padding: "12px 20px",
            borderRadius: 10,
            background: "#111827",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 13,
            color: "#c1cad8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Security
            </span>
            <span>
              Authentication sets a strictly necessary session cookie (<code>hotel_role</code>). Staff activity is logged for safety and audit integrity.
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/privacy" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>
              Privacy & Cookies
            </Link>
            <span aria-hidden="true" style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
            <Link href="/tos" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>
              Staff Terms (AUP)
            </Link>
          </div>
        </section>

        {/* 3 DISTINCT DEPARTMENT LOGIN CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(310px, 100%), 1fr))", gap: 24, marginBottom: "3rem" }}>
          {/* 1. RECEPTION LOGIN PORTAL (CYAN THEME) */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === "reception"}
            aria-label="Select Reception Desk Portal"
            onClick={() => setSelectedRole("reception")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedRole("reception");
              }
            }}
            style={{
              background: selectedRole === "reception" ? "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(2, 132, 199, 0.2))" : "#111827",
              border: "2px solid",
              borderColor: selectedRole === "reception" ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              cursor: "pointer",
              transition: "border-color 0.2s ease, background 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#38bdf8",
                  }}
                >
                  RD
                </div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    color: "#38bdf8",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Level 1 — Reception
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                Reception Desk
              </h2>
              <p style={{ fontSize: 13, color: "#c1cad8", lineHeight: 1.5, marginBottom: 16 }}>
                Front desk operations: room check-ins, guest stay states, cleanliness status, and rapid ticket dispatches.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>Scope:</span> Manage Rooms & Reclamations
                </div>
                <div>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>Security:</span> PIN required (Default: 1111)
                </div>
              </div>
            </div>

            <div>
              {selectedRole === "reception" && (
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="passcode-reception" className="sr-only">
                    Reception Desk Passcode
                  </label>
                  <input
                    id="passcode-reception"
                    type="password"
                    placeholder="Enter Reception PIN..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("reception", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid #38bdf8",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                </div>
              )}

              <button
                className="btn-primary"
                disabled={isPending}
                aria-label="Sign in to Reception"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("reception", selectedRole === "reception" ? passcode : undefined);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                }}
              >
                {isPending && selectedRole === "reception" ? "Authenticating..." : "Sign in to Reception"}
              </button>
            </div>
          </div>

          {/* 2. RH MANAGER LOGIN PORTAL (EMERALD MINT THEME) */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === "rh"}
            aria-label="Select Human Resources Portal"
            onClick={() => setSelectedRole("rh")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedRole("rh");
              }
            }}
            style={{
              background: selectedRole === "rh" ? "linear-gradient(145deg, rgba(6, 32, 22, 0.98), rgba(5, 150, 105, 0.2))" : "#111827",
              border: "2px solid",
              borderColor: selectedRole === "rh" ? "#34d399" : "rgba(255, 255, 255, 0.1)",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              cursor: "pointer",
              transition: "border-color 0.2s ease, background 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(52, 211, 153, 0.15)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#34d399",
                  }}
                >
                  HR
                </div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(52, 211, 153, 0.12)",
                    border: "1px solid rgba(52, 211, 153, 0.25)",
                    color: "#34d399",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Level 2 — Human Resources
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                RH / HR Manager
              </h2>
              <p style={{ fontSize: 13, color: "#c1cad8", lineHeight: 1.5, marginBottom: 16 }}>
                Human resources management: staff directory, weekly shift scheduling roster, department CRUD & attendance.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>Scope:</span> Staff, Shifts, Departments & Redirection
                </div>
                <div>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>Security:</span> PIN required (Default: 2222)
                </div>
              </div>
            </div>

            <div>
              {selectedRole === "rh" && (
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="passcode-rh" className="sr-only">
                    HR Manager Passcode
                  </label>
                  <input
                    id="passcode-rh"
                    type="password"
                    placeholder="Enter RH Manager PIN..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("rh", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(6, 32, 22, 0.9)",
                      border: "1px solid #34d399",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                </div>
              )}

              <button
                className="btn-primary"
                disabled={isPending}
                aria-label="Sign in to HR Management"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("rh", selectedRole === "rh" ? passcode : undefined);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#059669",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                }}
              >
                {isPending && selectedRole === "rh" ? "Authenticating..." : "Sign in to HR Management"}
              </button>
            </div>
          </div>

          {/* 3. GENERAL MANAGER LOGIN PORTAL (IMPERIAL GOLD THEME) */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === "gm"}
            aria-label="Select General Manager Portal"
            onClick={() => setSelectedRole("gm")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedRole("gm");
              }
            }}
            style={{
              background: selectedRole === "gm" ? "linear-gradient(145deg, rgba(20, 16, 41, 0.98), rgba(217, 119, 6, 0.2))" : "#111827",
              border: "2px solid",
              borderColor: selectedRole === "gm" ? "#fbbf24" : "rgba(255, 255, 255, 0.1)",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              cursor: "pointer",
              transition: "border-color 0.2s ease, background 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(251, 191, 36, 0.15)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#fbbf24",
                  }}
                >
                  GM
                </div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(251, 191, 36, 0.12)",
                    border: "1px solid rgba(251, 191, 36, 0.25)",
                    color: "#fbbf24",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Level 3 — General Manager
                </span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
                General Manager (GM)
              </h2>
              <p style={{ fontSize: 13, color: "#c1cad8", lineHeight: 1.5, marginBottom: 16 }}>
                Executive lounge: hotel KPIs, analytics, confidential grievance desk, and 341-room state matrix.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#1a2234", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>Scope:</span> Executive KPIs, Audits & Grievance Desk
                </div>
                <div>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>Security:</span> PIN required (Default: 3333)
                </div>
              </div>
            </div>

            <div>
              {selectedRole === "gm" && (
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="passcode-gm" className="sr-only">
                    General Manager Passcode
                  </label>
                  <input
                    id="passcode-gm"
                    type="password"
                    placeholder="Enter General Manager PIN..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("gm", passcode)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(20, 16, 41, 0.9)",
                      border: "1px solid #fbbf24",
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 8,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                </div>
              )}

              <button
                className="btn-primary"
                disabled={isPending}
                aria-label="Sign in to GM Executive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("gm", selectedRole === "gm" ? passcode : undefined);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#d97706",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
                }}
              >
                {isPending && selectedRole === "gm" ? "Authenticating..." : "Sign in to GM Executive"}
              </button>
            </div>
          </div>
        </div>

        {/* Global Business Details & Compliance Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
            gap: 20,
            fontSize: 13,
            color: "#c1cad8",
            lineHeight: 1.6,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 6, fontSize: 14 }}>
              Grand Palace Hotel SES Operations
            </div>
            <p style={{ margin: 0, color: "#8b97a8" }}>
              Hotel SES — Internal Staff Portal<br />
              12 Avenue des Palaces, 75008 Paris, France<br />
              SIRET: 849 203 118 00024 • Hospitality Code NAF: 5510Z
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 6, fontSize: 14 }}>
              Support & Internal Contacts
            </div>
            <p style={{ margin: 0, color: "#8b97a8" }}>
              IT Helpdesk: Ext. 4004 (<a href="mailto:it-support@grandpalacehotel.com" style={{ color: "#38bdf8" }}>it-support@grandpalacehotel.com</a>)<br />
              Data Protection (DPO): <a href="mailto:dpo@grandpalacehotel.com" style={{ color: "#38bdf8" }}>dpo@grandpalacehotel.com</a><br />
              Emergency Facilities: Radio Ch. 3 (Maintenance)
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 6, fontSize: 14 }}>
              Compliance & Legal Policies
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>
                <Link href="/privacy" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                  Staff Data Privacy & Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/tos" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                  Acceptable Use Policy & System Terms
                </Link>
              </li>
              <li style={{ color: "#8b97a8", fontSize: 12, marginTop: 4 }}>
                Hotel SES v1.4.0 • Built with Next.js 16 & Supabase
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </main>
  );
}
