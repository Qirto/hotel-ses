"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithPasscode } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isPending) return;

    setErrorMessage(null);
    startTransition(async () => {
      const res = await loginWithPasscode(passcode);
      if (res.success && res.redirectUrl) {
        setSuccessRole(res.role || "workspace");
        setTimeout(() => {
          router.push(res.redirectUrl!);
          router.refresh();
        }, 350);
      } else {
        setErrorMessage(res.error || "Authentication failed. Please verify your passcode.");
      }
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217, 119, 6, 0.12), transparent 70%), #070a0f",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Brand & Monogram Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ display: "inline-block", position: "relative", marginBottom: "1rem" }}>
            <img
              src="/hotel-logo.png"
              alt="Hôtel Méditerranée Thalasso Golf Hammamet"
              style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                objectFit: "cover",
                border: "2px solid rgba(217, 119, 6, 0.4)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                display: "block",
              }}
            />
          </div>

          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#d97706",
              fontWeight: 800,
              margin: "0 0 0.375rem 0",
              lineHeight: 1.3,
            }}
          >
            Hôtel Méditerranée Thalasso Golf Hammamet
          </p>
          <h1
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.025em",
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            Hotel SES
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              marginTop: "0.5rem",
              lineHeight: 1.5,
            }}
          >
            Internal Hotel Operations & Staff Access
          </p>
        </div>

        {/* Unified Login Card */}
        <section
          style={{
            background: "rgba(17, 24, 39, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
          }}
        >
          <form onSubmit={handleSubmit} role="form" noValidate>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="passcode-input"
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: "0.5rem",
                }}
              >
                Access Passcode
              </label>

              <div style={{ position: "relative" }}>
                <input
                  id="passcode-input"
                  name="passcode"
                  type={showPasscode ? "text" : "password"}
                  autoFocus
                  required
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your access passcode"
                  disabled={isPending || Boolean(successRole)}
                  style={{
                    width: "100%",
                    height: 48,
                    padding: "0 46px 0 14px",
                    background: "#0b0f17",
                    border: errorMessage
                      ? "1px solid #ef4444"
                      : "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: 10,
                    color: "#ffffff",
                    fontSize: "0.9375rem",
                    letterSpacing: showPasscode ? "normal" : "0.15em",
                    fontFamily: showPasscode ? "inherit" : "monospace",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    /* Override global focus ring with amber */
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#d97706";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errorMessage
                      ? "#ef4444"
                      : "rgba(255, 255, 255, 0.14)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />

                {/* Show/Hide passcode toggle button */}
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPasscode ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message Pill */}
            {errorMessage && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  marginBottom: "1.25rem",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Feedback Banner */}
            {successRole && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#6ee7b7",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: "1.25rem",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Authorization verified. Opening workspace...</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isPending || !passcode.trim() || Boolean(successRole)}
              className="btn-primary"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                background:
                  passcode.trim() && !isPending && !successRole
                    ? "#d97706"
                    : "#92400e",
                border: "none",
                color: "#ffffff",
                fontSize: "0.9375rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: isPending || !passcode.trim() ? "not-allowed" : "pointer",
                opacity: isPending || !passcode.trim() ? 0.7 : 1,
                transition: "background 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease",
                boxShadow:
                  passcode.trim() && !isPending && !successRole
                    ? "0 4px 20px rgba(217, 119, 6, 0.45)"
                    : "none",
              }}
            >
              {isPending ? (
                <>
                  <svg
                    style={{ animation: "spin 1s linear infinite" }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : successRole ? (
                <span>Redirecting...</span>
              ) : (
                <>
                  <span>Access Workspace</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Portal Hint for Authorized Personnel */}
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#94a3b8",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              System Secure
            </span>
            <span style={{ color: "#64748b" }}>SES v1.4.0</span>
          </div>
        </section>

        {/* Minimal Accessible Footer */}
        <footer
          style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#64748b",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              href="/offline"
              style={{ color: "#94a3b8", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d97706")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              System Offline Mode
            </Link>
            <span>•</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                  if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                      await reg.unregister();
                    }
                  }
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                } catch (e) {
                  window.location.reload();
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#d97706",
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Clear Mobile Cache & Reload
            </button>
            <span>•</span>
            <span style={{ color: "#64748b" }}>Authorized Personnel Only</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.6875rem" }}>
            Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
