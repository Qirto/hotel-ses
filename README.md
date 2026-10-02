# 🏨 Hotel SES — Luxury Property & Incident Management System

A high-performance, real-time Hotel Property Management, Incident Dispatch, and Staff Operations platform built with **Next.js 16 (App Router & Turbopack)**, **React 19**, **TypeScript**, and **Supabase (PostgreSQL)**.

Designed for luxury, high-capacity hospitality properties (341+ rooms), **Hotel SES** seamlessly connects Front Desk Receptionists, Housekeeping, Technical Maintenance, HR Managers, and General Managers with live database synchronization, automated SLA routing, security route guards, granular room analytics, full mobile responsiveness, and offline-capable Progressive Web App (PWA) support.

---

## 📱 Progressive Web App (PWA) & Mobile-First Experience

Hotel SES is engineered as a zero-friction **Progressive Web App (PWA)** that runs natively across iOS, Android, macOS, and Windows without requiring App Store or Google Play downloads:

* **Web App Manifest (`public/manifest.webmanifest`)**:
  * Standalone display mode with custom brand themes (`#0b0f17` background / `#d97706` amber accents).
  * Direct action shortcuts launching straight into `/reception`, `/rh`, and `/gm`.
* **Offline-First Service Worker (`public/sw.js`)**:
  * Pre-caches static assets and core shells (`hotel-ses-v1`).
  * Employs a network-first strategy with background cache updates.
  * Dedicated offline fallback page (`/offline`) allowing staff to check network health and reconnect seamlessly during connectivity drops.
* **Smart In-App Install Banners**:
  * **Android / Chromium**: Listens for the `beforeinstallprompt` event and presents a clean bottom sheet with a 1-click **"Install App"** trigger.
  * **iOS Safari**: Automatically detects iOS devices running in Safari browser mode and displays a tailored 3-step guide: Tap Share (`⎋`), scroll, and tap **"Add to Home Screen"** (`➕`).
  * **7-Day Dismissal Memory**: Remembers dismissals in `localStorage` so banners never spam staff.
* **High-DPI App Icons & iOS Splash Screens**:
  * Complete icon suite from 72×72 up to 512×512, plus `apple-touch-icon.png` and favicons.
  * 8 iOS startup splash screens formatted for iPhone SE through iPhone 16 Pro Max and iPad Pro.

---

## 📲 Responsive Adaptive Shell & Design System

The system delivers a tailored UI across phones, tablets, foldables, and ultra-wide desktop monitors:

* **Universal Layout Wrapper (`PortalLayout.tsx`)**:
  * **Desktop (≥ 1024px)**: 270px fixed sidebar navigation with quick metric counters and sign-out controls.
  * **Mobile (< 1024px)**: Sticky 56px top app bar featuring hotel identity, department badge (`REC`, `GM`, `HR`), and an accessible hamburger button.
  * **Off-Canvas Drawer**: Smooth slide-in navigation drawer with vertical tabs, live counters, action buttons, and dark backdrop dismiss.
* **Safe-Area Awareness**: Integrated `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` supporting iPhone notches, Dynamic Island, and Android gesture navigation bars.
* **Mobile-Optimized Grid & Modals**:
  * Room matrix utilizes `repeat(auto-fill, minmax(min(160px, 100%), 1fr))` preventing horizontal overflow on compact viewports.
  * Inspection and ticket modals render as responsive bottom sheets on mobile devices.
* **Clean Modern Aesthetics**: Stripped generic SaaS tropes (e.g. neon purple-blue gradients, heading emojis) in favor of high-contrast luxury dark glassmorphism, crisp typography (`Plus Jakarta Sans`), and WCAG 2.1 AA accessible contrast ratios.

---

## ✨ Role-Based Portals & Core Modules

### 🔐 Unified Access Control & Intelligent Role Routing
* **Single Passcode Login**: A single, streamlined access portal (`/login`) with automatic role detection. Staff enter their assigned department code (`1111` for Reception, `2222` for HR, `3333` for General Manager); the system verifies credentials, sets the secure session cookie, and routes staff immediately to their dedicated operational workspace.
* **Isolated Portals**:
  * **Reception** (`/reception`) — Front desk operations and rapid dispatch.
  * **General Manager** (`/gm`) — Executive oversight, analytics, and confidential grievance desk.
  * **Human Resources** (`/rh`) — Staff master directory, shift schedules, and absenteeism redistribution.
* **Route Guards (`proxy.ts`)**: Automated middleware protecting all internal routes, redirecting unauthenticated traffic to `/login` while bypassing static assets, manifest, and service worker endpoints.
* **Configurable Passcode Auth**: PIN codes managed securely via server environment variables (`PASSCODE_RECEPTION`, `PASSCODE_RH`, `PASSCODE_GM`) with masked inputs and instant keyboard submission.

### 📈 Room Rush Hour & Incident Intelligence
* **⏰ Room Rush Hour Detection**: Calculates peak clock-hour intervals (e.g., `20:00 – 21:00`) for each room, pinpointing historical incident volume and highest incident spikes.
* **🔁 Most Repeated Problems**: Identifies top complaint categories per room with ranking, occurrence counts, and progress bars.
* **📊 Room-Specific MTTR**: Computes average Mean Time To Resolve (MTTR) in minutes per room and property-wide.
* **Interactive Filtering & Sorting**: Filter rooms by Floor (1–3), Block (A/B), or instant search. Sort by Most Incidents, Most Open Issues, Rush Hour Spike, or Room Number.
* **Severity-Based Status Indicators**:
  * 🔴 **Critical Glow**: Room has open Emergency or High priority tickets.
  * 🟡 **Amber Glow**: Room has standard open tickets.
  * 🔵 **Sky Blue**: Room has historical tickets, all resolved.
  * 🟢 **Clean Record**: Zero complaints filed.

### 🛎️ Reception Desk Portal (`/reception`)
* **Rapid Incident Dispatch**: Instant ticket creation with smart department routing (`MAINTENANCE`, `HOUSEKEEPING`), priority levels (`EMERGENCY`, `HIGH`, `STANDARD`), and optional guest linking.
* **341-Room Interactive Map**: Live visual overview of room occupancy, cleaning state, and open maintenance calls.
* **Guest Stay Management**: Toggle stay states (`OCCUPIED`, `VACANT_DIRTY`, `RESERVED`) with adult and child headcounts.
* **Historical Incident Backfill**: Log legacy or paper complaints directly into the room database history.

### 👔 General Manager Executive Control (`/gm`)
* **Executive Dashboard & KPIs**: Real-time occupancy graphs, SLA compliance ring charts, and property-wide MTTR.
* **All Reclamations Audit Table**: Search, filter by department or status, and resolve complaints with GM oversight.
* **Room Deep Inspection Modal**: View room status, cycle cleaning states, and inspect full complaint history and rush hour analysis in one place.
* **Confidential Grievance Desk**: Executive portal for sensitive guest grievances with recorded resolution remedies.

### 👥 Human Resources & Department Management (`/rh`)
* **Staff Master Directory**: View all employees with shift statuses (`ON_SHIFT`, `OFF_SHIFT`, `ON_BREAK`), roles, phone numbers, and department affiliations.
* **Shift Attendance Toggling**: One-click clock in/out with automated presence updating.
* **Absenteeism Auto-Redistribution**: Mark staff absent and automatically reassign open tickets to available on-shift personnel.
* **Dynamic Department CRUD**: Create, edit, and manage property departments with custom icons and heads of department.

---

## ⚡ Real-Time Architecture

* **Supabase Realtime**: All portals subscribe to PostgreSQL changes via `supabase.channel` on `rooms`, `reclamations`, and `staff` tables, providing instant cross-device synchronization without manual page refreshes.
* **Granular Cache Revalidation**: Server actions trigger targeted `revalidatePath` updates (e.g. `/reception`, `/gm`, `/rh`) instead of blanket cache flushes.

---

## 🔀 Smart Ticket Routing Logic

| Ticket Category | Action Department | Notifications Sent To | Queue Status |
| :--- | :--- | :--- | :--- |
| **Technical Fixes** (HVAC, Plumbing, Electrical, Lock, TV, Fixtures) | 🔧 **Maintenance** | 🧹 Housekeeping & 📊 GM | Active in Maintenance Queue |
| **Cleanliness & Amenities** (Linens, Restocking, Deep Clean) | 🧹 **Housekeeping** | 📊 General Manager | Filtered for Housekeeping |
| **Confidential Complaints** | 📊 **General Manager** | 🛎️ Reception | Confidential Executive Desk |

---

## ⚖️ Legal, Compliance & Privacy

Hotel SES adheres to European GDPR, French CNIL, and enterprise data hygiene standards:

* **Staff Privacy & Cookie Policy (`/privacy`)**: Transparent documentation of staff data collection, strictly necessary session cookies (`hotel_role`), audit logging, and data subject rights (Articles 15–22 GDPR).
* **Terms of Service & AUP (`/tos`)**: Clear operational guidelines governing account credentials, system availability, data security, and acceptable use.
* **Open Source Licenses Registry (`LICENSES.md`)**: Full attribution and license terms for third-party production dependencies.
* **Login Security Disclosures**: Explicit disclosures regarding session cookies and audit tracking present on `/login`.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack bundler
* **UI Library**: [React 19](https://react.dev/)
* **Language**: [TypeScript 5](https://www.typescriptlang.org/)
* **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) (`@supabase/ssr` & `@supabase/supabase-js`)
* **PWA & Offline**: Web App Manifest, Service Worker (`sw.js`), Sharp icon generation
* **Styling**: Vanilla CSS (Tailored Dark Glassmorphism Luxury Design System with Safe Area insets)

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

### 5. Production Build & Verification

```bash
npm run build
npm run start
```

---

## 📁 Repository Structure

```text
├── app/
│   ├── actions.ts                  # Next.js Server Actions with granular cache revalidation
│   ├── components/
│   │   ├── HotelDashboard.tsx       # Dashboard state orchestrator & realtime listeners
│   │   ├── InstallBannerAndroid.tsx # Android PWA beforeinstallprompt bottom sheet
│   │   ├── InstallBannerIOS.tsx     # iOS Safari 3-step home screen installation guide
│   │   ├── PortalLayout.tsx         # Responsive layout with mobile app bar & off-canvas drawer
│   │   ├── ReceptionPortal.tsx      # Receptionist control desk & 341-room map
│   │   ├── ManagerPortal.tsx        # GM Executive Portal, Master Table & Room Analytics
│   │   ├── HrPortal.tsx             # HR Staff & Department Management
│   │   ├── GouvernantePortal.tsx    # Housekeeping manager workflow
│   │   ├── MaintenancePortal.tsx    # Technical repair task queue
│   │   └── ServiceWorkerRegistrar.tsx # Client-side Service Worker registration
│   ├── gm/                         # General Manager route (/gm)
│   ├── login/                      # Role-based passcode login (/login)
│   ├── offline/                    # PWA offline fallback route (/offline)
│   ├── privacy/                    # Staff Privacy & Cookie Policy (/privacy)
│   ├── reception/                  # Front desk reception route (/reception)
│   ├── rh/                         # Human resources route (/rh)
│   ├── tos/                        # Terms of Service & Acceptable Use Policy (/tos)
│   ├── layout.tsx                  # Root HTML, PWA metadata, splash tags, & layout
│   └── page.tsx                    # Root route with role-based redirection
├── proxy.ts                        # Next.js Middleware route guard protecting internal routes
├── public/
│   ├── icons/                      # PWA icons (72x72 to 512x512, apple-touch-icon, favicons)
│   ├── splash/                     # iOS startup splash screens (iPhone SE to iPad Pro)
│   ├── manifest.webmanifest        # W3C Web App Manifest
│   └── sw.js                       # Service worker with caching & offline fallback
├── scripts/
│   ├── generate_pwa_assets.js      # Script generating PWA icons & iOS splash screens via sharp
│   ├── seed_supabase_rooms.js      # Node.js script seeding 341 rooms to Supabase
│   └── generate_rooms_sql.js       # SQL generation helper
├── supabase/                       # PostgreSQL schema migration files
├── utils/
│   ├── roomAnalytics.ts            # Pure analytics engine (rush hours, patterns, MTTR)
│   ├── loadHotelData.ts            # Data loader for rooms, staff, reclamations
│   ├── roomsData.ts                # Type definitions & classification helpers
│   └── supabase/                   # Supabase SSR client helpers (server/client/middleware)
├── LICENSES.md                     # Open source third-party licenses register
├── next.config.ts                  # Next.js configuration with PWA headers
└── package.json
```

---

## 📜 License

This project is proprietary software for hotel operations management. For full third-party software disclosures and open-source licenses, see [LICENSES.md](LICENSES.md).
