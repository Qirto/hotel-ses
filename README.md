# 🏨 Hotel SES - Luxury Property & Incident Management System

A high-performance, real-time Hotel Property Management & Incident Dispatch platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Supabase (PostgreSQL)**.

Designed for luxury and high-capacity properties (341+ rooms), **Hotel SES** seamlessly connects Front Desk Receptionists, Housekeeping, Technical Maintenance, HR Managers, and General Managers through live database synchronization, automated SLA routing, security route guards, and granular room analytics.

---

## ✨ Features & Role Portals

### 🔐 Multi-Role Access Control & Security
* **Role-Based Portals**: Isolated portals for **Reception** (`/reception`), **General Manager** (`/gm`), and **Human Resources / RH** (`/rh`).
* **Route Guards (`proxy.ts`)**: Automated middleware protecting all internal routes, immediately redirecting unauthorized visitors to `/login`.
* **Configurable Passcode Auth**: PIN codes managed securely via server environment variables (`PASSCODE_RECEPTION`, `PASSCODE_RH`, `PASSCODE_GM`) with masked inputs.

### 📈 Room Rush Hour & Incident Intelligence (New)
* **⏰ Room Rush Hour Detection**: Automatically calculates the peak clock-hour interval (e.g. `20:00 – 21:00`) for each room, pinpointing the exact calendar date of the highest incident spike and historical volume.
* **🔁 Most Repeated Problems**: Identifies top 3 complaint categories per room with ranking, occurrence counts, and percentage-fill progress bars.
* **📊 Room-Specific MTTR**: Computes average resolution time in minutes for each individual room.
* **Interactive Filters & Sorting**: Filter rooms by Floor (1–3), Block (A/B), or instant room search. Sort by Most Incidents First, Most Open Issues, Rush Hour Spike, or Room Number.
* **Severity-Based Status Glow**:
  * 🔴 **Critical Glow**: Room has open Emergency or High priority tickets.
  * 🟡 **Amber Glow**: Room has standard open tickets.
  * 🔵 **Sky Blue**: Room has historical tickets, all resolved.
  * 🟢 **Clean Record**: Zero complaints filed.

### 🛎️ Reception Desk Portal (`/reception`)
* **Rapid Incident Dispatch**: Instant ticket creation with smart department routing (`MAINTENANCE`, `HOUSEKEEPING`), priority levels (`EMERGENCY`, `HIGH`, `STANDARD`), and optional guest linking.
* **341-Room Interactive Map**: Live visual overview of room occupancy and cleanliness states.
* **Guest Stay Management**: Toggle stay states (`OCCUPIED`, `VACANT_DIRTY`, `RESERVED`) with adult and child headcounts.
* **Historical Incident Backfill**: Log legacy or paper complaints directly into the room database history.

### 👔 General Manager Executive Control (`/gm`)
* **Executive Dashboard & KPIs**: Real-time occupancy graphs, SLA compliance ring charts, and property-wide MTTR.
* **All Reclamations Audit Table**: Search, filter by department or status, and resolve complaints with GM oversight.
* **Room Deep Inspection Modal**: View room status, cycle cleaning states, and inspect full complaint history and rush hour analysis in one place.
* **Confidential Grievance Desk**: Executive portal for sensitive guest grievances with recorded resolution remedies.

### 👥 Human Resources & Department Management (`/rh`)
* **Staff Master Directory**: View all employees with shift statuses (`ON_SHIFT`, `OFF_SHIFT`, `ON_BREAK`), roles, phone numbers, and skill tags.
* **Shift Attendance Toggling**: One-click clock in/out with automated presence updating.
* **Absenteeism Auto-Redistribution**: Mark staff absent and automatically reassign open tickets to available on-shift personnel.
* **Dynamic Department CRUD**: Create, edit, and manage property departments with custom icons and heads of department.

---

## ⚡ Real-Time Architecture

* **Supabase Realtime**: All portals subscribe to PostgreSQL changes via `supabase.channel` on `rooms`, `reclamations`, and `staff` tables, providing instant cross-browser updates without manual refreshes.
* **Granular Cache Revalidation**: Server actions trigger targeted `revalidatePath` updates (e.g. `/reception`, `/gm`, `/rh`) instead of blanket cache flushes.

---

## 🔀 Smart Ticket Routing Logic

| Ticket Category | Action Department | Notifications Sent To | Queue Status |
| :--- | :--- | :--- | :--- |
| **Technical Fixes** (A/C, Plumbing, Electrical, Lock, TV, Furniture) | 🔧 **Maintenance** | 🧹 Housekeeping & 📊 GM | Active in Maintenance Queue |
| **Cleanliness & Amenities** (Towels, Toiletries, Bedding, Cleaning) | 🧹 **Housekeeping** | 📊 General Manager | Filtered for Housekeeping |
| **Confidential Complaints** | 📊 **General Manager** | 🛎️ Reception | Confidential Executive Desk |

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack
* **UI Library**: [React 19](https://react.dev/)
* **Language**: [TypeScript 5](https://www.typescriptlang.org/)
* **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) (`@supabase/ssr` & `@supabase/supabase-js`)
* **Styling**: Vanilla CSS (Dark Glassmorphism Luxury Design System)

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher
* **Supabase Project**: Supabase URL and Publishable API key

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Qirto/hotel-ses.git
cd hotel-ses
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Role authentication passcodes
PASSCODE_RECEPTION=1111
PASSCODE_RH=2222
PASSCODE_GM=3333
```

### 3. Database Migration & Seeding (Optional)

Run the SQL migration scripts in `supabase/` via your Supabase SQL Editor, then seed the 341 rooms into PostgreSQL:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Unauthenticated visits automatically redirect to `/login`.

---

## 📁 Repository Structure

```text
├── app/
│   ├── actions.ts              # Next.js Server Actions with granular cache revalidation
│   ├── components/
│   │   ├── HotelDashboard.tsx   # Dashboard state orchestrator & realtime listeners
│   │   ├── ReceptionPortal.tsx  # Receptionist control desk & 341-room map
│   │   ├── ManagerPortal.tsx    # GM Executive Portal, Master Table & Room Analytics
│   │   ├── HrPortal.tsx         # HR Staff & Department Management
│   │   ├── GouvernantePortal.tsx# Housekeeping manager workflow
│   │   └── MaintenancePortal.tsx# Technical repair task queue
│   ├── gm/                     # General Manager route (/gm)
│   ├── login/                  # Role-based passcode login (/login)
│   ├── reception/              # Front desk reception route (/reception)
│   ├── rh/                     # Human resources route (/rh)
│   ├── layout.tsx              # Root HTML & metadata layout
│   └── page.tsx                # Root route with role-based redirection
├── proxy.ts                    # Next.js Middleware route guard protecting internal routes
├── public/                     # Static icons & assets
├── scripts/
│   ├── seed_supabase_rooms.js  # Node.js script seeding 341 rooms to Supabase
│   └── generate_rooms_sql.js   # SQL generation helper
├── supabase/                   # PostgreSQL schema migration files
├── utils/
│   ├── roomAnalytics.ts        # Pure analytics engine (rush hours, patterns, MTTR)
│   ├── loadHotelData.ts        # Data loader for rooms, staff, reclamations
│   ├── roomsData.ts            # Type definitions & classification helpers
│   └── supabase/               # Supabase SSR client helpers (server/client/middleware)
└── package.json
```

---

## 📜 License

This project is proprietary software for hotel operations management. All rights reserved.
