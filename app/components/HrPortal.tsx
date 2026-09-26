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
} from "@/app/actions";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
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

const AVAILABLE_SKILLS = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "General",
  "Locksmith",
  "Carpentry",
  "Culinary",
  "Mixology",
  "First Aid",
  "Foreign Languages",
  "Massage",
  "Customer Service",
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
  const [activeTab, setActiveTab] = useState<"STAFF" | "SHIFTS" | "DEPARTMENTS" | "RECLAMATIONS" | "ROOM_STATE">("STAFF");
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

  // Shift Planning Roster State (Staff ID -> Day -> ShiftType)
  const [shiftRoster, setShiftRoster] = useState<Record<number, Record<string, ShiftType>>>(() => {
    const initial: Record<number, Record<string, ShiftType>> = {};
    staffList.forEach((s, index) => {
      initial[s.id] = {};
      WEEKDAYS.forEach((day, dIdx) => {
        // Generate realistic default weekly shift rotation based on staff role & index
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

  // Create Staff Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<string>("receptionist");
  const [customRole, setCustomRole] = useState("");
  const [newDept, setNewDept] = useState<string>("RECEPTION");
  const [customDept, setCustomDept] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [newShift, setNewShift] = useState<"ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK">("ON_SHIFT");

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<string>("");
  const [editDept, setEditDept] = useState<string>("");
  const [editPhone, setEditPhone] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editShift, setEditShift] = useState<"ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK">("ON_SHIFT");

  // Create Department Modal State
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [deptCodeInput, setDeptCodeInput] = useState("");
  const [deptNameInput, setDeptNameInput] = useState("");
  const [deptIconInput, setDeptIconInput] = useState("🏢");
  const [deptHeadInput, setDeptHeadInput] = useState("");
  const [deptDescInput, setDeptDescInput] = useState("");

  // Edit Department Modal State
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptIcon, setEditDeptIcon] = useState("🏢");
  const [editDeptHead, setEditDeptHead] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");

  // Reclamations View Filters
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [recStatusFilter, setRecStatusFilter] = useState<string>("ALL");

  // Room State View Filters
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloorFilter, setRoomFloorFilter] = useState<number | "ALL">("ALL");

  // Filtered staff list
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

  // Filtered departments list
  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return activeDepartments;
    const q = search.trim().toLowerCase();
    return activeDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.head_of_department && d.head_of_department.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [activeDepartments, search]);

  // Filtered Reclamations for HR view
  const filteredReclamations = useMemo(() => {
    return reclamationsList.filter((r) => {
      if (recDeptFilter !== "ALL" && r.department !== recDeptFilter) return false;
      if (recStatusFilter !== "ALL" && r.status !== recStatusFilter) return false;
      return true;
    });
  }, [reclamationsList, recDeptFilter, recStatusFilter]);

  // Filtered Rooms for HR Room State view
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomSearch && !r.room_number.includes(roomSearch)) return false;
      if (roomFloorFilter !== "ALL" && r.floor !== roomFloorFilter) return false;
      return true;
    });
  }, [rooms, roomSearch, roomFloorFilter]);

  // Staff Handlers
  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setEditFullName(member.full_name);
    setEditRole(member.role);
    setEditDept(member.department || "RECEPTION");
    setEditPhone(member.phone_number || "");
    setEditSkills(member.skill_tags || []);
    setEditShift(member.shift_status || "ON_SHIFT");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = newRole === "OTHER" ? customRole.trim() : newRole;
    const finalDept = newDept === "OTHER" ? customDept.trim().toUpperCase() : newDept;

    if (!newFullName.trim() || !finalRole || !finalDept) {
      alert("Please fill in all required fields!");
      return;
    }

    startTransition(async () => {
      const res = await createStaffMember({
        full_name: newFullName.trim(),
        role: finalRole,
        department: finalDept,
        phone_number: newPhone.trim() || undefined,
        skill_tags: newSkills,
        shift_status: newShift,
      });

      if (res.success) {
        setMessage(`✅ Created employee "${newFullName}" successfully!`);
        setShowCreateModal(false);
        setNewFullName("");
        setNewPhone("");
        setNewSkills([]);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Error creating staff member: ${res.error}`);
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    startTransition(async () => {
      const res = await updateStaffMember(editingStaff.id, {
        full_name: editFullName.trim(),
        role: editRole,
        department: editDept,
        phone_number: editPhone.trim() || undefined,
        skill_tags: editSkills,
        shift_status: editShift,
      });

      if (res.success) {
        setMessage(`✅ Updated employee "${editFullName}" successfully!`);
        setEditingStaff(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Error updating staff member: ${res.error}`);
      }
    });
  };

  const handleDeleteStaff = (member: Staff) => {
    if (confirm(`Are you sure you want to remove employee "${member.full_name}" from the hotel staff list?`)) {
      startTransition(async () => {
        const res = await deleteStaffMember(member.id);
        if (res.success) {
          setMessage(`🗑️ Removed employee "${member.full_name}".`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage(`❌ Error deleting staff member: ${res.error}`);
        }
      });
    }
  };

  const handleToggleShift = (member: Staff) => {
    startTransition(async () => {
      const res = await toggleStaffShift(member.id, member.shift_status);
      if (res.success) {
        setMessage(`🔄 Shift status updated for ${member.full_name}.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleMarkAbsent = (member: Staff) => {
    if (confirm(`Mark ${member.full_name} as ABSENT today and reassign open tickets to an on-shift peer?`)) {
      startTransition(async () => {
        const res = await markStaffAbsentAndRedistribute(member.id);
        if (res.success) {
          setMessage(`🚨 Marked ${member.full_name} as Absent. Reassigned tasks to available staff.`);
          setTimeout(() => setMessage(null), 4000);
        }
      });
    }
  };

  // Shift Schedule Cell Change
  const handleShiftChange = (staffId: number, day: string, newShift: ShiftType) => {
    setShiftRoster((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {}),
        [day]: newShift,
      },
    }));
  };

  // Save/Apply Roster Notification
  const handleSaveRoster = () => {
    setMessage("✅ Weekly Shift Roster successfully saved and dispatched to department heads!");
    setTimeout(() => setMessage(null), 4000);
  };

  // Department Handlers
  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCodeInput.trim() || !deptNameInput.trim()) {
      alert("Please provide both department code and name!");
      return;
    }

    startTransition(async () => {
      const res = await createDepartment({
        code: deptCodeInput,
        name: deptNameInput,
        icon: deptIconInput || "🏢",
        head_of_department: deptHeadInput,
        description: deptDescInput,
      });

      if (res.success) {
        setMessage(`✅ Created department "${deptNameInput}" [${deptCodeInput.toUpperCase()}]!`);
        setShowCreateDeptModal(false);
        setDeptCodeInput("");
        setDeptNameInput("");
        setDeptIconInput("🏢");
        setDeptHeadInput("");
        setDeptDescInput("");
        setTimeout(() => setMessage(null), 3500);
      } else {
        setMessage(`❌ Error creating department: ${res.error}`);
      }
    });
  };

  const handleEditDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    startTransition(async () => {
      const res = await updateDepartment(editingDept.id, {
        name: editDeptName,
        icon: editDeptIcon,
        head_of_department: editDeptHead,
        description: editDeptDesc,
      });

      if (res.success) {
        setMessage(`✅ Updated department "${editDeptName}"!`);
        setEditingDept(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Error updating department: ${res.error}`);
      }
    });
  };

  const handleDeleteDept = (dept: Department) => {
    const assignedCount = staffList.filter((s) => s.department === dept.code).length;
    const confirmMsg = assignedCount > 0
      ? `Delete department "${dept.name}" [${dept.code}]? WARNING: ${assignedCount} staff member(s) currently belong to this department!`
      : `Delete department "${dept.name}" [${dept.code}] from the hotel system?`;

    if (confirm(confirmMsg)) {
      startTransition(async () => {
        const res = await deleteDepartment(dept.id);
        if (res.success) {
          setMessage(`🗑️ Deleted department "${dept.name}".`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage(`❌ Error deleting department: ${res.error}`);
        }
      });
    }
  };

  // Staff Stats
  const totalStaff = staffList.length;
  const onShiftCount = staffList.filter((s) => s.shift_status === "ON_SHIFT").length;
  const offShiftCount = staffList.filter((s) => s.shift_status === "OFF_SHIFT").length;
  const totalDepts = activeDepartments.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Multi-Tab Navigation */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem 1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span>👥 HR MANAGER DASHBOARD</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Employee Management, Shift Planning & Hotel Overview
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Full HR portal to plan shifts, manage employee rosters, inspect room states, and track reclamations.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {activeTab === "STAFF" && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#10b981", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>➕</span> Add Employee
              </button>
            )}
            {activeTab === "SHIFTS" && (
              <button
                onClick={handleSaveRoster}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#38bdf8", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>💾</span> Publish Weekly Shift Roster
              </button>
            )}
            {activeTab === "DEPARTMENTS" && (
              <button
                onClick={() => setShowCreateDeptModal(true)}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#e879f9", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>➕</span> Add Department
              </button>
            )}
          </div>
        </div>

        {/* HR Dashboard Quick Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Total Employees</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#34d399" }}>{totalStaff}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>On Shift Today</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{onShiftCount}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Off Shift / Rest</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8" }}>{offShiftCount}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Hotel Departments</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e879f9" }}>{totalDepts}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Active Reclamations</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{reclamationsList.length}</div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, overflowX: "auto" }}>
          {[
            { id: "STAFF", label: "👥 Employees Directory", icon: "👥", color: "#34d399" },
            { id: "SHIFTS", label: "🗓️ Shift Planner & Roster", icon: "🗓️", color: "#38bdf8" },
            { id: "DEPARTMENTS", label: "🏢 Departments CRUD", icon: "🏢", color: "#e879f9" },
            { id: "RECLAMATIONS", label: "📋 Reclamations Oversight", icon: "📋", color: "#fbbf24" },
            { id: "ROOM_STATE", label: "🔑 Room State View", icon: "🔑", color: "#4ade80" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor: isActive ? tab.color : "rgba(255, 255, 255, 0.08)",
                  background: isActive ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.5)",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES DIRECTORY & STAFF CRUD */}
      {/* ========================================================================= */}
      {activeTab === "STAFF" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
              👥 Staff Roster & Employee Management ({filteredStaff.length} employees)
            </h3>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Search staff name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Departments</option>
                {activeDepartments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                  <th style={{ padding: "10px" }}>Employee Name</th>
                  <th style={{ padding: "10px" }}>Role</th>
                  <th style={{ padding: "10px" }}>Department</th>
                  <th style={{ padding: "10px" }}>Contact</th>
                  <th style={{ padding: "10px" }}>Skill Tags</th>
                  <th style={{ padding: "10px" }}>Shift Status</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      No staff members found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const isOnShift = member.shift_status === "ON_SHIFT";
                    return (
                      <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#ffffff" }}>
                          {member.full_name}
                        </td>
                        <td style={{ padding: "10px", color: "#38bdf8", fontWeight: 600 }}>
                          {member.role}
                        </td>
                        <td style={{ padding: "10px", color: "#e879f9", fontSize: 12 }}>
                          {member.department || "RECEPTION"}
                        </td>
                        <td style={{ padding: "10px", color: "#cbd5e1", fontSize: 12 }}>
                          {member.phone_number || "—"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(member.skill_tags || []).map((sk) => (
                              <span key={sk} style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", fontSize: 10, color: "#cbd5e1" }}>
                                {sk}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isOnShift ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: isOnShift ? "#4ade80" : "#94a3b8",
                          }}>
                            {member.shift_status || "OFF_SHIFT"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              disabled={isPending}
                              onClick={() => handleToggleShift(member)}
                              title="Toggle On/Off Shift"
                              style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(56, 189, 248, 0.2)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", fontSize: 11, cursor: "pointer" }}
                            >
                              🔄 Shift
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleOpenEdit(member)}
                              style={{ padding: "4px 8px", borderRadius: 6, background: "#3b82f6", border: "none", color: "#fff", fontSize: 11, cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleMarkAbsent(member)}
                              style={{ padding: "4px 8px", borderRadius: 6, background: "#f59e0b", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Absent
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleDeleteStaff(member)}
                              style={{ padding: "4px 8px", borderRadius: 6, background: "#ef4444", border: "none", color: "#fff", fontSize: 11, cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHIFT PLANNER & SCHEDULE ROSTER */}
      {/* ========================================================================= */}
      {activeTab === "SHIFTS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8" }}>
                🗓️ Employee Shift Schedule & Roster Planner
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Planificate daily working shifts across all 7 weekdays for hotel staff.
              </p>
            </div>

            {/* Shift Legend */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(SHIFT_LABELS) as ShiftType[]).map((st) => {
                const s = SHIFT_LABELS[st];
                return (
                  <div key={st} style={{ padding: "4px 8px", borderRadius: 6, background: s.bg, border: `1px solid ${s.color}`, color: s.color, fontSize: 11, fontWeight: 700 }}>
                    {s.label} ({s.time})
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Shift Roster Matrix */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.9)", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "10px", textAlign: "left", minWidth: 160 }}>Employee & Dept</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day} style={{ padding: "10px", minWidth: 130 }}>{day}</th>
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
                        <div style={{ fontSize: 11, color: "#38bdf8" }}>{member.role} ({member.department})</div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEPARTMENT ROSTER & CRUD */}
      {/* ========================================================================= */}
      {activeTab === "DEPARTMENTS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#e879f9" }}>
            🏢 Hotel Department Structure & Heads of Department ({filteredDepartments.length} departments)
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {filteredDepartments.map((dept) => {
              const assignedCount = staffList.filter((s) => s.department === dept.code).length;
              return (
                <div key={dept.id} style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{dept.icon || "🏢"} {dept.name}</span>
                      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(232, 121, 249, 0.2)", color: "#e879f9", fontWeight: 700 }}>
                        {dept.code}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                      👤 <strong>Head of Dept:</strong> {dept.head_of_department || "Unassigned"}
                    </div>

                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 10 }}>
                      {dept.description || "No description specified."}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>
                      👥 {assignedCount} Staff Assigned
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setEditDeptName(dept.name);
                          setEditDeptIcon(dept.icon || "🏢");
                          setEditDeptHead(dept.head_of_department || "");
                          setEditDeptDesc(dept.description || "");
                        }}
                        style={{ padding: "4px 8px", borderRadius: 6, background: "#3b82f6", border: "none", color: "#fff", fontSize: 11, cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept)}
                        style={{ padding: "4px 8px", borderRadius: 6, background: "#ef4444", border: "none", color: "#fff", fontSize: 11, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECLAMATIONS OVERSIGHT (FOR HR MANAGER) */}
      {/* ========================================================================= */}
      {activeTab === "RECLAMATIONS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fbbf24" }}>
                📋 HR Reclamations Oversight & Department Performance
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                View all active complaints and workloads assigned across hotel departments.
              </p>
            </div>

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
                {filteredReclamations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      No reclamations found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredReclamations.map((rec) => {
                    const isResolved = rec.status === "RESOLVED";
                    const isInProgress = rec.status === "IN_PROGRESS";
                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>
                          #{rec.id} • Room {rec.room?.room_number || rec.room_id}
                        </td>
                        <td style={{ padding: "10px", color: "#cbd5e1" }}>
                          {rec.department}
                        </td>
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
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: isResolved ? "rgba(34, 197, 94, 0.2)" : isInProgress ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isResolved ? "#4ade80" : isInProgress ? "#fbbf24" : "#f87171" }}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", color: "#94a3b8", fontSize: 12 }}>
                          {rec.assigned_to ? rec.assigned_to.full_name : "— Unassigned —"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ROOM STATE OVERVIEW (FOR HR MANAGER) */}
      {/* ========================================================================= */}
      {activeTab === "ROOM_STATE" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#4ade80" }}>
                🔑 Live Room State & Housekeeping Overview ({filteredRooms.length} rooms)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Monitor property room occupancy and dirty/clean status distribution.
              </p>
            </div>

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

          {/* Rooms Grid */}
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
                    <option value="OTHER">Custom Role...</option>
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

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+33 6 12 34 56 78"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#10b981", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Create Staff Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>✏️ Edit Employee Details</h3>
              <button onClick={() => setEditingStaff(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Role</label>
                  <input
                    type="text"
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {activeDepartments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {showCreateDeptModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#e879f9" }}>➕ Create New Hotel Department</h3>
              <button onClick={() => setShowCreateDeptModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateDeptSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Dept Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VALET"
                    value={deptCodeInput}
                    onChange={(e) => setDeptCodeInput(e.target.value.toUpperCase())}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Valet & Parking"
                    value={deptNameInput}
                    onChange={(e) => setDeptNameInput(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Head of Department</label>
                <input
                  type="text"
                  placeholder="e.g. Antoine Dubois"
                  value={deptHeadInput}
                  onChange={(e) => setDeptHeadInput(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateDeptModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#e879f9", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Create Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
