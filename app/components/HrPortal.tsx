"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Staff, Department, Reclamation, HotelRoom } from "@/utils/roomsData";
import {
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffShift,
  markStaffAbsentAndRedistribute,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  logoutRole,
} from "@/app/actions";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

export const DEFAULT_HOTEL_DEPARTMENTS: Department[] = [
  { id: 1, code: "RECEPTION", name: "Reception & Front Desk", icon: "🛎️", description: "Guest check-in/out, switchboard, inquiries and concierge dispatches", head_of_department: "Sophie Mercier" },
  { id: 2, code: "HOUSEKEEPING", name: "Housekeeping & Gouvernante", icon: "🧹", description: "Room cleaning, linen management, amenity restocking and floor inspections", head_of_department: "Martine Aubry" },
  { id: 3, code: "TECHNICAL", name: "Technical & Maintenance", icon: "🔧", description: "Plumbing, electrical, HVAC, fixtures and preventive facilities maintenance", head_of_department: "Pierre Dubois" },
  { id: 4, code: "FOOD_AND_BEVERAGE", name: "Food & Beverage (F&B)", icon: "🍽️", description: "Kitchen, restaurants, banquets, room service and bars", head_of_department: "Chef Antoine Girard" },
  { id: 5, code: "MANAGEMENT", name: "Executive & General Management", icon: "👔", description: "Hotel operations oversight, executive decisions, VIP relations and strategy", head_of_department: "Jean-Paul Bonnet" },
  { id: 6, code: "SECURITY", name: "Security & Safety", icon: "🛡️", description: "Premises surveillance, access control, keycards, guest safety and emergency protocols", head_of_department: "Marc Lambert" },
  { id: 7, code: "CONCIERGE", name: "Concierge & Guest Relations", icon: "🚗", description: "Valet parking, luggage handling, excursions, transport and VIP guest assistance", head_of_department: "Lucie Moreau" },
  { id: 8, code: "SPA_AND_WELLNESS", name: "Spa, Wellness & Fitness", icon: "🧖", description: "Massage treatments, thermal baths, sauna, gym and wellness therapies", head_of_department: "Camille Roux" },
  { id: 9, code: "SALES_AND_MARKETING", name: "Sales, Marketing & Events", icon: "📈", description: "Group bookings, corporate events, weddings, digital marketing and PR", head_of_department: "Helene Fontaine" },
  { id: 10, code: "FINANCE_AND_ACCOUNTING", name: "Finance, Accounting & Audit", icon: "💳", description: "Night audit, billing, purchasing, payroll and revenue management", head_of_department: "Bernard Leroy" },
  { id: 11, code: "HUMAN_RESOURCES", name: "Human Resources (HR)", icon: "👥", description: "Recruitment, employee onboarding, scheduling, payroll and training", head_of_department: "Claire Delacroix" },
];

export const STANDARD_ROLES = [
  "manager",
  "receptionist",
  "maintenance",
  "governance",
  "chef",
  "cook",
  "waiter",
  "bartender",
  "concierge",
  "security_officer",
  "spa_therapist",
  "housekeeper",
  "bellboy",
  "accountant",
  "hr_specialist",
  "master",
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type ShiftType = "MORNING" | "EVENING" | "NIGHT" | "OFF";

const SHIFT_LABELS: Record<ShiftType, { label: string; time: string; color: string; bg: string }> = {
  MORNING: { label: "🌅 Morning", time: "07:00 - 15:00", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" },
  EVENING: { label: "🌇 Evening", time: "15:00 - 23:00", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.2)" },
  NIGHT: { label: "🌃 Night", time: "23:00 - 07:00", color: "#a855f7", bg: "rgba(168, 85, 247, 0.2)" },
  OFF: { label: "🏖️ Off / Rest", time: "Rest Day", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" },
};

export default function HrPortal({
  staffList,
  departmentsList = [],
  reclamationsList = [],
  rooms = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"ROOMS" | "RECLAMATIONS" | "STATS" | "EMPLOYEES">("EMPLOYEES");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Merge database departments with defaults
  const activeDepartments = useMemo(() => {
    const map = new Map<string, Department>();
    DEFAULT_HOTEL_DEPARTMENTS.forEach((d) => map.set(d.code, d));
    departmentsList.forEach((d) => map.set(d.code, d));
    return Array.from(map.values());
  }, [departmentsList]);

  // Shift Planning Roster State
  const [shiftRoster, setShiftRoster] = useState<Record<number, Record<string, ShiftType>>>(() => {
    const initial: Record<number, Record<string, ShiftType>> = {};
    staffList.forEach((s, index) => {
      initial[s.id] = {};
      WEEKDAYS.forEach((day, dIdx) => {
        if ((index + dIdx) % 7 === 0 || (index + dIdx) % 7 === 6) {
          initial[s.id][day] = "OFF";
        } else if (s.role === "receptionist" || s.role === "housekeeper") {
          initial[s.id][day] = dIdx % 2 === 0 ? "MORNING" : "EVENING";
        } else if (s.role === "security_officer" || s.role === "maintenance") {
          initial[s.id][day] = dIdx % 3 === 0 ? "NIGHT" : "MORNING";
        } else {
          initial[s.id][day] = "MORNING";
        }
      });
    });
    return initial;
  });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<string>("receptionist");
  const [newDept, setNewDept] = useState<string>("RECEPTION");
  const [newPhone, setNewPhone] = useState("");
  const [newShift, setNewShift] = useState<"ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK">("ON_SHIFT");

  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<string>("");
  const [editDept, setEditDept] = useState<string>("");

  // Filters
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [recStatusFilter, setRecStatusFilter] = useState<string>("ALL");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloorFilter, setRoomFloorFilter] = useState<number | "ALL">("ALL");

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) return false;
      if (
        search.trim() &&
        !s.full_name.toLowerCase().includes(search.trim().toLowerCase()) &&
        !s.role.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [staffList, selectedDept, search]);

  // Filtered Reclamations
  const filteredReclamations = useMemo(() => {
    return reclamationsList.filter((r) => {
      if (recDeptFilter !== "ALL" && r.department !== recDeptFilter) return false;
      if (recStatusFilter !== "ALL" && r.status !== recStatusFilter) return false;
      return true;
    });
  }, [reclamationsList, recDeptFilter, recStatusFilter]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomSearch && !r.room_number.includes(roomSearch)) return false;
      if (roomFloorFilter !== "ALL" && r.floor !== roomFloorFilter) return false;
      return true;
    });
  }, [rooms, roomSearch, roomFloorFilter]);

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    startTransition(async () => {
      const res = await createStaffMember({
        full_name: newFullName.trim(),
        role: newRole,
        department: newDept,
        phone_number: newPhone.trim() || undefined,
        shift_status: newShift,
      });

      if (res.success) {
        setMessage(`✅ Created employee "${newFullName}" successfully!`);
        setShowCreateModal(false);
        setNewFullName("");
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleToggleShift = (member: Staff) => {
    startTransition(async () => {
      await toggleStaffShift(member.id, member.shift_status);
      setMessage(`🔄 Shift status updated for ${member.full_name}.`);
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleMarkAbsent = (member: Staff) => {
    if (confirm(`Mark ${member.full_name} as ABSENT today and reassign open tickets to an on-shift peer?`)) {
      startTransition(async () => {
        await markStaffAbsentAndRedistribute(member.id);
        setMessage(`🚨 Marked ${member.full_name} as Absent. Reassigned tasks.`);
        setTimeout(() => setMessage(null), 4000);
      });
    }
  };

  const handleShiftChange = (staffId: number, day: string, newShift: ShiftType) => {
    setShiftRoster((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), [day]: newShift },
    }));
  };

  // Stats Data
  const totalStaff = staffList.length;
  const onShiftCount = staffList.filter((s) => s.shift_status === "ON_SHIFT").length;

  const deptStaffCounts: Record<string, number> = {};
  staffList.forEach((s) => {
    const dept = s.department || "RECEPTION";
    deptStaffCounts[dept] = (deptStaffCounts[dept] || 0) + 1;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ background: "rgba(6, 32, 22, 0.85)", padding: "1.25rem 1.5rem", borderRadius: 16, border: "1px solid rgba(52, 211, 153, 0.25)", boxShadow: "0 10px 30px rgba(5, 150, 105, 0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span>👥 RH MANAGER DASHBOARD</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Human Resources, Shift Planning & Hotel Analytics
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Emerald Mint Workspace Theme: plan shifts, manage employee rosters, inspect room state, and analyze HR stats.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#34d399", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>➕</span> Add Employee
            </button>
            <button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await logoutRole();
                  window.location.href = "/login";
                });
              }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>🔒</span> Log Out
            </button>
          </div>
        </div>

        {/* 4 SEPARATED MAIN TABS */}
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("ROOMS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "ROOMS" ? "#4ade80" : "rgba(255,255,255,0.08)",
              background: activeTab === "ROOMS" ? "rgba(74, 222, 128, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "ROOMS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🏨</span> 1. Rooms ({rooms.length})
          </button>

          <button
            onClick={() => setActiveTab("RECLAMATIONS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "RECLAMATIONS" ? "#e879f9" : "rgba(255,255,255,0.08)",
              background: activeTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "RECLAMATIONS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🛎️</span> 2. Reclamations ({reclamationsList.length})
          </button>

          <button
            onClick={() => setActiveTab("STATS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "STATS" ? "#fbbf24" : "rgba(255,255,255,0.08)",
              background: activeTab === "STATS" ? "rgba(251, 191, 36, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "STATS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📊</span> 3. Stats & Graphs
          </button>

          <button
            onClick={() => setActiveTab("EMPLOYEES")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "EMPLOYEES" ? "#34d399" : "rgba(255,255,255,0.08)",
              background: activeTab === "EMPLOYEES" ? "rgba(52, 211, 153, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "EMPLOYEES" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>👥</span> 4. Employees & Shifts ({totalStaff})
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ROOMS */}
      {/* ========================================================================= */}
      {activeTab === "ROOMS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#4ade80" }}>
              🏨 Property Rooms & Cleanliness Map ({filteredRooms.length} rooms)
            </h3>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Search room #..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              />

              <select
                value={roomFloorFilter}
                onChange={(e) => setRoomFloorFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Floors</option>
                <option value={1}>Floor 1</option>
                <option value={2}>Floor 2</option>
                <option value={3}>Floor 3</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
            {filteredRooms.map((room) => {
              const isDirty = room.cleaning_status === "DIRTY";
              const isClean = room.cleaning_status === "CLEAN";
              return (
                <div
                  key={room.id}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid",
                    borderColor: isDirty ? "rgba(239, 68, 68, 0.4)" : isClean ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Room {room.room_number}</span>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: room.is_occupied ? "#f59e0b" : "#10b981", color: "#000", fontWeight: 800 }}>
                      {room.is_occupied ? "Occupied" : "Vacant"}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Floor {room.floor} • {room.block?.replace("_", " ") || "Main"}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: isDirty ? "#f87171" : isClean ? "#4ade80" : "#fbbf24" }}>
                    {isDirty ? "🧹 DIRTY" : isClean ? "✨ CLEAN" : `🧼 ${room.cleaning_status}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECLAMATIONS */}
      {/* ========================================================================= */}
      {activeTab === "RECLAMATIONS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fbbf24" }}>
              🛎️ Reclamations Oversight & Department Issues ({filteredReclamations.length})
            </h3>

            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={recDeptFilter}
                onChange={(e) => setRecDeptFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Departments</option>
                {activeDepartments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>

              <select
                value={recStatusFilter}
                onChange={(e) => setRecStatusFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open Only</option>
                <option value="IN_PROGRESS">In Progress Only</option>
                <option value="RESOLVED">Resolved Only</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                  <th style={{ padding: "10px" }}>ID / Room</th>
                  <th style={{ padding: "10px" }}>Department</th>
                  <th style={{ padding: "10px" }}>Category / Description</th>
                  <th style={{ padding: "10px" }}>Priority</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Assigned Staff</th>
                </tr>
              </thead>
              <tbody>
                {filteredReclamations.map((rec) => {
                  const isResolved = rec.status === "RESOLVED";
                  return (
                    <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>
                        #{rec.id} • Room {rec.room?.room_number || rec.room_id}
                      </td>
                      <td style={{ padding: "10px", color: "#cbd5e1" }}>{rec.department}</td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 700, color: "#f8fafc" }}>{rec.category}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{rec.description}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: rec.priority === "EMERGENCY" ? "#ef4444" : rec.priority === "HIGH" ? "#f59e0b" : "rgba(59,130,246,0.3)", color: "#fff" }}>
                          {rec.priority || "STANDARD"}
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: isResolved ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isResolved ? "#4ade80" : "#f87171" }}>
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#94a3b8", fontSize: 12 }}>
                        {rec.assigned_to ? rec.assigned_to.full_name : "— Unassigned —"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STATS & GRAPHS */}
      {/* ========================================================================= */}
      {activeTab === "STATS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* GRAPH 1: DEPARTMENT HEADCOUNT DISTRIBUTION */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#34d399" }}>
                📊 Staff Headcount per Department
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(deptStaffCounts).map(([dept, count]) => {
                  const maxStaff = Math.max(...Object.values(deptStaffCounts), 1);
                  const pct = Math.round((count / maxStaff) * 100);
                  return (
                    <div key={dept}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
                        <span>{dept}</span>
                        <strong style={{ color: "#34d399" }}>{count} employees</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34d399)", borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRAPH 2: ATTENDANCE & SHIFT STATUS GAUGE */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>
                ⏱️ Attendance & Active Shift Gauge
              </h4>

              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <svg width="120" height="120" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3.8"
                    strokeDasharray={`${Math.round((onShiftCount / (totalStaff || 1)) * 100)}, 100`}
                  />
                  <text x="18" y="20.35" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">
                    {Math.round((onShiftCount / (totalStaff || 1)) * 100)}%
                  </text>
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#34d399", fontWeight: 700 }}>🟢 On Shift Today:</span>
                    <strong style={{ color: "#fff" }}>{onShiftCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>⚪ Off Shift / Rest:</span>
                    <strong style={{ color: "#fff" }}>{totalStaff - onShiftCount}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMPLOYEES & SHIFT ROSTER */}
      {/* ========================================================================= */}
      {activeTab === "EMPLOYEES" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* STAFF DIRECTORY */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                👥 Staff Roster ({filteredStaff.length} employees)
              </h3>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                    <th style={{ padding: "10px" }}>Employee Name</th>
                    <th style={{ padding: "10px" }}>Role</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Shift Status</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#ffffff" }}>{member.full_name}</td>
                      <td style={{ padding: "10px", color: "#38bdf8" }}>{member.role}</td>
                      <td style={{ padding: "10px", color: "#e879f9" }}>{member.department || "RECEPTION"}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: member.shift_status === "ON_SHIFT" ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)", color: member.shift_status === "ON_SHIFT" ? "#4ade80" : "#94a3b8" }}>
                          {member.shift_status || "OFF_SHIFT"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => handleToggleShift(member)} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(56, 189, 248, 0.2)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", fontSize: 11, cursor: "pointer" }}>
                            Shift
                          </button>
                          <button onClick={() => handleMarkAbsent(member)} style={{ padding: "4px 8px", borderRadius: 6, background: "#f59e0b", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* WEEKLY SHIFT SCHEDULER MATRIX */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
              🗓️ Weekly Shift Roster Matrix
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.9)", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "10px", textAlign: "left", minWidth: 160 }}>Employee</th>
                    {WEEKDAYS.map((day) => (
                      <th key={day} style={{ padding: "10px", minWidth: 120 }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((member) => {
                    const memberShifts = shiftRoster[member.id] || {};
                    return (
                      <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 10px", textAlign: "left" }}>
                          <div style={{ fontWeight: 700, color: "#ffffff" }}>{member.full_name}</div>
                          <div style={{ fontSize: 11, color: "#34d399" }}>{member.role}</div>
                        </td>
                        {WEEKDAYS.map((day) => {
                          const currentShift: ShiftType = memberShifts[day] || "MORNING";
                          const shiftInfo = SHIFT_LABELS[currentShift];
                          return (
                            <td key={day} style={{ padding: "6px" }}>
                              <select
                                value={currentShift}
                                onChange={(e) => handleShiftChange(member.id, day, e.target.value as ShiftType)}
                                style={{
                                  width: "100%",
                                  padding: "6px",
                                  borderRadius: 6,
                                  background: shiftInfo.bg,
                                  border: `1px solid ${shiftInfo.color}`,
                                  color: shiftInfo.color,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <option value="MORNING">🌅 Morning</option>
                                <option value="EVENING">🌇 Evening</option>
                                <option value="NIGHT">🌃 Night</option>
                                <option value="OFF">🏖️ Off</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#34d399" }}>➕ Add New Hotel Employee</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jean Dupont"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {STANDARD_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department *</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {activeDepartments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#34d399", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Create Staff Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
