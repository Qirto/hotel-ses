"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Staff, Department } from "@/utils/roomsData";
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

export default function HrPortal({ staffList, departmentsList = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"STAFF" | "DEPARTMENTS">("STAFF");
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

  // Staff Handlers
  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setEditFullName(member.full_name);
    setEditRole(member.role);
    setEditDept(member.department);
    setEditPhone(member.phone_number || "");
    setEditSkills(member.skill_tags || []);
    setEditShift(member.shift_status || "ON_SHIFT");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    const finalRole = newRole === "CUSTOM" ? customRole.trim() : newRole;
    const finalDept = newDept === "CUSTOM" ? customDept.trim().toUpperCase() : newDept;

    if (!finalRole || !finalDept) {
      alert("Please specify a valid role and department!");
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
        setMessage(`✅ Created employee ${newFullName} in ${finalDept}!`);
        setShowCreateModal(false);
        setNewFullName("");
        setNewPhone("");
        setNewSkills([]);
        setCustomDept("");
        setCustomRole("");
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Error creating staff: ${res.error}`);
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    startTransition(async () => {
      const res = await updateStaffMember(editingStaff.id, {
        full_name: editFullName.trim(),
        role: editRole.trim(),
        department: editDept.trim(),
        phone_number: editPhone.trim() || undefined,
        skill_tags: editSkills,
        shift_status: editShift,
      });

      if (res.success) {
        setMessage(`✅ Updated profile for ${editFullName}!`);
        setEditingStaff(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Error updating staff: ${res.error}`);
      }
    });
  };

  const handleDeleteStaff = (member: Staff) => {
    if (confirm(`Remove ${member.full_name} (${member.role} in ${member.department}) from the hotel roster?`)) {
      startTransition(async () => {
        const res = await deleteStaffMember(member.id);
        if (res.success) {
          setMessage(`🗑️ Removed employee ${member.full_name}.`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage(`❌ Error deleting staff: ${res.error}`);
        }
      });
    }
  };

  const handleToggleShift = (member: Staff) => {
    startTransition(async () => {
      await toggleStaffShift(member.id, member.shift_status);
      setMessage(`Updated shift status for ${member.full_name}`);
      setTimeout(() => setMessage(null), 2500);
    });
  };

  const handleMarkAbsent = (member: Staff) => {
    if (confirm(`Mark ${member.full_name} as absent and auto-redistribute open tickets?`)) {
      startTransition(async () => {
        const res = await markStaffAbsentAndRedistribute(member.id);
        if (res.success) {
          setMessage(`⚠️ ${member.full_name} marked absent. Open tickets auto-redistributed!`);
          setTimeout(() => setMessage(null), 4000);
        }
      });
    }
  };

  // Department CRUD Handlers
  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditDeptIcon(dept.icon || "🏢");
    setEditDeptHead(dept.head_of_department || "");
    setEditDeptDesc(dept.description || "");
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Tab Navigation */}
      <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.25rem 1.5rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#34d399", display: "flex", alignItems: "center", gap: 8 }}>
              <span>👥 Hotel Operational HR & Departments CRUD</span>
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Full CRUD management for every department and employee working in the hotel property.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {activeTab === "STAFF" ? (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#10b981",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>➕</span> Add New Staff Member
              </button>
            ) : (
              <button
                onClick={() => setShowCreateDeptModal(true)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#e879f9",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>➕</span> Add New Hotel Department
              </button>
            )}
          </div>
        </div>

        {/* View Switcher: Staff Directory vs Departments CRUD */}
        <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
          <button
            onClick={() => setActiveTab("STAFF")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: activeTab === "STAFF" ? "#34d399" : "rgba(255,255,255,0.08)",
              background: activeTab === "STAFF" ? "rgba(52, 211, 153, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "STAFF" ? "#34d399" : "#94a3b8",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>👥 Staff Directory</span>
            <span style={{ fontSize: 11, background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 999 }}>{staffList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("DEPARTMENTS")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: activeTab === "DEPARTMENTS" ? "#e879f9" : "rgba(255,255,255,0.08)",
              background: activeTab === "DEPARTMENTS" ? "rgba(232, 121, 249, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "DEPARTMENTS" ? "#e879f9" : "#94a3b8",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🏢 All Hotel Departments (CRUD)</span>
            <span style={{ fontSize: 11, background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 999 }}>{activeDepartments.length}</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: STAFF DIRECTORY */}
      {/* =================================================================== */}
      {activeTab === "STAFF" && (
        <>
          {/* Department Filter Pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
            <button
              onClick={() => setSelectedDept("ALL")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: selectedDept === "ALL" ? "#34d399" : "rgba(255,255,255,0.1)",
                background: selectedDept === "ALL" ? "rgba(52, 211, 153, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: selectedDept === "ALL" ? "#34d399" : "#94a3b8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🏨 All Departments ({staffList.length})
            </button>
            {activeDepartments.map((dept) => {
              const count = staffList.filter((s) => s.department === dept.code).length;
              const isSelected = selectedDept === dept.code;
              return (
                <button
                  key={dept.code}
                  onClick={() => setSelectedDept(dept.code)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: isSelected ? "#34d399" : "rgba(255,255,255,0.08)",
                    background: isSelected ? "rgba(52, 211, 153, 0.2)" : "rgba(15, 23, 42, 0.6)",
                    color: isSelected ? "#34d399" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {dept.icon} {dept.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search staff by name, title, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: 13,
              }}
            />
          </div>

          {/* Staff Roster Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filteredStaff.map((member) => {
              const isOnShift = member.shift_status === "ON_SHIFT";
              const deptObj = activeDepartments.find((d) => d.code === member.department);
              const deptLabel = deptObj ? `${deptObj.icon} ${deptObj.name}` : member.department;

              return (
                <div
                  key={member.id}
                  style={{
                    background: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                        {member.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: "#38bdf8", textTransform: "capitalize", fontWeight: 600 }}>
                        {member.role.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 11, color: "#a855f7", marginTop: 2, fontWeight: 500 }}>
                        {deptLabel}
                      </div>
                    </div>

                    <button
                      disabled={isPending}
                      onClick={() => handleToggleShift(member)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        background: isOnShift ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: isOnShift ? "#4ade80" : "#f87171",
                      }}
                    >
                      ● {member.shift_status}
                    </button>
                  </div>

                  {member.phone_number && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      📞 {member.phone_number}
                    </div>
                  )}

                  {/* Skills Badges */}
                  {member.skill_tags && member.skill_tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {member.skill_tags.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      disabled={isPending}
                      onClick={() => handleOpenEdit(member)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: 6,
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit
                    </button>

                    {isOnShift && (
                      <button
                        disabled={isPending}
                        onClick={() => handleMarkAbsent(member)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ⚠️ Absent
                      </button>
                    )}

                    <button
                      disabled={isPending}
                      onClick={() => handleDeleteStaff(member)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* TAB 2: DEPARTMENTS OPERATIONS & CRUD */}
      {/* =================================================================== */}
      {activeTab === "DEPARTMENTS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Search bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <input
              type="text"
              placeholder="🔍 Search departments by name, code, or department head..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: 13,
              }}
            />
          </div>

          {/* Department Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {filteredDepartments.map((dept) => {
              const staffCount = staffList.filter((s) => s.department === dept.code).length;
              const onShiftCount = staffList.filter((s) => s.department === dept.code && s.shift_status === "ON_SHIFT").length;

              return (
                <div
                  key={dept.code}
                  style={{
                    background: "rgba(30, 41, 59, 0.55)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 26, background: "rgba(255,255,255,0.06)", padding: "6px 8px", borderRadius: 8 }}>
                        {dept.icon || "🏢"}
                      </span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                          {dept.name}
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(232, 121, 249, 0.2)", color: "#e879f9", fontWeight: 700 }}>
                          {dept.code}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: staffCount > 0 ? "#34d399" : "#94a3b8" }}>
                        👥 {staffCount} Staff
                      </div>
                      <div style={{ fontSize: 10, color: "#38bdf8" }}>
                        ● {onShiftCount} on shift
                      </div>
                    </div>
                  </div>

                  {dept.head_of_department && (
                    <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6, background: "rgba(15, 23, 42, 0.4)", padding: "6px 10px", borderRadius: 6 }}>
                      <span style={{ color: "#f59e0b" }}>👤 Head:</span>
                      <span style={{ fontWeight: 600 }}>{dept.head_of_department}</span>
                    </div>
                  )}

                  {dept.description && (
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                      {dept.description}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      disabled={isPending}
                      onClick={() => handleOpenEditDept(dept)}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit Department
                    </button>

                    <button
                      disabled={isPending}
                      onClick={() => handleDeleteDept(dept)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW STAFF MEMBER */}
      {/* =================================================================== */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
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
                  placeholder="e.g. Marc Laurent"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department *</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                >
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.icon} {d.name} ({d.code})</option>
                  ))}
                  <option value="CUSTOM">➕ Other / Custom Department...</option>
                </select>
                {newDept === "CUSTOM" && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom department name (e.g. VALET_PARKING)"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Position / Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                >
                  {STANDARD_ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                  <option value="CUSTOM">➕ Custom Role Title...</option>
                </select>
                {newRole === "CUSTOM" && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom job title (e.g. Sommelier, Executive Chef)"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+33 6 12 34 56 78"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Initial Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value as "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK")}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    <option value="ON_SHIFT">ON_SHIFT (Active)</option>
                    <option value="OFF_SHIFT">OFF_SHIFT</option>
                    <option value="ON_BREAK">ON_BREAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Skill Badges</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVAILABLE_SKILLS.map((sk) => {
                    const isSelected = newSkills.includes(sk);
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => setNewSkills(isSelected ? newSkills.filter((s) => s !== sk) : [...newSkills, sk])}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid",
                          borderColor: isSelected ? "#34d399" : "#334155",
                          background: isSelected ? "rgba(52, 211, 153, 0.2)" : "#1e293b",
                          color: isSelected ? "#34d399" : "#cbd5e1",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "} {sk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 18px", borderRadius: 8, background: "#10b981", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT STAFF MEMBER */}
      {/* =================================================================== */}
      {editingStaff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>✏️ Edit Profile: {editingStaff.full_name}</h3>
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

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                >
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.icon} {d.name} ({d.code})</option>
                  ))}
                  {!activeDepartments.some((d) => d.code === editDept) && (
                    <option value={editDept}>{editDept}</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Position / Role</label>
                <input
                  type="text"
                  required
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Shift Status</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value as "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK")}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    <option value="ON_SHIFT">ON_SHIFT</option>
                    <option value="OFF_SHIFT">OFF_SHIFT</option>
                    <option value="ON_BREAK">ON_BREAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Skill Badges</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVAILABLE_SKILLS.map((sk) => {
                    const isSelected = editSkills.includes(sk);
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => setEditSkills(isSelected ? editSkills.filter((s) => s !== sk) : [...editSkills, sk])}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid",
                          borderColor: isSelected ? "#38bdf8" : "#334155",
                          background: isSelected ? "rgba(56, 189, 248, 0.2)" : "#1e293b",
                          color: isSelected ? "#38bdf8" : "#cbd5e1",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "} {sk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 18px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW DEPARTMENT */}
      {/* =================================================================== */}
      {showCreateDeptModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#e879f9" }}>➕ Add New Hotel Department</h3>
              <button onClick={() => setShowCreateDeptModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateDeptSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 90 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Icon *</label>
                  <input
                    type="text"
                    required
                    placeholder="🏢"
                    value={deptIconInput}
                    onChange={(e) => setDeptIconInput(e.target.value)}
                    style={{ width: "100%", padding: 8, textAlign: "center", fontSize: 18, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAUNDRY or IT_SYSTEMS"
                    value={deptCodeInput}
                    onChange={(e) => setDeptCodeInput(e.target.value.toUpperCase())}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laundry, Uniforms & Dry Cleaning"
                  value={deptNameInput}
                  onChange={(e) => setDeptNameInput(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Head of Department / Director</label>
                <input
                  type="text"
                  placeholder="e.g. Claire Durand"
                  value={deptHeadInput}
                  onChange={(e) => setDeptHeadInput(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Description & Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="e.g. In-house guest garment cleaning, staff uniform tailoring and linen supply"
                  value={deptDescInput}
                  onChange={(e) => setDeptDescInput(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowCreateDeptModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 18px", borderRadius: 8, background: "#e879f9", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT DEPARTMENT */}
      {/* =================================================================== */}
      {editingDept && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>✏️ Edit Department: {editingDept.code}</h3>
              <button onClick={() => setEditingDept(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleEditDeptSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 90 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Icon</label>
                  <input
                    type="text"
                    value={editDeptIcon}
                    onChange={(e) => setEditDeptIcon(e.target.value)}
                    style={{ width: "100%", padding: 8, textAlign: "center", fontSize: 18, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department Full Name</label>
                  <input
                    type="text"
                    required
                    value={editDeptName}
                    onChange={(e) => setEditDeptName(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Head of Department / Director</label>
                <input
                  type="text"
                  value={editDeptHead}
                  onChange={(e) => setEditDeptHead(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Description & Responsibilities</label>
                <textarea
                  rows={3}
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setEditingDept(null)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 18px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
