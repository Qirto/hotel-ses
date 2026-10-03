import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy & System Terms | Hotel SES",
  description: "Terms of service and acceptable operational use policy for Hotel SES staff users.",
};

export default function TermsOfServicePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f17",
        color: "#f8fafc",
        padding: "3rem 1.5rem",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Navigation Bar */}
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#38bdf8",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true">&larr;</span> Back to Portal Login
          </Link>

          <span style={{ fontSize: 13, color: "#cbd5e1" }}>
            Effective Date: October 2026 • Version 1.4
          </span>
        </div>

        {/* Header */}
        <header style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.12)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: 4,
              background: "rgba(251, 191, 36, 0.15)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              color: "#fbbf24",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Governance & System Security
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Acceptable Use Policy & Staff Terms
          </h1>
          <p style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
            These terms define authorized usage, confidentiality expectations, and security responsibilities for all hotel personnel accessing the Hotel SES platform.
          </p>
        </header>

        {/* Content Sections */}
        <article style={{ lineHeight: 1.75, color: "#e2e8f0", fontSize: 15 }}>
          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              1. Authorized Access & Role-Based Scope
            </h2>
            <p>
              Hotel SES is an internal management system strictly reserved for authenticated staff members of Hôtel Méditerranée Thalasso Golf Hammamet. Access is provisioned under three operational tiers:
            </p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Reception Desk (<code>/reception</code>):</strong> Front desk personnel authorized to create rapid incident tickets, update guest room occupancy states, and monitor room cleanliness indicators.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Human Resources (<code>/rh</code>):</strong> HR personnel authorized to manage employee shifts, maintain department catalogs, and reassign ticket workloads during absenteeism.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>General Management (<code>/gm</code>):</strong> Executive leadership with oversight across all 341 rooms, department SLA analytics, MTTR performance, and confidential guest grievances.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              2. Credential Security & Passcode Confidentiality
            </h2>
            <p>
              Each role portal is secured via environment-configured passcodes and cryptographic session cookies. Users must strictly adhere to the following rules:
            </p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Zero Credential Sharing:</strong> Department passcodes must never be shared with unauthorized third parties or written in plain view at workstations.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Explicit Session Termination:</strong> Staff must utilize the &ldquo;Log Out&rdquo; function before leaving a shared terminal or front-desk workstation unattended.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Incident Reporting:</strong> Any suspected unauthorized access or compromised credentials must be reported immediately to the IT Helpdesk (<a href="mailto:contact@hotelmediterraneehammamet.com" style={{ color: "#38bdf8" }}>contact@hotelmediterraneehammamet.com</a>).
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              3. Guest Privacy & Data Confidentiality
            </h2>
            <p>
              All guest information (names, room numbers, maintenance requests, and confidential grievances) stored in Hotel SES is subject to strict professional secrecy and applicable privacy statutes:
            </p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                Staff shall not extract, photograph, or duplicate guest records for personal use or external distribution.
              </li>
              <li style={{ marginBottom: 8 }}>
                Tickets designated as <strong>Confidential</strong> are routed exclusively to executive oversight and must never be discussed outside designated management channels.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              4. System Integrity & Automated Monitoring
            </h2>
            <p>
              System activity, including ticket dispatches, status acknowledgments, and attendance clock-ins, is logged for quality assurance and operational compliance. Any deliberate attempt to disrupt database integrity, bypass route guards, or manipulate SLA timers is strictly prohibited.
            </p>
          </section>
        </article>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "1.5rem",
            marginTop: "3rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/privacy" style={{ color: "#38bdf8", textDecoration: "none" }}>
              Privacy & Cookie Notice
            </Link>
            <Link href="/login" style={{ color: "#cbd5e1", textDecoration: "none" }}>
              Login Gateway
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
