"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HOTEL_NAME, isPortalRole, PORTALS, ROLE_COOKIE, type PortalRole } from "@/lib/portals";
import { hotelWallTimeToISO } from "@/lib/datetime";

// =====================================================================
// SHARED HELPERS (not exported: only exported async functions are server actions)
// =====================================================================

/** Supabase client bound to this request's cookies. */
async function db() {
  return createClient(await cookies());
}

/** Standard success result; `data` is the written row when the caller needs it. */
function ok<T = undefined>(data?: T) {
  return { success: true as const, data: data as T, error: undefined };
}

/** Logs a failed write and returns the standard failure result. */
function failed(what: string, error: { message: string }) {
  console.error(`Failed to ${what}:`, error);
  return { success: false as const, error: error.message };
}

type Db = Awaited<ReturnType<typeof db>>;

/** First staff member with `column = value` (present today unless `presentOnly` is false), or null. */
async function findStaffId(supabase: Db, column: "role" | "department", value: string, presentOnly = true): Promise<number | null> {
  let query = supabase.from("staff").select("id").eq(column, value);
  if (presentOnly) query = query.eq("is_present", true);
  const { data } = await query.limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Who to assign when nobody from the department is present (keyed by department code). */
const FALLBACK_ROLE: Record<string, string> = { TECHNICAL: "maintenance", HOUSEKEEPING: "governance" };

/** Portal pages are dynamic; this refreshes their client router cache after a write. */
function revalidatePortals() {
  for (const portal of Object.values(PORTALS)) revalidatePath(portal.path);
}

// =====================================================================
// AUTHENTICATION & ROLE ACCESS CONTROL ACTIONS
// =====================================================================

/** Department passcodes. Fallbacks match .env; to be replaced by per-staff sign-in. */
const PASSCODES: Record<PortalRole, string> = {
  reception: process.env.PASSCODE_RECEPTION || "1111",
  rh: process.env.PASSCODE_RH || "2222",
  gm: process.env.PASSCODE_GM || "3333",
};

const ROLE_COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" } as const;

/** Signs the browser into a portal: sets the role cookie and refreshes that portal. */
async function setRoleCookie(role: PortalRole) {
  (await cookies()).set(ROLE_COOKIE, role, ROLE_COOKIE_OPTIONS);
  revalidatePath(PORTALS[role].path);
}

/** Role for a passcode, or null. (Typing the role name is also accepted, as before.) */
function roleForPasscode(passcode: string): PortalRole | null {
  const code = passcode.trim();
  if (!code) return null;
  return (Object.keys(PASSCODES) as PortalRole[]).find((role) => code === PASSCODES[role] || code.toLowerCase() === role) ?? null;
}

export type SignInState = { error: string } | null;

/**
 * Login form action (`<form action>` via useActionState). Works before the page
 * hydrates: the browser POSTs the form and follows a 303 to the portal, so the
 * passcode never ends up in the URL.
 */
export async function signInWithForm(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!passcode.trim()) return { error: "Please enter your access passcode." };
  const role = roleForPasscode(passcode);
  if (!role) return { error: "Invalid access passcode. Please check your credentials." };
  await setRoleCookie(role);
  redirect(PORTALS[role].path);
}

export async function restorePersistedSession(role: PortalRole) {
  if (!isPortalRole(role)) return { success: false, error: "Invalid portal role." } as const;
  await setRoleCookie(role);
  return { success: true, redirectUrl: PORTALS[role].path, role } as const;
}

export async function logoutRole() {
  (await cookies()).delete(ROLE_COOKIE);
  revalidatePath("/login");
  return { success: true, redirectUrl: "/login" };
}

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

// =====================================================================
// GOUVERNANTE (HOUSEKEEPING) ACTIONS
// =====================================================================

export async function cycleRoomCleaning(
  roomId: number,
  nextStatus: "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"
) {
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
// GENERAL MANAGER ACTIONS
// =====================================================================

export async function resolveConfidentialGrievance(reclamationId: number, remedyNotes: string) {
  const supabase = await db();

  const { error } = await supabase
    .from("reclamations")
    .update({
      status: "RESOLVED",
      resolved_at: new Date().toISOString(),
      description: remedyNotes
        ? `[GM RESOLVED REMEDY]: ${remedyNotes}`
        : undefined,
    })
    .eq("id", reclamationId);

  if (error) {
    return failed("resolve confidential grievance", error);
  }

  revalidatePortals();
  return ok();
}

// =====================================================================
// HR (RH) ACTIONS
// =====================================================================

export async function updateStaffSkills(staffId: number, skillTags: string[]) {
  const supabase = await db();

  const { error } = await supabase
    .from("staff")
    .update({ skill_tags: skillTags })
    .eq("id", staffId);

  if (error) {
    return failed("update staff skills", error);
  }

  revalidatePortals();
  return ok();
}

export async function toggleStaffShift(staffId: number, currentShift: string) {
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

export async function markStaffAbsentAndRedistribute(staffId: number) {
  const supabase = await db();

  // 1. Mark staff as absent (OFF_SHIFT & not present)
  await supabase
    .from("staff")
    .update({ shift_status: "OFF_SHIFT", is_present: false })
    .eq("id", staffId);

  // 2. Find another on-shift staff member
  const { data: availableTech } = await supabase
    .from("staff")
    .select("id")
    .neq("id", staffId)
    .eq("is_present", true)
    .limit(1)
    .maybeSingle();

  if (availableTech) {
    // 3. Reassign open/in_progress tickets
    await supabase
      .from("reclamations")
      .update({ assigned_staff_id: availableTech.id })
      .eq("assigned_staff_id", staffId)
      .in("status", ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]);
  }

  revalidatePortals();
  return { success: true, reassignedTo: availableTech?.id || null };
}

export async function createStaffMember(data: {
  full_name: string;
  role: string;
  department: string;
  phone_number?: string;
  skill_tags?: string[];
  shift_status?: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
}) {
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
  const supabase = await db();

  // Clear references in reclamations before deleting
  await supabase
    .from("reclamations")
    .update({ assigned_staff_id: null })
    .eq("assigned_staff_id", staffId);

  await supabase
    .from("reclamations")
    .update({ created_by_staff_id: null })
    .eq("created_by_staff_id", staffId);

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

export async function createDepartment(data: {
  code: string;
  name: string;
  icon?: string;
  description?: string;
  head_of_department?: string;
}) {
  const supabase = await db();

  const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, "_");

  const { error } = await supabase.from("departments").insert([
    {
      code: cleanCode,
      name: data.name.trim(),
      icon: data.icon?.trim() || "building-2",
      description: data.description?.trim() || null,
      head_of_department: data.head_of_department?.trim() || null,
    },
  ]);

  if (error) {
    return failed("create department", error);
  }

  revalidatePortals();
  return ok();
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

export async function deleteDepartment(departmentId: number) {
  const supabase = await db();

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
  const supabase = await db();

  const { error } = await supabase
    .from("staff")
    .update({
      full_name: "Former Staff Member",
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

export async function exportStaffData(staffId: number) {
  const supabase = await db();

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .single();

  if (staffError || !staff) {
    return { success: false, error: staffError?.message || "Staff member not found" };
  }

  const { data: tickets } = await supabase
    .from("reclamations")
    .select("id, room_id, department, category, status, priority, created_at, resolved_at")
    .eq("assigned_staff_id", staffId);

  return {
    success: true,
    data: {
      profile: staff,
      assignedTickets: tickets || [],
      exportedAt: new Date().toISOString(),
      entity: HOTEL_NAME,
    },
  };
}

export async function purgeCheckedOutResidentData(residentId: number) {
  const supabase = await db();

  const { error } = await supabase
    .from("residents")
    .update({
      first_name: "Archived",
      last_name: "Guest",
      phone_number: null,
    })
    .eq("id", residentId)
    .eq("status", "CHECKED_OUT");

  if (error) {
    return failed("purge checked-out resident data", error);
  }

  revalidatePortals();
  return ok();
}


