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
  updateRoomStayState,
  cycleRoomCleaning,
  createRapidReclamation,
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

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [modalDept, setModalDept] = useState<string>("TECHNICAL");
  const [modalDesc, setModalDesc] = useState<string>("");

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

  // Filters
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [recStatusFilter, setRecStatusFilter] = useState<string>("ALL");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloorFilter, setRoomFloorFilter] = useState<number | "ALL">("ALL");

  // Departments List
  const activeDepartments = useMemo(() => {
    const map = new Map<string, Department>();
    DEFAULT_HOTEL_DEPARTMENTS.forEach((d) => map.set(d.code, d));
    departmentsList.forEach((d) => map.set(d.code, d));
    return Array.from(map.values());
  }, [departmentsList]);

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

  // Room Modal Reclamations
  const roomModalReclamations = useMemo(() => {
    if (!selectedRoomModal) return [];
    return reclamationsList.filter(
      (r) => r.room_id === selectedRoomModal.id || r.room?.room_number === selectedRoomModal.room_number
    );
  }, [reclamationsList, selectedRoomModal]);

  // Staff Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    startTransition(async () => {
      const res = await createStaffMember({
        full_name: newFullName.trim(),
        role: newRole,
        department: newDept,
        phone_number: newPhone.trim() || undefined,
        shift_status: "ON_SHIFT",
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
    if (confirm(`Mark ${member.full_name} as ABSENT today and reassign open tickets?`)) {
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

  // Stay State Handler
  const handleStayState = (roomId: number, state: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED") => {
    startTransition(async () => {
      const res = await updateRoomStayState(roomId, state);
      if (res.success) {
        setMessage(`✅ Room state updated!`);
        if (selectedRoomModal) {
          setSelectedRoomModal((prev) => (prev ? { ...prev, is_occupied: state === "OCCUPIED" } : null));
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Cleaning Cycle Handler
  const handleCleaningCycle = (room: HotelRoom) => {
    const nextMap: Record<string, "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"> = {
      DIRTY: "CLEANING",
      CLEANING: "INSPECTING",
      INSPECTING: "CLEAN",
      CLEAN: "DIRTY",
    };
    const nextStatus = nextMap[room.cleaning_status] || "DIRTY";
    startTransition(async () => {
      const res = await cycleRoomCleaning(room.id, nextStatus);
      if (res.success) {
        setMessage(`🧹 Room ${room.room_number} cleaning set to ${nextStatus}!`);
        if (selectedRoomModal && selectedRoomModal.id === room.id) {
          setSelectedRoomModal((prev) => (prev ? { ...prev, cleaning_status: nextStatus } : null));
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Create Reclamation in Modal
  const handleModalCreateReclamation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomModal) return;

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: selectedRoomModal.id,
        department: modalDept,
        category: "General",
        description: modalDesc.trim() || `HR Ticket for Room ${selectedRoomModal.room_number}`,
      });

      if (res.success) {
        setMessage(`✅ Ticket created for Room ${selectedRoomModal.room_number}!`);
        setModalDesc("");
        setTimeout(() => setMessage(null), 3000);
      }
    });
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
    <div style={{ display: "flex", minHeight: "100vh", gap: "1.5rem", padding: "1.25rem" }}>
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: 270,
          flexShrink: 0,
          background: "rgba(6, 32, 22, 0.85)",
          border: "1px solid rgba(52, 211, 153, 0.25)",
          borderRadius: 20,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 30px rgba(5, 150, 105, 0.15)",
        }}
      >
        <div>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              <span>👥 RH MANAGER PORTAL</span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              HR & Shift Roster
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Emerald Mint Workspace Theme
            </p>
          </div>

          {/* VERTICAL NAV TABS */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
            {[
              { id: "EMPLOYEES", label: "👥 1. Employees & Shifts", count: totalStaff, color: "#34d399" },
              { id: "ROOMS", label: "🏨 2. Rooms Map", count: rooms.length, color: "#4ade80" },
              { id: "RECLAMATIONS", label: "🛎️ 3. Reclamations", count: reclamationsList.length, color: "#fbbf24" },
              { id: "STATS", label: "📊 4. Stats & Graphs", count: null, color: "#38bdf8" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid",
                    borderColor: isActive ? tab.color : "rgba(255, 255, 255, 0.06)",
                    background: isActive ? `rgba(52, 211, 153, 0.2)` : "rgba(15, 23, 42, 0.5)",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: isActive ? tab.color : "rgba(255, 255, 255, 0.1)", color: isActive ? "#000" : "#cbd5e1", fontSize: 11, fontWeight: 800 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* STACKED METRICS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Total Employees</span>
              <strong style={{ fontSize: 14, color: "#34d399" }}>{totalStaff}</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>On Shift Today</span>
              <strong style={{ fontSize: 14, color: "#38bdf8" }}>{onShiftCount}</strong>
            </div>
          </div>
        </div>

        {/* SIDEBAR FOOTER */}
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: "#34d399", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            ➕ Add Employee
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await logoutRole();
                window.location.href = "/login";
              });
            }}
            style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            🔒 Log Out & Exit
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ========================================================================= */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {message && (
          <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* TAB: EMPLOYEES & SHIFTS */}
        {activeTab === "EMPLOYEES" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                  👥 Staff Roster ({filteredStaff.length} employees)
                </h3>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8" }}>
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
                        <td style={{ padding: "10px", fontWeight: 700, color: "#fff" }}>{member.full_name}</td>
                        <td style={{ padding: "10px", color: "#38bdf8" }}>{member.role}</td>
                        <td style={{ padding: "10px", color: "#e879f9" }}>{member.department || "RECEPTION"}</td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: member.shift_status === "ON_SHIFT" ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)", color: member.shift_status === "ON_SHIFT" ? "#4ade80" : "#94a3b8" }}>
                            {member.shift_status || "OFF_SHIFT"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button onClick={() => handleToggleShift(member)} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(56, 189, 248, 0.2)", border: "1px solid #38bdf8", color: "#38bdf8", fontSize: 11, cursor: "pointer", marginRight: 6 }}>
                            Shift
                          </button>
                          <button onClick={() => handleMarkAbsent(member)} style={{ padding: "4px 8px", borderRadius: 6, background: "#f59e0b", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Absent
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SHIFT MATRIX */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                🗓️ Weekly Shift Roster Matrix
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
                  <thead>
                    <tr style={{ background: "rgba(30, 41, 59, 0.9)", color: "#94a3b8" }}>
                      <th style={{ padding: "10px", textAlign: "left", minWidth: 160 }}>Employee</th>
                      {WEEKDAYS.map((day) => (
                        <th key={day} style={{ padding: "10px", minWidth: 110 }}>{day}</th>
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
                                  style={{ width: "100%", padding: "5px", borderRadius: 6, background: shiftInfo.bg, border: `1px solid ${shiftInfo.color}`, color: shiftInfo.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
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

        {/* TAB: ROOMS MAP */}
        {activeTab === "ROOMS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#4ade80" }}>
              🏨 Property Rooms Directory ({filteredRooms.length} rooms)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, maxHeight: 600, overflowY: "auto" }}>
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomModal(room);
                    setModalTab("ROOM_STAT");
                  }}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    borderRadius: 10,
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#fff" }}>
                    <span>Room {room.room_number}</span>
                    <span style={{ fontSize: 10, color: room.is_occupied ? "#fbbf24" : "#4ade80" }}>{room.is_occupied ? "Occupied" : "Vacant"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Floor {room.floor}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: RECLAMATIONS */}
        {activeTab === "RECLAMATIONS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#fbbf24" }}>
              🛎️ Reclamations Oversight ({filteredReclamations.length})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8" }}>
                    <th style={{ padding: "10px" }}>ID / Room</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Category / Description</th>
                    <th style={{ padding: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => (
                    <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>#{rec.id} • Room {rec.room?.room_number || rec.room_id}</td>
                      <td style={{ padding: "10px", color: "#cbd5e1" }}>{rec.department}</td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{rec.category}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{rec.description}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: rec.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: rec.status === "RESOLVED" ? "#4ade80" : "#f87171" }}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: STATS */}
        {activeTab === "STATS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#34d399" }}>
                📊 Staff Headcount per Department
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(deptStaffCounts).map(([dept, count]) => (
                  <div key={dept}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
                      <span>{dept}</span>
                      <strong style={{ color: "#34d399" }}>{count} employees</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((count / Math.max(...Object.values(deptStaffCounts), 1)) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34d399)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ROOM POP-UP MODAL */}
      {selectedRoomModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1.5px solid rgba(52, 211, 153, 0.4)", borderRadius: 20, maxWidth: 840, width: "100%", height: 560, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "rgba(30, 41, 59, 0.9)", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
                Room {selectedRoomModal.room_number} Inspection & Operations
              </h3>
              <button onClick={() => setSelectedRoomModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* MODAL SIDEBAR */}
              <div style={{ width: 210, background: "rgba(15, 23, 42, 0.9)", borderRight: "1px solid rgba(255,255,255,0.08)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setModalTab("ROOM_STAT")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "ROOM_STAT" ? "#34d399" : "transparent", background: modalTab === "ROOM_STAT" ? "rgba(52, 211, 153, 0.2)" : "transparent", color: modalTab === "ROOM_STAT" ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  📊 1. Room Stat
                </button>
                <button
                  onClick={() => setModalTab("RECLAMATIONS")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "RECLAMATIONS" ? "#e879f9" : "transparent", background: modalTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.2)" : "transparent", color: modalTab === "RECLAMATIONS" ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  🛎️ 2. Reclamations ({roomModalReclamations.length})
                </button>
              </div>

              {/* MODAL CONTENT */}
              <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto" }}>
                {modalTab === "ROOM_STAT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: "#34d399", fontWeight: 800 }}>📊 Room Status & Live Parameters</h4>
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>Occupancy: {selectedRoomModal.is_occupied ? "Occupied" : "Vacant"}</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>Cleanliness: {selectedRoomModal.cleaning_status}</div>
                    <button onClick={() => handleCleaningCycle(selectedRoomModal)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(52, 211, 153, 0.2)", border: "1px solid #34d399", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                      🧹 Cycle Cleaning Status &rarr;
                    </button>
                  </div>
                )}

                {modalTab === "RECLAMATIONS" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: "#e879f9", fontWeight: 800 }}>🛎️ Room Reclamations</h4>
                    <form onSubmit={handleModalCreateReclamation} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input type="text" placeholder="Issue note..." value={modalDesc} onChange={(e) => setModalDesc(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                      <button type="submit" style={{ padding: "8px", borderRadius: 8, background: "#e879f9", border: "none", color: "#000", fontWeight: 800, cursor: "pointer" }}>Dispatch Ticket</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
