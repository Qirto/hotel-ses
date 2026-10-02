import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff & Operations Privacy Notice | Hotel SES",
  description: "Internal data privacy and cookie disclosure for Hotel SES staff and operational management.",
};

export default function PrivacyPolicyPage() {
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
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Legal Compliance & Data Protection (GDPR / DPDP)
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Staff & Operations Privacy Policy
          </h1>
          <p style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
            This Privacy Notice governs data processing across the Hotel SES (Service & Operations Management System)
            deployed at Grand Palace Hotel. It details how employee operational records, incident tickets, and resident stay metrics are managed.
          </p>
        </header>

        {/* Content Sections */}
        <article style={{ lineHeight: 1.75, color: "#e2e8f0", fontSize: 15 }}>
          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              1. Data Controller & Protection Contact
            </h2>
            <p>
              The data controller responsible for personal and operational data processed within Hotel SES is:
            </p>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "1.25rem",
                marginTop: 10,
              }}
            >
              <p style={{ margin: "0 0 6px" }}><strong>Entity:</strong> Grand Palace Hotel Management S.A.S.</p>
              <p style={{ margin: "0 0 6px" }}><strong>Address:</strong> 12 Avenue des Palaces, 75008 Paris, France</p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Data Protection Officer (DPO):</strong>{" "}
                <a href="mailto:dpo@grandpalacehotel.com" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                  dpo@grandpalacehotel.com
                </a>
              </p>
              <p style={{ margin: 0 }}>
                <strong>IT Support & Incident Inquiries:</strong>{" "}
                <a href="mailto:it-support@grandpalacehotel.com" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                  it-support@grandpalacehotel.com
                </a>
              </p>
            </div>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              2. Categories of Data Collected
            </h2>
            <p>Hotel SES processes operational information strictly limited to hotel management tasks:</p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Staff Profiles & Attendance:</strong> Full legal name, assigned role (receptionist, technician, governance, HR), department code, internal extension/phone number, shift presence status, skill tags, and clock-in timestamps.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Incident & Maintenance Tickets:</strong> Room number, issue description, priority tier (Standard, High, Emergency), target department, technician assignment, resolution notes, and SLA timestamps.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Resident & Room Allocation:</strong> Guest name, room number, check-in and check-out dates, adult/child headcount (required for safety protocols and city tax assessments).
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Confidential Grievances:</strong> Restricted executive incident tickets accessible exclusively by the General Manager to protect guest privacy and handle sensitive feedback.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              3. Lawful Bases for Processing
            </h2>
            <p>Under Article 6 of the General Data Protection Regulation (GDPR), processing is conducted under:</p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Article 6(1)(b) [Contractual Necessity]:</strong> Performance of employment obligations, shift dispatching, and fulfillment of hotel service contracts with guests.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Article 6(1)(c) [Legal Obligation]:</strong> Maintaining hotel guest registries, safety headcount records, and occupational health shift records required by municipal hospitality regulations.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Article 6(1)(f) [Legitimate Interests]:</strong> Operational efficiency, prompt maintenance resolution, asset protection, and executive audit oversight.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              4. Cookie Policy & Storage Technologies
            </h2>
            <p>
              Hotel SES is an internal operational tool and does <strong>not</strong> use advertising cookies, marketing trackers, or cross-site profiling beacons.
            </p>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "1.25rem",
                marginTop: 10,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8", margin: "0 0 8px" }}>
                Strictly Necessary Cookies
              </h3>
              <ul style={{ paddingLeft: "1.5rem", margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>Cookie Name:</strong> <code>hotel_role</code>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Purpose:</strong> Stores authenticated department portal role (<code>reception</code>, <code>rh</code>, <code>gm</code>) to enforce route protection in server middleware (<code>proxy.ts</code>).
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Lifespan:</strong> 7 days (or deleted immediately upon explicit logout).
                </li>
                <li style={{ marginBottom: 0 }}>
                  <strong>Legal Exemption:</strong> Strictly necessary for portal security under ePrivacy Directive Art. 5(3); does not require prior opt-in consent.
                </li>
              </ul>
            </div>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              5. Data Retention & Erasure Schedule
            </h2>
            <p>We adhere to strict data minimization principles:</p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Staff Records:</strong> Retained for the duration of employment. Upon departure or contract termination, staff accounts can be anonymized via the HR portal.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Incident History:</strong> Retained for 12 months for quality assurance and facility maintenance planning, after which identifying resident details are expunged.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Checked-out Resident Data:</strong> Archived following settlement and deleted or anonymized within 6 months unless longer retention is required for legal tax compliance.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              6. Your Data Rights & Deletion Requests
            </h2>
            <p>
              In accordance with applicable privacy legislation (GDPR Articles 15–22), all staff and resident data subjects have the right to:
            </p>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li style={{ marginBottom: 6 }}>Request confirmation and an export copy of personal records held (Right of Access & Portability).</li>
              <li style={{ marginBottom: 6 }}>Request immediate correction of inaccurate contact or departmental information.</li>
              <li style={{ marginBottom: 6 }}>Request erasure (Right to be Forgotten) or anonymization of non-essential records.</li>
              <li style={{ marginBottom: 6 }}>Object to or restrict specific processing operations.</li>
            </ul>
            <div
              style={{
                marginTop: 16,
                padding: "1rem 1.25rem",
                borderRadius: 10,
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                To exercise your rights or request account data erasure, contact our Data Protection Officer directly at{" "}
                <a href="mailto:dpo@grandpalacehotel.com" style={{ color: "#38bdf8" }}>
                  dpo@grandpalacehotel.com
                </a>
                . HR Administrators can also initiate staff record anonymization directly within the HR Portal.
              </p>
            </div>
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
            &copy; {new Date().getFullYear()} Grand Palace Hotel Operations • SES System
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/tos" style={{ color: "#38bdf8", textDecoration: "none" }}>
              Acceptable Use Policy
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
