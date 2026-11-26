"use server";

import { hotelWallTimeToISO } from "@/lib/datetime";
import { db, failed, ok, revalidatePortals, type Db } from "@/lib/server/actions-kit";
import { deny } from "@/lib/server/session";

/**
 * Hotel operations. Every action starts with `deny([...roles])`: the caller's role
 * comes from the verified session, the admin is allowed everywhere, and the database
 * rules (supabase/migrations_accounts.sql) enforce the same split again.
 * Sign-in lives in app/auth-actions.ts, account and room inventory in app/admin/actions.ts.
 */

// =====================================================================
// SHARED HELPERS (not exported: only exported async functions are server actions)
// =====================================================================

/** First staff member with `column = value` (present today unless `presentOnly` is false), or null. */
async function findStaffId(supabase: Db, column: "role" | "department", value: string, presentOnly = true): Promise<number | null> {
  let query = supabase.from("staff").select("id").eq(column, value);
  if (presentOnly) query = query.eq("is_present", true);
  const { data } = await query.limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Who to assign when nobody from the department is present (keyed by department code). */
const FALLBACK_ROLE: Record<string, string> = { TECHNICAL: "maintenance", HOUSEKEEPING: "governance" };

// =====================================================================
// RECEPTION ACTIONS
// =====================================================================

export async function createRapidReclamation(data: {
  roomId: number;
  department: string;
  category: string;
  description: string;
  isConfidential?: boolean;
  priority?: "EMERGENCY" | "HIGH" | "STANDARD";
  residentId?: number | null;
}) {
  const denied = await deny(["reception", "rh", "gm"]);
  if (denied) return denied;
  const supabase = await db();
  // tickets keep the department code the form sends (the same codes as departments and staff)
  const targetDepartment = data.department;

  // Smart dispatch: the reporter (a receptionist) and the first present member of the
  // target department, looked up in parallel; failing that, a present member with the
  // department's fallback role.
  const [reporterId, departmentStaffId] = await Promise.all([
    findStaffId(supabase, "role", "receptionist", false),
    findStaffId(supabase, "department", targetDepartment),
  ]);
  const fallbackRole = FALLBACK_ROLE[targetDepartment];
  const assignedStaffId = departmentStaffId ?? (fallbackRole ? await findStaffId(supabase, "role", fallbackRole) : null);

  const { data: inserted, error } = await supabase.from("reclamations").insert([
    {
      room_id: data.roomId,
      resident_id: data.residentId || null,
      created_by_staff_id: reporterId,
      assigned_staff_id: assignedStaffId,
      department: targetDepartment,
      category: data.category,
      description: data.description,
      priority: data.priority || "STANDARD",
      status: "OPEN",
      is_confidential: Boolean(data.isConfidential),
      sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  ]).select().single();

  if (error) {
    return failed("create rapid reclamation", error);
  }

  revalidatePortals();
  return ok(inserted);
}

/**
 * Requirement: Reception can manually add old/historical reclamations to each room.
 */
export async function createHistoricalReclamation(data: {
  roomId: number;
  department: string;
  category: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string | null;
  isConfidential?: boolean;
}) {
  const denied = await deny(["reception", "rh", "gm"]);
  if (denied) return denied;
  const supabase = await db();

  // form values are hotel wall-clock times ("YYYY-MM-DDTHH:mm"); the server runs in UTC
  const createdAt = data.createdAt ? hotelWallTimeToISO(data.createdAt) : new Date().toISOString();
  const newRecord = {
    room_id: data.roomId,
    department: data.department,
    category: data.category,
    description: data.description,
    status: data.status,
    created_at: createdAt,
    resolved_at: data.resolvedAt ? hotelWallTimeToISO(data.resolvedAt) : data.status === "RESOLVED" ? createdAt : null,
    is_confidential: Boolean(data.isConfidential),
  };

  const { data: inserted, error } = await supabase.from("reclamations").insert([newRecord]).select().single();

  if (error) {
    return failed("create historical reclamation", error);
  }

  revalidatePortals();
  return ok(inserted || newRecord);
}

export async function updateRoomStayState(
  roomId: number,
  stayState: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED"
) {
  const denied = await deny(["reception"]);
  if (denied) return denied;
  const supabase = await db();

  let updateData: { is_occupied: boolean; cleaning_status?: "DIRTY" | "CLEAN" } = {
    is_occupied: false,
  };

  if (stayState === "OCCUPIED") {
    updateData = { is_occupied: true };
  } else if (stayState === "VACANT_DIRTY") {
    // When guest checks out, room becomes vacant and marked DIRTY for housekeeping
    updateData = { is_occupied: false, cleaning_status: "DIRTY" };
  } else if (stayState === "RESERVED") {
    updateData = { is_occupied: false };
  }

  const { error } = await supabase.from("rooms").update(updateData).eq("id", roomId);

  if (error) {
    return failed("update stay state", error);
  }

  revalidatePortals();
  return ok();
}

// =====================================================================
// MAINTENANCE ACTIONS
// =====================================================================

export async function acknowledgeReclamation(reclamationId: number, staffId?: number) {
  const denied = await deny(["reception", "rh", "gm"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase
    .from("reclamations")
    .update({
      status: "IN_PROGRESS",
      acknowledged_at: new Date().toISOString(),
      assigned_staff_id: staffId || undefined,
    })
    .eq("id", reclamationId);

  if (error) {
    return failed("acknowledge reclamation", error);
  }

  revalidatePortals();
  return ok();
}

/** Marks a ticket resolved. The guest's original description is kept as it is. */
export async function resolveReclamation(reclamationId: number) {
  const denied = await deny(["reception", "rh", "gm"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase
    .from("reclamations")
    .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
    .eq("id", reclamationId);

  if (error) {
    return failed("resolve reclamation", error);
  }

  revalidatePortals();
  return ok();
}

const PRIORITIES = ["STANDARD", "HIGH", "EMERGENCY"] as const;

/** Edits a request's subject, priority, details and assignee. Status changes stay with
 *  acknowledge / resolve, so the timeline (acknowledged_at, resolved_at) stays right. */
export async function updateReclamation(
  reclamationId: number,
  data: { department: string; category: string; priority: string; description: string; assignedStaffId: number | null }
) {
  const denied = await deny(["reception", "gm"]);
  if (denied) return denied;
  if (!data.department.trim() || !data.category.trim()) return { success: false as const, error: "Service et problème sont obligatoires." };
  if (!(PRIORITIES as readonly string[]).includes(data.priority)) return { success: false as const, error: "Priorité non valide." };
  const supabase = await db();

  const { error } = await supabase
    .from("reclamations")
    .update({
      department: data.department,
      category: data.category,
      priority: data.priority,
      description: data.description.trim(),
      assigned_staff_id: data.assignedStaffId,
    })
    .eq("id", reclamationId);
  if (error) return failed("update reclamation", error);

  revalidatePortals();
  return ok();
}

/** Deletes a request for good (entered by mistake, duplicate). */
export async function deleteReclamation(reclamationId: number) {
  const denied = await deny(["reception", "gm"]);
  if (denied) return denied;
  const supabase = await db();
  const { error } = await supabase.from("reclamations").delete().eq("id", reclamationId);
  if (error) return failed("delete reclamation", error);

  revalidatePortals();
  return ok();
}

// =====================================================================
// GOUVERNANTE (HOUSEKEEPING) ACTIONS
// =====================================================================

export async function cycleRoomCleaning(
  roomId: number,
  nextStatus: "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"
) {
  const denied = await deny(["reception", "rh", "gm"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase
    .from("rooms")
    .update({ cleaning_status: nextStatus })
    .eq("id", roomId);

  if (error) {
    return failed("update cleaning status", error);
  }

  revalidatePortals();
  return ok();
}

export async function updateRoomHeadcount(roomId: number, adultCount: number, childCount: number) {
  const denied = await deny(["reception"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase
    .from("rooms")
    .update({
      adult_count: Math.max(0, adultCount),
      child_count: Math.max(0, childCount),
    })
    .eq("id", roomId);

  if (error) {
    return failed("update guest headcount", error);
  }

  revalidatePortals();
  return ok();
}

// =====================================================================
// HR (RH) ACTIONS
// =====================================================================

export async function toggleStaffShift(staffId: number, currentShift: string) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const nextShift = currentShift === "ON_SHIFT" ? "OFF_SHIFT" : "ON_SHIFT";
  const isPresent = nextShift === "ON_SHIFT";

  const { error } = await supabase
    .from("staff")
    .update({
      shift_status: nextShift,
      is_present: isPresent,
      last_clock_in: isPresent ? new Date().toISOString() : undefined,
    })
    .eq("id", staffId);

  if (error) {
    return failed("toggle staff shift", error);
  }

  revalidatePortals();
  return ok();
}

const OPEN_TICKET_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"];
const SHIFT_STATUSES = ["ON_SHIFT", "OFF_SHIFT", "ON_BREAK"] as const;
type ShiftStatus = (typeof SHIFT_STATUSES)[number];

/**
 * Marks a staff member absent and hands their open requests to a present colleague of
 * the same department. Returns what changed, so the HR screen can offer an undo.
 * With nobody present in that department, the requests stay assigned and are counted.
 */
export async function markStaffAbsentAndRedistribute(staffId: number) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const { data: member, error: readError } = await supabase
    .from("staff")
    .select("department, shift_status, is_present")
    .eq("id", staffId)
    .single();
  if (readError || !member) return failed("read staff member", readError ?? { message: "Employé introuvable" });

  const { error: absentError } = await supabase.from("staff").update({ shift_status: "OFF_SHIFT", is_present: false }).eq("id", staffId);
  if (absentError) return failed("mark staff absent", absentError);

  const substituteId = await findStaffId(supabase, "department", member.department);
  let movedTicketIds: number[] = [];
  let unassignedCount = 0;
  if (substituteId) {
    const { data: moved, error: moveError } = await supabase
      .from("reclamations")
      .update({ assigned_staff_id: substituteId })
      .eq("assigned_staff_id", staffId)
      .in("status", OPEN_TICKET_STATUSES)
      .select("id");
    if (moveError) return failed("reassign open requests", moveError);
    movedTicketIds = (moved ?? []).map((t) => t.id as number);
  } else {
    const { count, error: countError } = await supabase
      .from("reclamations")
      .select("id", { count: "exact", head: true })
      .eq("assigned_staff_id", staffId)
      .in("status", OPEN_TICKET_STATUSES);
    if (countError) return failed("count open requests", countError);
    unassignedCount = count ?? 0;
  }

  revalidatePortals();
  return ok({
    previousShift: member.shift_status as ShiftStatus,
    previousPresent: Boolean(member.is_present),
    substituteId,
    movedTicketIds,
    unassignedCount,
  });
}

/**
 * Undo of markStaffAbsentAndRedistribute: restores the previous shift status and takes
 * back the moved requests that are still open and still with the substitute.
 */
export async function undoStaffAbsence(
  staffId: number,
  previous: { shift: string; present: boolean },
  substituteId: number | null,
  movedTicketIds: number[]
) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();
  const shift: ShiftStatus = (SHIFT_STATUSES as readonly string[]).includes(previous.shift) ? (previous.shift as ShiftStatus) : "OFF_SHIFT";

  const { error } = await supabase.from("staff").update({ shift_status: shift, is_present: previous.present }).eq("id", staffId);
  if (error) return failed("restore staff status", error);

  if (substituteId && movedTicketIds.length) {
    const { error: backError } = await supabase
      .from("reclamations")
      .update({ assigned_staff_id: staffId })
      .in("id", movedTicketIds)
      .eq("assigned_staff_id", substituteId)
      .in("status", OPEN_TICKET_STATUSES);
    if (backError) return failed("return reassigned requests", backError);
  }

  revalidatePortals();
  return ok();
}

export async function createStaffMember(data: {
  full_name: string;
  role: string;
  department: string;
  phone_number?: string;
  skill_tags?: string[];
  shift_status?: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
}) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase.from("staff").insert([
    {
      full_name: data.full_name,
      role: data.role,
      department: data.department,
      phone_number: data.phone_number || null,
      skill_tags: data.skill_tags || [],
      shift_status: data.shift_status || "ON_SHIFT",
      is_present: data.shift_status === "ON_SHIFT",
      last_clock_in: new Date().toISOString(),
    },
  ]);

  if (error) {
    return failed("create staff member", error);
  }

  revalidatePortals();
  return ok();
}

export async function updateStaffMember(
  staffId: number,
  data: {
    full_name?: string;
    role?: string;
    department?: string;
    phone_number?: string;
    skill_tags?: string[];
    shift_status?: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
  }
) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const updatePayload: Record<string, unknown> = {};
  if (data.full_name !== undefined) updatePayload.full_name = data.full_name;
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.department !== undefined) updatePayload.department = data.department;
  if (data.phone_number !== undefined) updatePayload.phone_number = data.phone_number;
  if (data.skill_tags !== undefined) updatePayload.skill_tags = data.skill_tags;
  if (data.shift_status !== undefined) {
    updatePayload.shift_status = data.shift_status;
    updatePayload.is_present = data.shift_status === "ON_SHIFT";
  }

  const { error } = await supabase
    .from("staff")
    .update(updatePayload)
    .eq("id", staffId);

  if (error) {
    return failed("update staff member", error);
  }

  revalidatePortals();
  return ok();
}

export async function deleteStaffMember(staffId: number) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  // Clear references in reclamations before deleting (requests keep their history)
  const { error: assignedError } = await supabase.from("reclamations").update({ assigned_staff_id: null }).eq("assigned_staff_id", staffId);
  if (assignedError) return failed("unassign staff requests", assignedError);
  const { error: createdError } = await supabase.from("reclamations").update({ created_by_staff_id: null }).eq("created_by_staff_id", staffId);
  if (createdError) return failed("clear staff request authorship", createdError);

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", staffId);

  if (error) {
    return failed("delete staff member", error);
  }

  revalidatePortals();
  return ok();
}

// =====================================================================
// DEPARTMENT CRUD ACTIONS
// =====================================================================

/** Stable department code from its name: « Spa & thalasso » -> "SPA_THALASSO". */
function departmentCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Creates a department. Its code (stored on staff and requests) comes from the name and never changes. */
export async function createDepartment(data: { name: string; description?: string; head_of_department?: string }) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const name = data.name.trim();
  const code = departmentCode(name);
  if (!code) return { success: false as const, error: "Le nom du service est obligatoire." };
  const supabase = await db();

  // Explicit check: does not rely on a unique constraint existing on departments.code.
  const { data: existing, error: existsError } = await supabase.from("departments").select("id").eq("code", code).maybeSingle();
  if (existsError) return failed("check department code", existsError);
  if (existing) return { success: false as const, error: "Un service portant ce nom existe déjà." };

  const { data: row, error } = await supabase
    .from("departments")
    .insert([
      {
        code,
        name,
        icon: "building-2",
        description: data.description?.trim() || null,
        head_of_department: data.head_of_department?.trim() || null,
      },
    ])
    .select("*")
    .single();

  // 23505 = unique violation: a department with this code already exists
  if (error?.code === "23505") return { success: false as const, error: "Un service portant ce nom existe déjà." };
  if (error) return failed("create department", error);

  revalidatePortals();
  return ok(row);
}

export async function updateDepartment(
  departmentId: number,
  data: {
    name?: string;
    icon?: string;
    description?: string;
    head_of_department?: string;
  }
) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.icon !== undefined) updatePayload.icon = data.icon.trim() || "building-2";
  if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
  if (data.head_of_department !== undefined) updatePayload.head_of_department = data.head_of_department.trim() || null;

  const { error } = await supabase
    .from("departments")
    .update(updatePayload)
    .eq("id", departmentId);

  if (error) {
    return failed("update department", error);
  }

  revalidatePortals();
  return ok();
}

/** Deletes a department, refused while employees are still attached to it. */
export async function deleteDepartment(departmentId: number) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const { data: dept, error: readError } = await supabase.from("departments").select("code").eq("id", departmentId).single();
  if (readError || !dept) return failed("read department", readError ?? { message: "Service introuvable" });
  const { count, error: countError } = await supabase.from("staff").select("id", { count: "exact", head: true }).eq("department", dept.code);
  if (countError) return failed("count department staff", countError);
  if (count)
    return {
      success: false as const,
      error: `${count} ${count < 2 ? "employé est rattaché" : "employés sont rattachés"} à ce service : réaffectez-${count < 2 ? "le" : "les"} d’abord.`,
    };

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId);

  if (error) {
    return failed("delete department", error);
  }

  revalidatePortals();
  return ok();
}

// =====================================================================
// DATA PRIVACY & COMPLIANCE ACTIONS (GDPR / RIGHT TO BE FORGOTTEN)
// =====================================================================

export async function anonymizeStaffRecord(staffId: number) {
  const denied = await deny(["rh"]);
  if (denied) return denied;
  const supabase = await db();

  const { error } = await supabase
    .from("staff")
    .update({
      full_name: "Ancien collaborateur",
      phone_number: null,
      skill_tags: [],
      shift_status: "OFF_SHIFT",
      is_present: false,
    })
    .eq("id", staffId);

  if (error) {
    return failed("anonymize staff record", error);
  }

  revalidatePortals();
  return ok();
}

