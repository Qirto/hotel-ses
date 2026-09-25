"use client";

import React, { useState } from "react";
import { HotelRoom, Staff, Resident, Reclamation, Department, isMaintenanceFixTicket, isHousekeepingMissingOrCleanTicket } from "@/utils/roomsData";
import ReceptionPortal from "@/app/components/ReceptionPortal";
import MaintenancePortal from "@/app/components/MaintenancePortal";
import GouvernantePortal from "@/app/components/GouvernantePortal";
import ManagerPortal from "@/app/components/ManagerPortal";
import HrPortal from "@/app/components/HrPortal";

interface Props {
  initialRooms: HotelRoom[];
  isLiveSupabase: boolean;
  staffList?: Staff[];
  residentsList?: Resident[];
  reclamationsList?: Reclamation[];
  departmentsList?: Department[];
}

type RoleTab = "reception" | "maintenance" | "gouvernante" | "manager" | "hr" | "erd";

export default function HotelDashboard({
  initialRooms,
  isLiveSupabase,
  staffList = [],
  residentsList = [],
  reclamationsList = [],
  departmentsList = [],
}: Props) {
  const [activeRole, setActiveRole] = useState<RoleTab>("reception");

  const openTicketsCount = reclamationsList.filter(
    (r) => r.status === "OPEN" || r.status === "IN_PROGRESS"
  ).length;

  const openMaintTicketsCount = reclamationsList.filter(
    (r) => (r.status === "OPEN" || r.status === "IN_PROGRESS") && !r.is_confidential && isMaintenanceFixTicket(r)
  ).length;

  const openHkTicketsCount = reclamationsList.filter(
    (r) => (r.status === "OPEN" || r.status === "IN_PROGRESS") && !r.is_confidential && isHousekeepingMissingOrCleanTicket(r)
  ).length;

  const dirtyRoomsCount = initialRooms.filter((r) => r.cleaning_status === "DIRTY").length;

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1.5rem 1.25rem", color: "#f8fafc" }}>
      {/* Top Application Bar */}
      <header
        style={{
          marginBottom: "1.75rem",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))",
          borderRadius: 16,
          padding: "1.25rem 1.5rem",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "3px 10px", borderRadius: 999, background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", color: "#38bdf8", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              <span>🏨 Hotel Operational System</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLiveSupabase ? "#22c55e" : "#f59e0b" }}></span>
              <span style={{ fontSize: 11 }}>{isLiveSupabase ? "Supabase Live" : "Offline"}</span>
            </div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #ffffff 40%, #cbd5e1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Palace Operations & Floor Dispatch
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Rooms</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>{initialRooms.length}</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Open Tickets</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: openTicketsCount > 0 ? "#f87171" : "#4ade80" }}>{openTicketsCount}</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Dirty Rooms</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: dirtyRoomsCount > 0 ? "#f59e0b" : "#4ade80" }}>{dirtyRoomsCount}</div>
            </div>
          </div>
        </div>

        {/* 5-ROLE WORKSPACE NAVIGATION BAR */}
        <nav style={{ display: "flex", gap: 8, marginTop: 16, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { id: "reception", label: "🛎️ Reception (Front Desk)", badge: null, color: "#38bdf8" },
            { id: "maintenance", label: "🔧 Maintenance (Technical)", badge: openMaintTicketsCount > 0 ? openMaintTicketsCount : null, color: "#38bdf8" },
            { id: "gouvernante", label: "🧹 Gouvernante (Housekeeping)", badge: (dirtyRoomsCount + openHkTicketsCount) > 0 ? (dirtyRoomsCount + openHkTicketsCount) : null, color: "#a855f7" },
            { id: "manager", label: "📊 General Manager (Executive)", badge: openTicketsCount > 0 ? openTicketsCount : null, color: "#f59e0b" },
            { id: "hr", label: "👥 Human Resources (RH)", badge: staffList.length, color: "#34d399" },
            { id: "erd", label: "🗄️ Relational Schema", badge: null, color: "#94a3b8" },
          ].map((role) => {
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id as RoleTab)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor: isActive ? role.color : "rgba(255, 255, 255, 0.08)",
                  background: isActive ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.5)",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{role.label}</span>
                {role.badge !== null && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: isActive ? role.color : "rgba(255, 255, 255, 0.15)",
                      color: isActive ? "#000" : "#fff",
                      fontWeight: 800,
                    }}
                  >
                    {role.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ACTIVE ROLE WORKSPACE */}
      <main>
        {activeRole === "reception" && (
          <ReceptionPortal
            rooms={initialRooms}
            residents={residentsList}
            departmentsList={departmentsList}
          />
        )}

        {activeRole === "maintenance" && (
          <MaintenancePortal
            reclamations={reclamationsList}
            technicians={staffList.filter((s) => s.role === "maintenance")}
          />
        )}

        {activeRole === "gouvernante" && (
          <GouvernantePortal
            rooms={initialRooms}
            reclamations={reclamationsList}
            staff={staffList}
          />
        )}

        {activeRole === "manager" && (
          <ManagerPortal
            rooms={initialRooms}
            reclamations={reclamationsList}
            staff={staffList}
          />
        )}

        {activeRole === "hr" && (
          <HrPortal
            staffList={staffList}
            departmentsList={departmentsList}
          />
        )}

        {activeRole === "erd" && (
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem", color: "#38bdf8" }}>
              Active Relational Schema & Entity Relationships
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>ROOMS (341 rows)</div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  <code>id</code> (bigint PK)<br />
                  <code>room_number</code> (text UNIQUE)<br />
                  <code>floor</code> (int 1, 2, 3)<br />
                  <code>block</code> (BLOCK_A, BLOCK_B)<br />
                  <code>is_occupied</code> (boolean)<br />
                  <code>cleaning_status</code> (DIRTY, CLEANING, INSPECTING, CLEAN)<br />
                  <code>adult_count</code>, <code>child_count</code> (int)
                </div>
              </div>

              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e879f9", marginBottom: 6 }}>DEPARTMENTS ({departmentsList.length} rows)</div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  <code>id</code> (bigint PK)<br />
                  <code>code</code> (text UNIQUE)<br />
                  <code>name</code> (text)<br />
                  <code>icon</code> (text emoji)<br />
                  <code>head_of_department</code> (text)<br />
                  <code>description</code> (text)
                </div>
              </div>

              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#34d399", marginBottom: 6 }}>STAFF ({staffList.length} rows)</div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  <code>id</code> (bigint PK)<br />
                  <code>full_name</code> (text)<br />
                  <code>role</code> (receptionist, maintenance, chef, concierge, etc.)<br />
                  <code>department</code> (All hotel departments)<br />
                  <code>skill_tags</code> (text[])<br />
                  <code>shift_status</code> (ON_SHIFT, OFF_SHIFT)
                </div>
              </div>

              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24", marginBottom: 6 }}>RESIDENTS</div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  <code>id</code> (bigint PK)<br />
                  <code>room_id</code> (FK &rarr; ROOMS)<br />
                  <code>first_name</code>, <code>last_name</code><br />
                  <code>phone_number</code><br />
                  <code>status</code> (ACTIVE, CHECKED_OUT)
                </div>
              </div>

              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>RECLAMATIONS</div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  <code>id</code> (bigint PK)<br />
                  <code>room_id</code> (FK &rarr; ROOMS)<br />
                  <code>resident_id</code> (FK &rarr; RESIDENTS)<br />
                  <code>created_by_staff_id</code> (FK &rarr; STAFF)<br />
                  <code>assigned_staff_id</code> (FK &rarr; STAFF)<br />
                  <code>department</code>, <code>category</code>, <code>priority</code>, <code>status</code><br />
                  <code>is_confidential</code> (boolean)
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
