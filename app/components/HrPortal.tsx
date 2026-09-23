"use client";

import React, { useState, useTransition } from "react";
import { Staff } from "@/utils/roomsData";
import { updateStaffSkills, toggleStaffShift, markStaffAbsentAndRedistribute } from "@/app/actions";

interface Props {
  staffList: Staff[];
}

const AVAILABLE_SKILLS = ["Electrical", "Plumbing", "HVAC", "General", "Locksmith", "Carpentry"];

export default function HrPortal({ staffList }: Props) {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editingSkills, setEditingSkills] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEditSkills = (member: Staff) => {
    setSelectedStaff(member);
    setEditingSkills(member.skill_tags || []);
  };

  const handleToggleSkill = (skill: string) => {
    if (editingSkills.includes(skill)) {
      setEditingSkills(editingSkills.filter((s) => s !== skill));
    } else {
      setEditingSkills([...editingSkills, skill]);
    }
  };

  const handleSaveSkills = () => {
    if (!selectedStaff) return;
    startTransition(async () => {
      await updateStaffSkills(selectedStaff.id, editingSkills);
      setSelectedStaff(null);
      setMessage(`✅ Updated skill tags for ${selectedStaff.full_name}!`);
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleToggleShift = (member: Staff) => {
    startTransition(async () => {
      await toggleStaffShift(member.id, member.shift_status);
      setMessage(`Updated shift status for ${member.full_name}`);
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleMarkAbsent = (member: Staff) => {
    if (confirm(`Mark ${member.full_name} as absent and auto-redistribute any open tickets?`)) {
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
      <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#34d399" }}>
          👥 Human Resources (RH) Management
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Employee accounts, technician skill tags for smart dispatch, live clock-in/out timestamps, and automatic absence redistribution.
        </p>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Staff Roster Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {staffList.map((member) => (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                  {member.full_name}
                </span>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {member.department} • <span style={{ textTransform: "capitalize", color: "#38bdf8" }}>{member.role}</span>
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

            {/* Technician Skill Tags */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Skill Tags (Smart Dispatch):</span>
                {member.role === "maintenance" && (
                  <button
                    onClick={() => handleEditSkills(member)}
                    style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Edit Skills
                  </button>
                )}
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

            {/* Attendance & Absence Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                Clocked: {member.last_clock_in ? new Date(member.last_clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
              </span>

              <button
                disabled={isPending || !member.is_present}
                onClick={() => handleMarkAbsent(member)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: member.is_present ? "rgba(239, 68, 68, 0.1)" : "transparent",
                  color: member.is_present ? "#f87171" : "#64748b",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: member.is_present ? "pointer" : "default",
                }}
              >
                🚨 Mark Absent & Reassign
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT SKILLS MODAL */}
      {selectedStaff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 440, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 17, color: "#38bdf8" }}>
              Assign Skill Tags: {selectedStaff.full_name}
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px 0" }}>
              These tags match incoming maintenance complaints directly to this technician.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {AVAILABLE_SKILLS.map((sk) => {
                const isSelected = editingSkills.includes(sk);
                return (
                  <button
                    key={sk}
                    onClick={() => handleToggleSkill(sk)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: isSelected ? "#38bdf8" : "rgba(255,255,255,0.15)",
                      background: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                      color: isSelected ? "#38bdf8" : "#cbd5e1",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {isSelected ? "✓ " : "+ "} {sk}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setSelectedStaff(null)}
                style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleSaveSkills}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}
              >
                Save Skill Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
