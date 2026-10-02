"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  HotelRoom,
  Reclamation,
  Staff,
  isHousekeepingMissingOrCleanTicket,
  isMaintenanceFixTicket,
} from "@/utils/roomsData";
import {
  cycleRoomCleaning,
  updateRoomHeadcount,
  createRapidReclamation,
  acknowledgeReclamation,
  resolveReclamation,
} from "@/app/actions";
import AppShell from "@/app/components/AppShell";
import { NavTabItem } from "@/app/components/BottomNav";

interface Props {
  rooms: HotelRoom[];
  reclamations?: Reclamation[];
  staff?: Staff[];
  isLiveSupabase?: boolean;
}

export default function GouvernantePortal({ rooms, reclamations = [], staff = [], isLiveSupabase = false }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"rooms" | "hk_tickets" | "maint_notifications">("rooms");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFloor, setFilterFloor] = useState<number | "ALL">("ALL");
  const [inspectingRoom, setInspectingRoom] = useState<HotelRoom | null>(null);
  const [checklist, setChecklist] = useState({
    bedding: true,
    bathroom: true,
    minibar: true,
    electronics: true,
  });
  const [brokenItemNote, setBrokenItemNote] = useState("");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isPending, startTransition] = useTransition();

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-gouvernante")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
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

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus !== "ALL" && r.cleaning_status !== filterStatus) return false;
    if (filterFloor !== "ALL" && r.floor !== filterFloor) return false;
    return true;
  });

  // Filter Housekeeping Action tickets (Missing items / unclean rooms)
  const hkActionTickets = reclamations.filter(
    (r) => !r.is_confidential && isHousekeepingMissingOrCleanTicket(r)
  );
  const openHkTicketsCount = hkActionTickets.filter((r) => r.status !== "RESOLVED").length;

  // Filter Maintenance Notifications (Room repair tickets in progress by Maintenance)
  const maintNotifications = reclamations.filter(
    (r) => !r.is_confidential && isMaintenanceFixTicket(r) && r.status !== "RESOLVED"
  );

  const getNextStatus = (current: string): "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN" => {
    if (current === "DIRTY") return "CLEANING";
    if (current === "CLEANING") return "INSPECTING";
    if (current === "INSPECTING") return "CLEAN";
    return "DIRTY";
  };

  const handleCycleStatus = (room: HotelRoom) => {
    const next = getNextStatus(room.cleaning_status);
    startTransition(async () => {
      await cycleRoomCleaning(room.id, next);
    });
  };

  const handleHeadcountChange = (room: HotelRoom, deltaAdult: number, deltaChild: number) => {
    const newAdults = Math.max(0, (room.adult_count || 0) + deltaAdult);
    const newChildren = Math.max(0, (room.child_count || 0) + deltaChild);
    startTransition(async () => {
      await updateRoomHeadcount(room.id, newAdults, newChildren);
    });
  };

  const handleEscalateMaintenance = (roomId: number) => {
    if (!brokenItemNote.trim()) {
      alert("Please specify the broken item found!");
      return;
    }
    startTransition(async () => {
      await createRapidReclamation({
        roomId,
        department: "MAINTENANCE",
        category: "General",
        description: `[Housekeeping Inspection Fault]: ${brokenItemNote}`,
        priority: "HIGH",
      });
      alert("Maintenance repair ticket dispatched! (Maintenance will fix it, Housekeeping Manager & GM notified).");
      setBrokenItemNote("");
      setInspectingRoom(null);
    });
  };

  const handleAcknowledgeHkTicket = (id: number) => {
    startTransition(async () => {
      await acknowledgeReclamation(id);
    });
  };

  const handleResolveHkTicket = (id: number) => {
    startTransition(async () => {
      await resolveReclamation(id, resolutionNote || "Missing item provided / Cleaning completed");
      setResolvingId(null);
      setResolutionNote("");
    });
  };

  const navItems: NavTabItem[] = [
    {
      id: "rooms",
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
      isActive: activeTab === "rooms",
      onClick: () => setActiveTab("rooms"),
    },
    {
      id: "hk_tickets",
      label: "HK Tasks",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
          <path d="M15 13 9 7l4-4 6 6h3l-3 3" />
        </svg>
      ),
      badge: openHkTicketsCount > 0 ? openHkTicketsCount : undefined,
      isActive: activeTab === "hk_tickets",
      onClick: () => setActiveTab("hk_tickets"),
    },
    {
      id: "maint_notifications",
      label: "Maintenance",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
      badge: maintNotifications.length > 0 ? maintNotifications.length : undefined,
      isActive: activeTab === "maint_notifications",
      onClick: () => setActiveTab("maint_notifications"),
    },
  ];

  return (
    <AppShell
      items={navItems}
      departmentName="Housekeeping & Governance"
      departmentCode="HK"
      departmentColor="var(--status-purple)"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Top Banner */}
        <div className="ses-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--status-purple)" }}>
              Housekeeping & Gouvernante Hub
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Room cleaning management, missing item dispatches, and live room maintenance repair notifications.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
              {rooms.filter(r => r.cleaning_status === "DIRTY").length} Dirty Rooms
            </span>
            <span style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 12, fontWeight: 700, color: "var(--status-purple)" }}>
              {openHkTicketsCount} Open Tickets
            </span>
          </div>
        </div>

      {/* TAB 1: ROOM CLEANING GRID */}
      {activeTab === "rooms" && (
        <div className="ses-card">
          {/* Filter Bar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              {["ALL", "DIRTY", "CLEANING", "INSPECTING", "CLEAN"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: filterStatus === st ? "var(--status-purple)" : "transparent",
                    color: filterStatus === st ? "#ffffff" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              {[
                { label: "All Floors", value: "ALL" as const },
                { label: "Floor 1", value: 1 },
                { label: "Floor 2", value: 2 },
                { label: "Floor 3", value: 3 },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilterFloor(f.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: filterFloor === f.value ? "var(--accent-amber)" : "transparent",
                    color: filterFloor === f.value ? "#ffffff" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>
              Showing <strong>{filteredRooms.length}</strong> rooms
            </span>
          </div>

          {/* Room Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filteredRooms.map((room) => {
              const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                DIRTY: { bg: "var(--status-rose-bg)", text: "var(--status-rose)", border: "var(--status-rose)" },
                CLEANING: { bg: "var(--status-amber-bg)", text: "var(--status-amber)", border: "var(--status-amber)" },
                INSPECTING: { bg: "var(--status-purple-bg)", text: "var(--status-purple)", border: "var(--status-purple)" },
                CLEAN: { bg: "var(--status-emerald-bg)", text: "var(--status-emerald)", border: "var(--status-emerald)" },
              };
              const colors = statusColors[room.cleaning_status] || statusColors.CLEAN;

              return (
                <div
                  key={room.id}
                  className="room-matrix-card"
                  style={{
                    padding: "16px",
                    background: "var(--surface-card)",
                    border: `1.5px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                      #{room.room_number}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                      Floor {room.floor} • {room.block === "BLOCK_A" ? "A" : "B"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cleaning State:</span>
                    <button
                      disabled={isPending}
                      onClick={() => handleCycleStatus(room)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${colors.border}`,
                        background: colors.bg,
                        color: colors.text,
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {room.cleaning_status} &rarr;
                    </button>
                  </div>

                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", padding: "8px 10px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Guests Audit:</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-primary)" }}>
                        <span>👤 {room.adult_count || 0}</span>
                        <button onClick={() => handleHeadcountChange(room, 1, 0)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+</button>
                        <button onClick={() => handleHeadcountChange(room, -1, 0)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>-</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-primary)" }}>
                        <span>🧒 {room.child_count || 0}</span>
                        <button onClick={() => handleHeadcountChange(room, 0, 1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+</button>
                        <button onClick={() => handleHeadcountChange(room, 0, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>-</button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setInspectingRoom(room)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-2)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📋 Room Inspection Checklist
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HOUSEKEEPING ACTION TICKETS (MISSING ITEMS / CLEANING) */}
      {activeTab === "hk_tickets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--status-purple-bg)", border: "1px solid var(--status-purple)", color: "var(--status-purple)", fontSize: 13, fontWeight: 600 }}>
            🧹 <strong>Housekeeping Action Queue:</strong> Missing items (towels, bedding, toiletries, minibar) & unclean room requests. <em>(Not sent to Maintenance, actioned by Housekeeping & monitored by GM).</em>
          </div>

          {hkActionTickets.length === 0 ? (
            <div className="ses-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              🎉 No pending housekeeping or missing item requests!
            </div>
          ) : (
            hkActionTickets.map((task) => (
              <div
                key={task.id}
                className="mobile-ticket-card"
                style={{
                  background: task.status === "RESOLVED" ? "var(--surface-card)" : "var(--surface-card)",
                  border: task.status === "RESOLVED" ? "1px solid var(--border-subtle)" : "1px solid var(--status-purple)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--status-purple)" }}>
                      Room #{task.room?.room_number || task.room_id}
                    </span>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "var(--status-purple-bg)", color: "var(--status-purple)", fontWeight: 700 }}>
                      {task.category}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: task.status === "RESOLVED" ? "var(--status-emerald-bg)" : "var(--status-amber-bg)", color: task.status === "RESOLVED" ? "var(--status-emerald)" : "var(--status-amber)", fontWeight: 700 }}>
                      {task.status}
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {task.description}
                  </p>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    Created: {task.created_at ? new Date(task.created_at).toLocaleString() : "Recently"}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  {task.status === "OPEN" && (
                    <button
                      disabled={isPending}
                      onClick={() => handleAcknowledgeHkTicket(task.id)}
                      style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", background: "var(--status-purple)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      Acknowledge & Dispatch
                    </button>
                  )}

                  {task.status !== "RESOLVED" && (
                    resolvingId === task.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          placeholder="Fulfillment notes..."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          style={{ padding: "6px 8px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12 }}
                        />
                        <button
                          disabled={isPending}
                          onClick={() => handleResolveHkTicket(task.id)}
                          style={{ padding: "6px 12px", borderRadius: 6, background: "var(--status-emerald)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => setResolvingId(null)}
                          style={{ padding: "6px 8px", borderRadius: 6, background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingId(task.id)}
                        style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", background: "var(--status-emerald-bg)", border: "1px solid var(--status-emerald)", color: "var(--status-emerald)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        Mark Delivered / Resolved
                      </button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: MAINTENANCE REPAIR NOTIFICATIONS FOR HOUSEKEEPER MANAGER */}
      {activeTab === "maint_notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--accent-amber)", fontSize: 13, fontWeight: 600 }}>
            🔔 <strong>Maintenance Notifications for Housekeeper Manager:</strong> Live room repair tickets assigned to Maintenance. <em>(Provides awareness so housekeeping teams know repairs are underway).</em>
          </div>

          {maintNotifications.length === 0 ? (
            <div className="ses-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              👍 No active room maintenance repairs in progress right now.
            </div>
          ) : (
            maintNotifications.map((task) => (
              <div
                key={task.id}
                className="mobile-ticket-card"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-amber)" }}>
                      Room #{task.room?.room_number || task.room_id}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-secondary)", fontWeight: 700 }}>
                      {task.category}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--status-amber-bg)", color: "var(--status-amber)", fontWeight: 700 }}>
                      🔔 Under Maintenance Repair
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {task.description}
                  </p>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", gap: 12 }}>
                    <span>Assigned: {task.assigned_to?.full_name || "Maintenance Technician"}</span>
                    <span>Status: {task.status}</span>
                    <span>Created: {task.created_at ? new Date(task.created_at).toLocaleTimeString() : "Recently"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* INSPECTION CHECKLIST MODAL */}
      {inspectingRoom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div className="ses-card" style={{ maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)" }}>
                Inspection: Room #{inspectingRoom.room_number}
              </h3>
              <button onClick={() => setInspectingRoom(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {[
                { key: "bedding" as const, label: "🛏️ Fresh Linen & Bedding Checked" },
                { key: "bathroom" as const, label: "🚿 Bathroom Sanitized & Towels Restocked" },
                { key: "minibar" as const, label: "🍫 Minibar & Amenities Full" },
                { key: "electronics" as const, label: "💡 A/C, Lights & TV Operational" },
              ].map((item) => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Escalate Fault to Maintenance */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--status-rose)", fontWeight: 700, marginBottom: 4 }}>
                ⚠️ Found a Broken Item? (Escalate to Maintenance)
              </label>
              <input
                type="text"
                placeholder="e.g. Broken hair dryer, cracked tile, A/C leak..."
                value={brokenItemNote}
                onChange={(e) => setBrokenItemNote(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12, boxSizing: "border-box", marginBottom: 8 }}
              />
              <button
                disabled={isPending || !brokenItemNote.trim()}
                onClick={() => handleEscalateMaintenance(inspectingRoom.id)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "none",
                  background: brokenItemNote.trim() ? "var(--status-rose)" : "var(--surface-3)",
                  color: brokenItemNote.trim() ? "#fff" : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: brokenItemNote.trim() ? "pointer" : "not-allowed",
                }}
              >
                🚨 Log Maintenance Repair Ticket for Room #{inspectingRoom.room_number}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => {
                  alert(`Room ${inspectingRoom.room_number} inspection completed!`);
                  setInspectingRoom(null);
                }}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", background: "var(--status-emerald)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                Pass Inspection (Clean)
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}

