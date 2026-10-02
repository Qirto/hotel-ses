"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
import AppShell from "@/app/components/AppShell";
import { NavTabItem } from "@/app/components/BottomNav";

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
  isLiveSupabase = false,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ROOMS" | "RECLAMATIONS" | "STATS" | "EMPLOYEES">("EMPLOYEES");
  const [empSubTab, setEmpSubTab] = useState<"DIRECTORY" | "SHIFTS">("DIRECTORY");
  const [rosterDeptFilter, setRosterDeptFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-hr")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reclamations" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLiveSupabase, router]);

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [roomModalSubTab, setRoomModalSubTab] = useState<"ACTIVE" | "MOST_REPORTED" | "HISTORY">("ACTIVE");
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

  // Active Reclamations for Room Modal
  const roomActiveReclamations = useMemo(() => {
    return roomModalReclamations.filter(
      (r) => r.status === "OPEN" || r.status === "IN_PROGRESS"
    );
  }, [roomModalReclamations]);

  // Most Reported Problem Categories for Room Modal
  const roomProblemStats = useMemo(() => {
    if (!selectedRoomModal) return [];
    const counts: Record<string, { count: number; department: string; lastDate?: string }> = {};
    roomModalReclamations.forEach((rec) => {
      const cat = rec.category || "General";
      if (!counts[cat]) {
        counts[cat] = { count: 0, department: rec.department, lastDate: rec.created_at };
      }
      counts[cat].count += 1;
    });
    const total = roomModalReclamations.length || 1;
    return Object.entries(counts)
      .map(([category, info]) => ({
        category,
        count: info.count,
        department: info.department,
        percentage: Math.round((info.count / total) * 100),
        lastDate: info.lastDate,
      }))
      .sort((a, b) => b.count - a.count);
  }, [roomModalReclamations, selectedRoomModal]);

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

  const handleDeleteStaff = (id: number, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the staff directory?`)) {
      startTransition(async () => {
        const res = await deleteStaffMember(id);
        if (res.success) {
          setMessage(`🗑️ Removed ${name} from staff directory.`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage(`❌ Error removing staff member.`);
        }
      });
    }
  };

  // Filtered Roster Staff
  const filteredRosterStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (rosterDeptFilter !== "ALL" && s.department !== rosterDeptFilter) return false;
      return true;
    });
  }, [staffList, rosterDeptFilter]);

  // Shift Roster Aggregations
  const rosterStats = useMemo(() => {
    let morning = 0;
    let evening = 0;
    let night = 0;
    let off = 0;
    Object.values(shiftRoster).forEach((memberDays) => {
      Object.values(memberDays).forEach((shift) => {
        if (shift === "MORNING") morning++;
        else if (shift === "EVENING") evening++;
        else if (shift === "NIGHT") night++;
        else if (shift === "OFF") off++;
      });
    });
    return { morning, evening, night, off };
  }, [shiftRoster]);

  // Stats Data
  const totalStaff = staffList.length;
  const onShiftCount = staffList.filter((s) => s.shift_status === "ON_SHIFT").length;

  const deptStaffCounts: Record<string, number> = {};
  staffList.forEach((s) => {
    const dept = s.department || "RECEPTION";
    deptStaffCounts[dept] = (deptStaffCounts[dept] || 0) + 1;
  });

  const navItems: NavTabItem[] = [
    {
      id: "EMPLOYEES",
      label: "Staff & Shifts",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      badge: totalStaff,
      isActive: activeTab === "EMPLOYEES",
      onClick: () => setActiveTab("EMPLOYEES"),
    },
    {
      id: "ROOMS",
      label: "Rooms",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
          <path d="M8 7h.01" />
          <path d="M16 7h.01" />
          <path d="M12 7h.01" />
          <path d="M12 11h.01" />
        </svg>
      ),
      badge: rooms.length,
      isActive: activeTab === "ROOMS",
      onClick: () => setActiveTab("ROOMS"),
    },
    {
      id: "RECLAMATIONS",
      label: "Tickets",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
      badge: reclamationsList.length > 0 ? reclamationsList.length : undefined,
      isActive: activeTab === "RECLAMATIONS",
      onClick: () => setActiveTab("RECLAMATIONS"),
    },
    {
      id: "STATS",
      label: "Analytics",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      isActive: activeTab === "STATS",
      onClick: () => setActiveTab("STATS"),
    },
  ];

  return (
    <AppShell
      items={navItems}
      departmentName="Human Resources & Roster"
      departmentCode="HR"
      departmentColor="var(--status-emerald)"
      onSignOut={() => {
        startTransition(async () => {
          await logoutRole();
          window.location.href = "/login";
        });
      }}
      headerActions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: "var(--status-emerald)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>+ Add Staff</span>
        </button>
      }
    >
      {message && (
        <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--status-emerald-bg)", border: "1px solid var(--status-emerald)", color: "var(--status-emerald)", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

        {/* TAB: EMPLOYEES & SHIFTS WITH SUB-CATEGORIES */}
        {activeTab === "EMPLOYEES" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* SUB-CATEGORY SWITCHER BAR */}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "6px 8px",
                background: "var(--surface-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
                width: "fit-content",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <button
                onClick={() => setEmpSubTab("DIRECTORY")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: empSubTab === "DIRECTORY" ? "linear-gradient(135deg, #059669, #34d399)" : "transparent",
                  color: empSubTab === "DIRECTORY" ? "#000000" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease-in-out",
                  boxShadow: empSubTab === "DIRECTORY" ? "0 4px 12px rgba(52, 211, 153, 0.3)" : "none",
                }}
              >
                <span>👥 1. Employees Directory</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: empSubTab === "DIRECTORY" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)",
                    color: empSubTab === "DIRECTORY" ? "#000" : "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {filteredStaff.length}
                </span>
              </button>

              <button
                onClick={() => setEmpSubTab("SHIFTS")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: empSubTab === "SHIFTS" ? "linear-gradient(135deg, #0284c7, #38bdf8)" : "transparent",
                  color: empSubTab === "SHIFTS" ? "#000000" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease-in-out",
                  boxShadow: empSubTab === "SHIFTS" ? "0 4px 12px rgba(56, 189, 248, 0.3)" : "none",
                }}
              >
                <span>🗓️ 2. Weekly Shift Roster & Schedules</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: empSubTab === "SHIFTS" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)",
                    color: empSubTab === "SHIFTS" ? "#000" : "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  7 Days
                </span>
              </button>
            </div>

            {/* SUB-CATEGORY 1: EMPLOYEES DIRECTORY */}
            {empSubTab === "DIRECTORY" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* SUMMARY CARDS BAR */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "14px", borderRadius: 14, border: "1px solid rgba(52, 211, 153, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Staff Members</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399", marginTop: 2 }}>{totalStaff}</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "14px", borderRadius: 14, border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Active On Shift</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8", marginTop: 2 }}>{onShiftCount}</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "14px", borderRadius: 14, border: "1px solid rgba(251, 191, 36, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Off Shift / Standby</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", marginTop: 2 }}>{totalStaff - onShiftCount}</div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "14px", borderRadius: 14, border: "1px solid rgba(232, 121, 249, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Departments Managed</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#e879f9", marginTop: 2 }}>{activeDepartments.length}</div>
                  </div>
                </div>

                {/* DIRECTORY CONTROLS & TABLE */}
                <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                        👥 Employees Master Directory
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                        Manage staff profiles, department assignments, and live shift status
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="Search staff name or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12, width: 220 }}
                      />

                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#34d399", fontSize: 12, fontWeight: 700 }}
                      >
                        <option value="ALL">All Departments ({totalStaff})</option>
                        {activeDepartments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.icon} {d.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ padding: "8px 16px", borderRadius: 8, background: "#34d399", border: "none", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        ➕ Add New Employee
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8" }}>
                          <th style={{ padding: "12px 10px" }}>Employee Name</th>
                          <th style={{ padding: "12px 10px" }}>Role</th>
                          <th style={{ padding: "12px 10px" }}>Department</th>
                          <th style={{ padding: "12px 10px" }}>Phone / Contact</th>
                          <th style={{ padding: "12px 10px" }}>Shift Status</th>
                          <th style={{ padding: "12px 10px", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                              No staff members found matching search & department filters.
                            </td>
                          </tr>
                        ) : (
                          filteredStaff.map((member) => (
                            <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "12px 10px", fontWeight: 700, color: "#fff" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 16 }}>👤</span>
                                  <span>{member.full_name}</span>
                                </div>
                              </td>
                              <td style={{ padding: "12px 10px", color: "#38bdf8", fontWeight: 600 }}>{member.role}</td>
                              <td style={{ padding: "12px 10px" }}>
                                <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(232, 121, 249, 0.15)", border: "1px solid rgba(232, 121, 249, 0.3)", color: "#e879f9", fontSize: 11, fontWeight: 700 }}>
                                  {member.department || "RECEPTION"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 10px", color: "#94a3b8", fontSize: 12 }}>
                                {member.phone_number || "📞 Unlisted"}
                              </td>
                              <td style={{ padding: "12px 10px" }}>
                                <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: member.shift_status === "ON_SHIFT" ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)", color: member.shift_status === "ON_SHIFT" ? "#4ade80" : "#94a3b8", border: `1px solid ${member.shift_status === "ON_SHIFT" ? "rgba(74, 222, 128, 0.4)" : "rgba(148, 163, 184, 0.3)"}` }}>
                                  {member.shift_status === "ON_SHIFT" ? "🟢 ON SHIFT" : "⚪ OFF SHIFT"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                <button
                                  onClick={() => handleToggleShift(member)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}
                                >
                                  ⚡ Toggle Shift
                                </button>
                                <button
                                  onClick={() => handleMarkAbsent(member)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}
                                >
                                  🚨 Absent
                                </button>
                                <button
                                  onClick={() => handleDeleteStaff(member.id, member.full_name)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 2: SHIFT SCHEDULING & ROSTER */}
            {empSubTab === "SHIFTS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* SHIFT SUMMARY CARDS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "14px", borderRadius: 14, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>🌅 Morning Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{rosterStats.morning} slots</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>07:00 - 15:00</div>
                  </div>

                  <div style={{ background: "rgba(251, 191, 36, 0.1)", padding: "14px", borderRadius: 14, border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                    <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>🌇 Evening Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{rosterStats.evening} slots</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>15:00 - 23:00</div>
                  </div>

                  <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: "14px", borderRadius: 14, border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                    <div style={{ fontSize: 11, color: "#a855f7", fontWeight: 700 }}>🌃 Night Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{rosterStats.night} slots</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>23:00 - 07:00</div>
                  </div>

                  <div style={{ background: "rgba(148, 163, 184, 0.1)", padding: "14px", borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.3)" }}>
                    <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>🏖️ Rest Days</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{rosterStats.off} days</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Off / Rest</div>
                  </div>
                </div>

                {/* WEEKLY ROSTER MATRIX */}
                <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                        🗓️ Weekly Shift Roster & Planning Matrix
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                        Assign and adjust daily working shifts for all hotel departments across the week
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Filter Roster:</label>
                      <select
                        value={rosterDeptFilter}
                        onChange={(e) => setRosterDeptFilter(e.target.value)}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#38bdf8", fontSize: 12, fontWeight: 700 }}
                      >
                        <option value="ALL">All Departments</option>
                        {activeDepartments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.icon} {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
                      <thead>
                        <tr style={{ background: "rgba(30, 41, 59, 0.9)", color: "#94a3b8" }}>
                          <th style={{ padding: "12px 10px", textAlign: "left", minWidth: 170 }}>Employee / Role</th>
                          {WEEKDAYS.map((day) => (
                            <th key={day} style={{ padding: "12px 10px", minWidth: 115 }}>
                              <div style={{ color: "#ffffff", fontWeight: 800 }}>{day}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRosterStaff.map((member) => {
                          const memberShifts = shiftRoster[member.id] || {};
                          return (
                            <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "10px", textAlign: "left" }}>
                                <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{member.full_name}</div>
                                <div style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>{member.role}</div>
                                <div style={{ fontSize: 10, color: "#94a3b8" }}>{member.department}</div>
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
                                        padding: "6px 4px",
                                        borderRadius: 8,
                                        background: shiftInfo.bg,
                                        border: `1px solid ${shiftInfo.color}`,
                                        color: shiftInfo.color,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        textAlign: "center",
                                      }}
                                    >
                                      <option value="MORNING">🌅 Morning (07-15)</option>
                                      <option value="EVENING">🌇 Evening (15-23)</option>
                                      <option value="NIGHT">🌃 Night (23-07)</option>
                                      <option value="OFF">🏖️ Off / Rest</option>
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
          </div>
        )}

        {/* TAB: ROOMS MAP */}
        {activeTab === "ROOMS" && (
          <div className="ses-card">
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "var(--status-emerald)" }}>
              🏨 Property Rooms Directory ({filteredRooms.length} rooms)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(160px, 100%), 1fr))", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
              {filteredRooms.map((room) => {
                const isClean = room.cleaning_status === "CLEAN";
                const isDirty = room.cleaning_status === "DIRTY";

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomModal(room);
                      setModalTab("ROOM_STAT");
                    }}
                    className="room-matrix-card"
                    style={{
                      border: "1.5px solid",
                      borderColor: isDirty ? "var(--status-rose)" : isClean ? "var(--status-emerald)" : "var(--border-default)",
                      background: "var(--surface-card)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Room {room.room_number}</span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          background: room.is_occupied ? "var(--status-amber-bg)" : "var(--status-emerald-bg)",
                          color: room.is_occupied ? "var(--status-amber)" : "var(--status-emerald)",
                          border: `1px solid ${room.is_occupied ? "var(--status-amber)" : "var(--status-emerald)"}`,
                          fontWeight: 800,
                        }}
                      >
                        {room.is_occupied ? "Occupied" : "Vacant"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Floor {room.floor}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isDirty ? "var(--status-rose)" : isClean ? "var(--status-emerald)" : "var(--status-amber)" }}>
                        {room.cleaning_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: RECLAMATIONS */}
        {activeTab === "RECLAMATIONS" && (
          <div className="ses-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--status-amber)" }}>
                  🛎️ Reclamations Oversight ({filteredReclamations.length})
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  Operational tickets and department dispatches.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={recStatusFilter}
                  onChange={(e) => setRecStatusFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open Only</option>
                  <option value="IN_PROGRESS">In Progress Only</option>
                  <option value="RESOLVED">Resolved Only</option>
                </select>

                <select
                  value={recDeptFilter}
                  onChange={(e) => setRecDeptFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                >
                  <option value="ALL">All Departments</option>
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="responsive-table-view">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>ID / Room</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Category / Description</th>
                    <th style={{ padding: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => (
                    <tr key={rec.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "var(--accent-amber)" }}>#{rec.id} • Room {rec.room?.room_number || rec.room_id}</td>
                      <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{rec.department}</td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{rec.category}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.description}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: rec.status === "RESOLVED" ? "var(--status-emerald-bg)" : "var(--status-rose-bg)", color: rec.status === "RESOLVED" ? "var(--status-emerald)" : "var(--status-rose)" }}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (< 768px) - NO horizontal scroll */}
            <div className="responsive-cards-view">
              {filteredReclamations.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No incident tickets match the selected filters.
                </div>
              ) : (
                filteredReclamations.map((rec) => {
                  const roomNum = rec.room?.room_number || `Room ${rec.room_id}`;
                  const isResolved = rec.status === "RESOLVED";

                  return (
                    <div key={rec.id} className="mobile-ticket-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-amber)" }}>
                            #{rec.id} • {roomNum}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--surface-2)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {rec.department}
                          </span>
                        </div>

                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isResolved ? "var(--status-emerald-bg)" : "var(--status-rose-bg)",
                            color: isResolved ? "var(--status-emerald)" : "var(--status-rose)",
                          }}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                          {rec.category}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {rec.description}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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

      {/* ROOM POP-UP MODAL */}
      {selectedRoomModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 840, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

                {/* MODAL TAB 2: RECLAMATIONS WITH SUB-CATEGORIES */}
                {modalTab === "RECLAMATIONS" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* SUB-CATEGORY TAB SWITCHER FOR ROOM RECLAMATIONS */}
                    <div style={{ display: "flex", gap: 8, padding: "4px", background: "rgba(15, 23, 42, 0.8)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        onClick={() => setRoomModalSubTab("ACTIVE")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "ACTIVE" ? "#34d399" : "transparent",
                          color: roomModalSubTab === "ACTIVE" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>⚡ Active Issues</span>
                        {roomActiveReclamations.length > 0 && (
                          <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "ACTIVE" ? "rgba(0,0,0,0.2)" : "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                            {roomActiveReclamations.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setRoomModalSubTab("MOST_REPORTED")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "MOST_REPORTED" ? "#fbbf24" : "transparent",
                          color: roomModalSubTab === "MOST_REPORTED" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>💥 Most Reported</span>
                        <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "MOST_REPORTED" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "MOST_REPORTED" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomProblemStats.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setRoomModalSubTab("HISTORY")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "HISTORY" ? "#e879f9" : "transparent",
                          color: roomModalSubTab === "HISTORY" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>📜 Full History</span>
                        <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "HISTORY" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "HISTORY" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomModalReclamations.length}
                        </span>
                      </button>
                    </div>

                    {/* SUB-CATEGORY 1: ACTIVE PROBLEMS (IF EXIST) */}
                    {roomModalSubTab === "ACTIVE" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#34d399", fontWeight: 800 }}>
                          ⚡ Active Reclamations ({roomActiveReclamations.length})
                        </h4>

                        {roomActiveReclamations.length === 0 ? (
                          <div style={{ padding: "12px", borderRadius: 10, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>✅</span>
                            <span>No active problems recorded for Room {selectedRoomModal.room_number}. Operations normal.</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {roomActiveReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.7)", padding: "12px", borderRadius: 10, border: "1px solid rgba(52, 211, 153, 0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>#{rec.id} • {rec.category}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(52, 211, 153, 0.2)", color: "#34d399" }}>{rec.department}</span>
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "OPEN" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", color: rec.status === "OPEN" ? "#f87171" : "#fbbf24", fontWeight: 800, border: "1px solid currentColor" }}>
                                    {rec.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{rec.description}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CREATE RECLAMATION FORM */}
                        <form onSubmit={handleModalCreateReclamation} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#34d399" }}>➕ Log New Reclamation for Room {selectedRoomModal.room_number}</div>
                          <select
                            value={modalDept}
                            onChange={(e) => setModalDept(e.target.value)}
                            style={{ padding: "6px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                          >
                            {DEFAULT_HOTEL_DEPARTMENTS.map((d) => (
                              <option key={d.code} value={d.code}>{d.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Description of issue..."
                            value={modalDesc}
                            onChange={(e) => setModalDesc(e.target.value)}
                            style={{ padding: "8px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            style={{ padding: "8px", borderRadius: 8, background: "#34d399", border: "none", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12 }}
                          >
                            Dispatch Reclamation &rarr;
                          </button>
                        </form>
                      </div>
                    )}

                    {/* SUB-CATEGORY 2: MOST REPORTED PROBLEMS */}
                    {roomModalSubTab === "MOST_REPORTED" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#fbbf24", fontWeight: 800 }}>
                          💥 Most Reported Problem Categories
                        </h4>

                        {roomProblemStats.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No problem patterns recorded for Room {selectedRoomModal.room_number} yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {roomProblemStats.map((stat) => (
                              <div key={stat.category} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 10, border: "1px solid rgba(251, 191, 36, 0.25)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{stat.category}</span>
                                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>({stat.department})</span>
                                  </div>
                                  <span style={{ fontWeight: 800, color: "#fbbf24", fontSize: 13 }}>{stat.count} Reports</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                  <div style={{ width: `${stat.percentage}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34d399)" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-CATEGORY 3: FULL HISTORY FOR EACH ROOM */}
                    {roomModalSubTab === "HISTORY" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#e879f9", fontWeight: 800 }}>
                          📜 Complete Room {selectedRoomModal.room_number} Ticket History ({roomModalReclamations.length})
                        </h4>

                        {roomModalReclamations.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No past or historical tickets logged for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                            {roomModalReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                                    #{rec.id} • {rec.category} <span style={{ color: "#34d399", fontWeight: 600 }}>({rec.department})</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{rec.description}</div>
                                </div>
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: rec.status === "RESOLVED" ? "#4ade80" : "#f87171", fontWeight: 800 }}>
                                  {rec.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ADD EMPLOYEE MODAL */}
      {showCreateModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, width: "100%", padding: "1.5rem", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#34d399" }}>
                ➕ Add New Employee
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marc Vance"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Role Position *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#38bdf8", fontSize: 13, fontWeight: 700 }}
                >
                  {STANDARD_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Department *</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e879f9", fontSize: 13, fontWeight: 700 }}
                >
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+33 6 12 34 56 78"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", border: "1px solid #334155", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "10px 20px", borderRadius: 8, background: "#34d399", border: "none", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                >
                  Create Staff Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
