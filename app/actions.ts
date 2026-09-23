"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// =====================================================================
// RECEPTION ACTIONS
// =====================================================================

export async function createRapidReclamation(data: {
  roomId: number;
  department: "MAINTENANCE" | "GOVERNANCE";
  category: string;
  description: string;
  isConfidential?: boolean;
  priority?: "EMERGENCY" | "HIGH" | "STANDARD";
  residentId?: number | null;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Auto-find receptionist ID
  const { data: staffMember } = await supabase
    .from("staff")
    .select("id")
    .eq("role", "receptionist")
    .limit(1)
    .single();

  // Smart dispatch: find an on-shift technician for maintenance or housekeeper for governance
  let assignedStaffId = null;
  if (data.department === "MAINTENANCE") {
    const { data: tech } = await supabase
      .from("staff")
      .select("id")
      .eq("role", "maintenance")
      .eq("is_present", true)
      .limit(1)
      .single();
    if (tech) assignedStaffId = tech.id;
  } else {
    const { data: gov } = await supabase
      .from("staff")
      .select("id")
      .eq("role", "governance")
      .eq("is_present", true)
      .limit(1)
      .single();
    if (gov) assignedStaffId = gov.id;
  }

  const { error } = await supabase.from("reclamations").insert([
    {
      room_id: data.roomId,
      resident_id: data.residentId || null,
      created_by_staff_id: staffMember?.id || null,
      assigned_staff_id: assignedStaffId,
      department: data.department,
      category: data.category,
      description: data.description,
      priority: data.priority || "STANDARD",
      status: "OPEN",
      is_confidential: Boolean(data.isConfidential),
      sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  ]);

  if (error) {
    console.error("Failed to create rapid reclamation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * Requirement: Reception can manually add old/historical reclamations to each room.
 */
export async function createHistoricalReclamation(data: {
  roomId: number;
  department: "MAINTENANCE" | "GOVERNANCE";
  category: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
  isConfidential?: boolean;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("reclamations").insert([
    {
      room_id: data.roomId,
      department: data.department,
      category: data.category,
      description: data.description,
      status: data.status,
      created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      resolved_at: data.resolvedAt ? new Date(data.resolvedAt).toISOString() : data.status === "RESOLVED" ? new Date().toISOString() : null,
      is_confidential: Boolean(data.isConfidential),
    },
  ]);

  if (error) {
    console.error("Failed to create historical reclamation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateRoomStayState(
  roomId: number,
  stayState: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED"
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to update stay state:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// =====================================================================
// MAINTENANCE ACTIONS
// =====================================================================

export async function acknowledgeReclamation(reclamationId: number, staffId?: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("reclamations")
    .update({
      status: "IN_PROGRESS",
      acknowledged_at: new Date().toISOString(),
      assigned_staff_id: staffId || undefined,
    })
    .eq("id", reclamationId);

  if (error) {
    console.error("Failed to acknowledge reclamation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function resolveReclamation(reclamationId: number, resolutionNotes?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("reclamations")
    .update({
      status: "RESOLVED",
      resolved_at: new Date().toISOString(),
      description: resolutionNotes
        ? `[RESOLVED]: ${resolutionNotes}`
        : undefined,
    })
    .eq("id", reclamationId);

  if (error) {
    console.error("Failed to resolve reclamation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// =====================================================================
// GOUVERNANTE (HOUSEKEEPING) ACTIONS
// =====================================================================

export async function cycleRoomCleaning(
  roomId: number,
  nextStatus: "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("rooms")
    .update({ cleaning_status: nextStatus })
    .eq("id", roomId);

  if (error) {
    console.error("Failed to update cleaning status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateRoomHeadcount(roomId: number, adultCount: number, childCount: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("rooms")
    .update({
      adult_count: Math.max(0, adultCount),
      child_count: Math.max(0, childCount),
    })
    .eq("id", roomId);

  if (error) {
    console.error("Failed to update guest headcount:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// =====================================================================
// GENERAL MANAGER ACTIONS
// =====================================================================

export async function resolveConfidentialGrievance(reclamationId: number, remedyNotes: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to resolve confidential grievance:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// =====================================================================
// HR (RH) ACTIONS
// =====================================================================

export async function updateStaffSkills(staffId: number, skillTags: string[]) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("staff")
    .update({ skill_tags: skillTags })
    .eq("id", staffId);

  if (error) {
    console.error("Failed to update staff skills:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleStaffShift(staffId: number, currentShift: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to toggle staff shift:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function markStaffAbsentAndRedistribute(staffId: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Mark staff as absent (OFF_SHIFT & not present)
  await supabase
    .from("staff")
    .update({ shift_status: "OFF_SHIFT", is_present: false })
    .eq("id", staffId);

  // 2. Find another on-shift technician
  const { data: availableTech } = await supabase
    .from("staff")
    .select("id")
    .neq("id", staffId)
    .eq("is_present", true)
    .limit(1)
    .single();

  if (availableTech) {
    // 3. Reassign open/in_progress tickets
    await supabase
      .from("reclamations")
      .update({ assigned_staff_id: availableTech.id })
      .eq("assigned_staff_id", staffId)
      .in("status", ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]);
  }

  revalidatePath("/");
  return { success: true, reassignedTo: availableTech?.id || null };
}

export async function createStaffMember(data: {
  full_name: string;
  role: "master" | "manager" | "receptionist" | "maintenance" | "governance";
  department: "RECEPTION" | "HOUSEKEEPING" | "TECHNICAL" | "MANAGEMENT";
  phone_number?: string;
  skill_tags?: string[];
  shift_status?: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to create staff member:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateStaffMember(
  staffId: number,
  data: {
    full_name?: string;
    role?: "master" | "manager" | "receptionist" | "maintenance" | "governance";
    department?: "RECEPTION" | "HOUSEKEEPING" | "TECHNICAL" | "MANAGEMENT";
    phone_number?: string;
    skill_tags?: string[];
    shift_status?: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to update staff member:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteStaffMember(staffId: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

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
    console.error("Failed to delete staff member:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

