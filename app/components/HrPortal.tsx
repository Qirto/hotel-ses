"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Staff } from "@/utils/roomsData";
import {
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffShift,
  markStaffAbsentAndRedistribute,
} from "@/app/actions";

interface Props {
  staffList: Staff[];
}

const AVAILABLE_ROLES = ["master", "manager", "receptionist", "maintenance", "governance"] as const;
const AVAILABLE_DEPTS = ["RECEPTION", "HOUSEKEEPING", "TECHNICAL", "MANAGEMENT"] as const;
const AVAILABLE_SKILLS = ["Electrical", "Plumbing", "HVAC", "General", "Locksmith", "Carpentry"];

export default function HrPortal({ staffList }: Props) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<typeof AVAILABLE_ROLES[number]>("maintenance");
  const [newDept, setNewDept] = useState<typeof AVAILABLE_DEPTS[number]>("TECHNICAL");
  const [newPhone, setNewPhone] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [newShift, setNewShift] = useState<"ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK">("ON_SHIFT");

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<typeof AVAILABLE_ROLES[number]>("maintenance");
  const [editDept, setEditDept] = useState<typeof AVAILABLE_DEPTS[number]>("TECHNICAL");
  const [editPhone, setEditPhone] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editShift, setEditShift] = useState<"ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK">("ON_SHIFT");

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) return false;
      if (search.trim() && !s.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [staffList, selectedDept, search]);

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

    startTransition(async () => {
      const res = await createStaffMember({
        full_name: newFullName.trim(),
        role: newRole,
        department: newDept,
        phone_number: newPhone.trim() || undefined,
        skill_tags: newSkills,
        shift_status: newShift,
      });

      if (res.success) {
        setMessage(`✅ Created employee ${newFullName}!`);
        setShowCreateModal(false);
        setNewFullName("");
        setNewPhone("");
        setNewSkills([]);
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
        role: editRole,
        department: editDept,
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

  const handleDelete = (member: Staff) => {
    if (confirm(`Are you sure you want to remove ${member.full_name} (${member.role}) from the staff roster?`)) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#34d399" }}>
            👥 Human Resources (RH) Management & Staff CRUD
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Full employee account lifecycle: Create, Read, Update, Delete, skill tags, shift tracking, and absent ticket reassignments.
          </p>
        </div>

        {/* CREATE BUTTON */}
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "9px 16px",
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
          <span>➕</span> Add New Employee
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Search Staff Name</label>
          <input
            type="text"
            placeholder="Type name (e.g. Alice, Karim, David)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13, boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Filter by Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
          >
            <option value="ALL">All Departments ({staffList.length})</option>
            {AVAILABLE_DEPTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Roster Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            style={{
              padding: "16px",
              borderRadius: 14,
              background: "rgba(30, 41, 59, 0.6)",
              border: member.is_present ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                  {member.full_name}
                </span>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {member.department} • <span style={{ textTransform: "capitalize", color: "#38bdf8", fontWeight: 700 }}>{member.role}</span>
                </div>
              </div>

              {/* Shift Pill */}
              <button
                disabled={isPending}
                onClick={() => handleToggleShift(member)}
                title="Click to toggle shift clock-in/out"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: member.shift_status === "ON_SHIFT" ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)",
                  color: member.shift_status === "ON_SHIFT" ? "#4ade80" : "#94a3b8",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {member.shift_status === "ON_SHIFT" ? "🟢 ON SHIFT" : "⚪ OFF SHIFT"}
              </button>
            </div>

            {/* Phone & Clocked info */}
            <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", justifyContent: "space-between" }}>
              <span>📞 {member.phone_number || "No phone listed"}</span>
              <span style={{ color: "#64748b" }}>
                {member.last_clock_in ? new Date(member.last_clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
              </span>
            </div>

            {/* Technician Skill Tags */}
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
                Skill Tags (Dispatch):
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {member.skill_tags && member.skill_tags.length > 0 ? (
                  member.skill_tags.map((st) => (
                    <span key={st} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 600 }}>
                      🏷️ {st}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: "#64748b" }}>General Assignment</span>
                )}
              </div>
            </div>

            {/* Action Buttons: Edit / Delete / Mark Absent */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleOpenEdit(member)}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  ✏️ Edit
                </button>
                <button
                  disabled={isPending}
                  onClick={() => handleDelete(member)}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  🗑️ Delete
                </button>
              </div>

              <button
                disabled={isPending || !member.is_present}
                onClick={() => handleMarkAbsent(member)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  background: member.is_present ? "rgba(245, 158, 11, 0.1)" : "transparent",
                  color: member.is_present ? "#fbbf24" : "#64748b",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: member.is_present ? "pointer" : "default",
                }}
              >
                Mark Absent & Reassign
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 500, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#10b981" }}>➕ Add New Employee</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thomas Shelby"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as typeof AVAILABLE_ROLES[number])}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as typeof AVAILABLE_DEPTS[number])}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {AVAILABLE_DEPTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+33 6 00 00 00 00"
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
                    <option value="ON_SHIFT">ON_SHIFT</option>
                    <option value="OFF_SHIFT">OFF_SHIFT</option>
                    <option value="ON_BREAK">ON_BREAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Skill Tags</label>
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
                          borderColor: isSelected ? "#10b981" : "#334155",
                          background: isSelected ? "rgba(16, 185, 129, 0.2)" : "#1e293b",
                          color: isSelected ? "#10b981" : "#cbd5e1",
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#10b981", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingStaff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 500, width: "100%", padding: "1.5rem" }}>
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

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as typeof AVAILABLE_ROLES[number])}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value as typeof AVAILABLE_DEPTS[number])}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {AVAILABLE_DEPTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
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
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Skill Tags</label>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
