# 🏨 Hotel SES - Property & Room Management System

A high-performance, real-time Hotel Room Management & Incident Dispatch platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Supabase (PostgreSQL)**.

Designed for luxury and high-capacity properties (up to 341+ rooms), **Hotel SES** seamlessly connects Receptionists, Technical Maintenance Engineers, Housekeeping Managers (Gouvernante), and General Managers through live database synchronization, automated SLA routing, and detailed room analytics.

---

## ✨ Features & Role Portals

### 🛎️ Reception Desk Portal (`/reception`)
* **Rapid Reclamation Creation**: Log instant room issues with smart department dispatch, priority levels (`EMERGENCY`, `HIGH`, `STANDARD`), and optional guest linking.
* **Guest Stay Management**: Toggle stay state (`OCCUPIED`, `VACANT_DIRTY`, `RESERVED`) with automatic guest count tracking (adults & children).
* **QR Digital Key Generation**: Instant digital key hash display and QR card generation for checked-in guests.
* **Historical Incident Backfill**: Log legacy paper complaints directly to room database records.

### 🔧 Technical / Maintenance Portal (`/maintenance`)
* **Targeted Task Queue**: Dedicated filter showing only technical repair jobs (A/C, Plumbing, Electrical, Door Locks, TV, Furniture).
* **Automated SLA Countdown**: Real-time SLA deadline tracking (30-minute standard fix window).
* **One-Click Resolution**: Mark tickets `IN_PROGRESS` or `RESOLVED` with dynamic timestamp logging (`resolved_at`).
* **Shift Attendance**: View present maintenance technicians on active shift.

### 🧹 Housekeeping / Gouvernante Portal (`/gouvernante`)
* **Room Cleaning Workflow**: Cycle rooms through dirty-to-clean states (`DIRTY` ➔ `CLEANING` ➔ `INSPECTING` ➔ `CLEAN`).
* **Housekeeping Action Queue**: Handle cleanliness and missing item requests (Towels, Bedding, Toiletries, Cleaning requests) without cluttering the maintenance queue.
* **Maintenance Awareness Feed**: Monitor ongoing technical repairs in rooms before scheduling maid service.
* **Staff Roster Management**: Toggle shift attendance (`is_present`) for housekeepers.

### 📊 General Manager Executive Control (`/manager`)
* **Live BDD Rooms & Tickets Master Table**: Comprehensive table linking every room from `public.rooms` with:
  * Actual Room Number & BDD Record ID.
  * Real-time Stay & Cleaning State (`Occupied`/`Vacant`, `CLEAN`/`DIRTY`).
  * Ticket Creation Date & Time (`created_at`) and Resolution Timestamp (`resolved_at`).
  * Actual Ticket Status (`OPEN`, `IN_PROGRESS`, `RESOLVED`).
  * Assigned Staff & Department.
* **341-Room BDD Color Matrix**: Interactive color grid of all property rooms with real-time state indicators and search bar by room number or floor.
* **Interactive Room Audit Modal**: Click any room to view record metadata, guest headcount audit, QR key hash, and complete BDD ticket history.
* **Confidential Grievance Desk**: Executive portal for sensitive guest complaints with secure remedy notes.
* **Smart Ticket Routing Monitor**: Audit ticket dispatch split between Maintenance and Housekeeping teams.

---

## 🔀 Smart Ticket Routing Logic

| Ticket Category | Action Department | Notifications Sent To | Maintenance Queue Status |
| :--- | :--- | :--- | :--- |
| **Technical Fixes** (A/C, Plumbing, Electrical, Lock, TV, Furniture) | 🔧 **Maintenance** | 🧹 Housekeeping Manager & 📊 GM | **Included** |
| **Missing Items & Cleanliness** (Towels, Toiletries, Bedding, Cleaning) | 🧹 **Housekeeping** | 📊 General Manager | **Excluded** |
| **Confidential Complaints** | 📊 **General Manager** | 🛎️ Reception | **Excluded** |

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack
* **UI Library**: [React 19](https://react.dev/)
* **Language**: [TypeScript 5](https://www.typescriptlang.org/)
* **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) (`@supabase/ssr` and `@supabase/supabase-js`)
* **Styling**: Vanilla CSS (Custom dark glassmorphism design system)

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher
* **Supabase Project**: A valid Supabase URL and Anon API key

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
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

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```text
├── app/
│   ├── actions.ts              # Next.js Server Actions for Supabase operations
│   ├── components/
│   │   ├── HotelDashboard.tsx   # Core tab navigation & state sync header
│   │   ├── ReceptionPortal.tsx  # Receptionist control desk
│   │   ├── MaintenancePortal.tsx# Technical repair task queue
│   │   ├── GouvernantePortal.tsx# Housekeeping manager workflow
│   │   └── ManagerPortal.tsx    # GM BDD Master Table, Matrix & Analytics
│   ├── layout.tsx              # Root HTML & metadata layout
│   └── page.tsx                # Server Component fetching initial Supabase data
├── public/                     # Static icons & assets
├── scripts/
│   ├── seed_supabase_rooms.js  # Node.js script seeding 341 rooms to Supabase
│   └── generate_rooms_sql.js   # SQL generation helper
├── supabase/                   # PostgreSQL schema migration files
├── utils/
│   ├── roomsData.ts            # Type definitions & ticket routing classification helpers
│   └── supabase/               # Supabase SSR client helpers (server/client/middleware)
└── package.json
```

---

## 📜 License

This project is proprietary software for hotel operations management. All rights reserved.
