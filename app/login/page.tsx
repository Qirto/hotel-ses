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
        background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)",
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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#e2e8f0",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <span aria-hidden="true">🏨</span>
            <span>Grand Palace Hotel Management • SES Portal Gateway</span>
          </div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #ffffff 30%, #cbd5e1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Department Access Control & Portal Authentication
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: 15, marginTop: 10, maxWidth: 680, marginInline: "auto", lineHeight: 1.6 }}>
            Select your assigned hotel department to authenticate. Each portal features an isolated workspace with strict role-based access control, realtime event synchronization, and dedicated operational queues.
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
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <span aria-hidden="true">⚠️ </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cookie & Security Notice Banner */}
        <section
          aria-label="Security and Cookie Disclosure"
          style={{
            maxWidth: 820,
            margin: "0 auto 2rem",
            padding: "12px 20px",
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 13,
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>🔒</span>
            <span>
              <strong>Operational Security Notice:</strong> Authentication sets a strictly necessary session cookie (<code>hotel_role</code>). Staff activity is logged for safety and audit integrity.
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/privacy" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>
              Privacy & Cookies
            </Link>
            <span aria-hidden="true" style={{ color: "#64748b" }}>•</span>
            <Link href="/tos" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>
              Staff Terms (AUP)
            </Link>
          </div>
        </section>

        {/* 3 DISTINCT DEPARTMENT LOGIN CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 24, marginBottom: "3rem" }}>
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
              background: selectedRole === "reception" ? "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(2, 132, 199, 0.3))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "reception" ? "#38bdf8" : "rgba(255, 255, 255, 0.12)",
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
                <span style={{ fontSize: 32 }} aria-hidden="true">🛎️</span>
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
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 16 }}>
                Front desk operations: room check-ins, guest stay states, cleanliness status, and rapid ticket dispatches.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <span aria-hidden="true">🔑 </span><strong>Scope:</strong> Manage Rooms & Reclamations<br />
                <span aria-hidden="true">🔒 </span><strong>Security:</strong> PIN required (Default: 1111)
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
                aria-label="Login to Reception Portal"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("reception", selectedRole === "reception" ? passcode : undefined);
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
              background: selectedRole === "rh" ? "linear-gradient(145deg, rgba(6, 32, 22, 0.95), rgba(5, 150, 105, 0.3))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "rh" ? "#34d399" : "rgba(255, 255, 255, 0.12)",
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
                <span style={{ fontSize: 32 }} aria-hidden="true">👥</span>
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
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 16 }}>
                Human resources management: staff directory, weekly shift scheduling roster, department CRUD & attendance.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(6, 32, 22, 0.8)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <span aria-hidden="true">🔑 </span><strong>Scope:</strong> Staff, Shifts, Departments & Redirection<br />
                <span aria-hidden="true">🔒 </span><strong>Security:</strong> PIN required (Default: 2222)
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
                aria-label="Login to RH Manager Portal"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("rh", selectedRole === "rh" ? passcode : undefined);
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
              background: selectedRole === "gm" ? "linear-gradient(145deg, rgba(20, 16, 41, 0.95), rgba(217, 119, 6, 0.3))" : "rgba(15, 23, 42, 0.7)",
              border: "2px solid",
              borderColor: selectedRole === "gm" ? "#fbbf24" : "rgba(255, 255, 255, 0.12)",
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
                <span style={{ fontSize: 32 }} aria-hidden="true">👔</span>
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
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 16 }}>
                Executive lounge: hotel KPIs, analytics, confidential grievance desk, and 341-room state matrix.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(20, 16, 41, 0.8)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#e2e8f0", marginBottom: 16 }}>
                <span aria-hidden="true">🔑 </span><strong>Scope:</strong> Executive KPIs, Audits & Grievance Desk<br />
                <span aria-hidden="true">🔒 </span><strong>Security:</strong> PIN required (Default: 3333)
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
                aria-label="Login to GM Executive Portal"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("gm", selectedRole === "gm" ? passcode : undefined);
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

        {/* Global Business Details & Compliance Footer (Checkpoint 1, 2, 4, 16) */}
        <footer
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            fontSize: 13,
            color: "#cbd5e1",
            lineHeight: 1.6,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 6, fontSize: 14 }}>
              Grand Palace Hotel SES Operations
            </div>
            <p style={{ margin: 0, color: "#94a3b8" }}>
              Enterprise Property & Incident Management Platform<br />
              12 Avenue des Palaces, 75008 Paris, France<br />
              SIRET: 849 203 118 00024 • Hospitality Code NAF: 5510Z
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 6, fontSize: 14 }}>
              Support & Internal Contacts
            </div>
            <p style={{ margin: 0, color: "#94a3b8" }}>
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
              <li style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                Hotel SES v1.4.0 • Built with Next.js 16 & Supabase
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </main>
  );
}
