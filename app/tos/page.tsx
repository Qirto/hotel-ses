import React from "react";
import Link from "next/link";
import { LegalLayout } from "@/components/app/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy & System Terms | Hotel SES",
  description: "Terms of service and acceptable operational use policy for Hotel SES staff users.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout>
        <p className="legal-meta">Effective Date: October 2026 • Version 1.4</p>

        {/* Header */}
        <header>
          <p className="legal-eyebrow">Governance & System Security</p>
          <h1>
            Acceptable Use Policy & Staff Terms
          </h1>
          <p>
            These terms define authorized usage, confidentiality expectations, and security responsibilities for all hotel personnel accessing the Hotel SES platform.
          </p>
        </header>

        {/* Content Sections */}
        <div>
          <section>
            <h2>
              1. Authorized Access & Role-Based Scope
            </h2>
            <p>
              Hotel SES is an internal management system strictly reserved for authenticated staff members of Hôtel Méditerranée Thalasso Golf Hammamet. Access is provisioned under three operational tiers:
            </p>
            <ul>
              <li>
                <strong>Reception Desk (<code>/reception</code>):</strong> Front desk personnel authorized to create rapid incident tickets, update guest room occupancy states, and monitor room cleanliness indicators.
              </li>
              <li>
                <strong>Human Resources (<code>/rh</code>):</strong> HR personnel authorized to manage employee shifts, maintain department catalogs, and reassign ticket workloads during absenteeism.
              </li>
              <li>
                <strong>General Management (<code>/gm</code>):</strong> Executive leadership with oversight across all 341 rooms, department SLA analytics, MTTR performance, and confidential guest grievances.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              2. Credential Security & Passcode Confidentiality
            </h2>
            <p>
              Each role portal is secured via environment-configured passcodes and cryptographic session cookies. Users must strictly adhere to the following rules:
            </p>
            <ul>
              <li>
                <strong>Zero Credential Sharing:</strong> Department passcodes must never be shared with unauthorized third parties or written in plain view at workstations.
              </li>
              <li>
                <strong>Explicit Session Termination:</strong> Staff must utilize the &ldquo;Log Out&rdquo; function before leaving a shared terminal or front-desk workstation unattended.
              </li>
              <li>
                <strong>Incident Reporting:</strong> Any suspected unauthorized access or compromised credentials must be reported immediately to the IT Helpdesk (<a href="mailto:contact@hotelmediterraneehammamet.com">contact@hotelmediterraneehammamet.com</a>).
              </li>
            </ul>
          </section>

          <section>
            <h2>
              3. Guest Privacy & Data Confidentiality
            </h2>
            <p>
              All guest information (names, room numbers, maintenance requests, and confidential grievances) stored in Hotel SES is subject to strict professional secrecy and applicable privacy statutes:
            </p>
            <ul>
              <li>
                Staff shall not extract, photograph, or duplicate guest records for personal use or external distribution.
              </li>
              <li>
                Tickets designated as <strong>Confidential</strong> are routed exclusively to executive oversight and must never be discussed outside designated management channels.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              4. System Integrity & Automated Monitoring
            </h2>
            <p>
              System activity, including ticket dispatches, status acknowledgments, and attendance clock-ins, is logged for quality assurance and operational compliance. Any deliberate attempt to disrupt database integrity, bypass route guards, or manipulate SLA timers is strictly prohibited.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="legal-footer">
          <div>
            &copy; {new Date().getFullYear()} Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </div>
          <div>
            <Link href="/privacy">
              Privacy & Cookie Notice
            </Link>
            <Link href="/login">
              Login Gateway
            </Link>
          </div>
        </footer>
    </LegalLayout>
  );
}
