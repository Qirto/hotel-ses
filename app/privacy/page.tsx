import React from "react";
import Link from "next/link";
import { LegalLayout } from "@/components/app/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff & Operations Privacy Notice | Hotel SES",
  description: "Internal data privacy and cookie disclosure for Hotel SES staff and operational management.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout>
        <p className="legal-meta">Effective Date: October 2026 • Version 1.4</p>

        {/* Header */}
        <header>
          <p className="legal-eyebrow">Legal Compliance & Data Protection (GDPR / DPDP)</p>
          <h1>
            Staff & Operations Privacy Policy
          </h1>
          <p>
            This Privacy Notice governs data processing across the Hotel SES (Service & Operations Management System)
            deployed at Hôtel Méditerranée Thalasso Golf Hammamet. It details how employee operational records, incident tickets, and resident stay metrics are managed.
          </p>
        </header>

        {/* Content Sections */}
        <div>
          <section>
            <h2>
              1. Data Controller & Protection Contact
            </h2>
            <p>
              The data controller responsible for personal and operational data processed within Hotel SES is:
            </p>
            <div className="legal-callout">
              <p><strong>Entity:</strong> Hôtel Méditerranée Thalasso Golf Hammamet</p>
              <p><strong>Location:</strong> Hammamet, Tunisia</p>
              <p>
                <strong>Data Protection Contact:</strong>{" "}
                <a href="mailto:contact@hotelmediterraneehammamet.com">
                  contact@hotelmediterraneehammamet.com
                </a>
              </p>
              <p>
                <strong>IT Support & Incident Inquiries:</strong>{" "}
                <a href="mailto:it-support@grandpalacehotel.com">
                  it-support@grandpalacehotel.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2>
              2. Categories of Data Collected
            </h2>
            <p>Hotel SES processes operational information strictly limited to hotel management tasks:</p>
            <ul>
              <li>
                <strong>Staff Profiles & Attendance:</strong> Full legal name, assigned role (receptionist, technician, governance, HR), department code, internal extension/phone number, shift presence status, skill tags, and clock-in timestamps.
              </li>
              <li>
                <strong>Incident & Maintenance Tickets:</strong> Room number, issue description, priority tier (Standard, High, Emergency), target department, technician assignment, resolution notes, and SLA timestamps.
              </li>
              <li>
                <strong>Resident & Room Allocation:</strong> Guest name, room number, check-in and check-out dates, adult/child headcount (required for safety protocols and city tax assessments).
              </li>
              <li>
                <strong>Confidential Grievances:</strong> Restricted executive incident tickets accessible exclusively by the General Manager to protect guest privacy and handle sensitive feedback.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              3. Lawful Bases for Processing
            </h2>
            <p>Under Article 6 of the General Data Protection Regulation (GDPR), processing is conducted under:</p>
            <ul>
              <li>
                <strong>Article 6(1)(b) [Contractual Necessity]:</strong> Performance of employment obligations, shift dispatching, and fulfillment of hotel service contracts with guests.
              </li>
              <li>
                <strong>Article 6(1)(c) [Legal Obligation]:</strong> Maintaining hotel guest registries, safety headcount records, and occupational health shift records required by municipal hospitality regulations.
              </li>
              <li>
                <strong>Article 6(1)(f) [Legitimate Interests]:</strong> Operational efficiency, prompt maintenance resolution, asset protection, and executive audit oversight.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              4. Cookie Policy & Storage Technologies
            </h2>
            <p>
              Hotel SES is an internal operational tool and does <strong>not</strong> use advertising cookies, marketing trackers, or cross-site profiling beacons.
            </p>
            <div className="legal-callout">
              <h3>
                Strictly Necessary Cookies
              </h3>
              <ul>
                <li>
                  <strong>Cookie Name:</strong> <code>hotel_role</code>
                </li>
                <li>
                  <strong>Purpose:</strong> Stores authenticated department portal role (<code>reception</code>, <code>rh</code>, <code>gm</code>) to enforce route protection in server middleware (<code>proxy.ts</code>).
                </li>
                <li>
                  <strong>Lifespan:</strong> 7 days (or deleted immediately upon explicit logout).
                </li>
                <li>
                  <strong>Legal Exemption:</strong> Strictly necessary for portal security under ePrivacy Directive Art. 5(3); does not require prior opt-in consent.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2>
              5. Data Retention & Erasure Schedule
            </h2>
            <p>We adhere to strict data minimization principles:</p>
            <ul>
              <li>
                <strong>Staff Records:</strong> Retained for the duration of employment. Upon departure or contract termination, staff accounts can be anonymized via the HR portal.
              </li>
              <li>
                <strong>Incident History:</strong> Retained for 12 months for quality assurance and facility maintenance planning, after which identifying resident details are expunged.
              </li>
              <li>
                <strong>Checked-out Resident Data:</strong> Archived following settlement and deleted or anonymized within 6 months unless longer retention is required for legal tax compliance.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              6. Your Data Rights & Deletion Requests
            </h2>
            <p>
              In accordance with applicable privacy legislation (GDPR Articles 15–22), all staff and resident data subjects have the right to:
            </p>
            <ul>
              <li>Request confirmation and an export copy of personal records held (Right of Access & Portability).</li>
              <li>Request immediate correction of inaccurate contact or departmental information.</li>
              <li>Request erasure (Right to be Forgotten) or anonymization of non-essential records.</li>
              <li>Object to or restrict specific processing operations.</li>
            </ul>
            <div className="legal-callout">
              <p>
                To exercise your rights or request account data erasure, contact our Data Protection Officer directly at{" "}
                <a href="mailto:dpo@grandpalacehotel.com">
                  dpo@grandpalacehotel.com
                </a>
                . HR Administrators can also initiate staff record anonymization directly within the HR Portal.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="legal-footer">
          <div>
            &copy; {new Date().getFullYear()} Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </div>
          <div>
            <Link href="/tos">
              Acceptable Use Policy
            </Link>
            <Link href="/login">
              Login Gateway
            </Link>
          </div>
        </footer>
    </LegalLayout>
  );
}
