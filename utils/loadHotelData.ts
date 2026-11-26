import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";

/** Tickets with the relations every ticket list shows (room number, reporter, assignee). */
const TICKET_SELECT =
  "*, room:rooms(room_number), resident:residents(first_name, last_name), created_by:staff!created_by_staff_id(full_name, role), assigned_to:staff!assigned_staff_id(full_name, role)";

type Result<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Runs one query; a failure is logged and yields null (reported together below). */
async function rows<T>(label: string, query: Result<T>): Promise<T[] | null> {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error(`Failed to load ${label}:`, err);
    return null;
  }
}

/**
 * Server-side data for a portal page. Rooms and tickets are always loaded;
 * departments and staff only when the portal shows them. All queries run in
 * parallel.
 *
 * If any requested dataset fails to load, this throws: the route's error page
 * then offers "Try again". A portal never renders from silently missing data
 * (an empty room grid or ticket list would look real). `isLiveSupabase` is false
 * only when the rooms table is genuinely empty (realtime is then skipped).
 */
export async function loadHotelData({ departments = false, staff = false }: { departments?: boolean; staff?: boolean } = {}) {
  const supabase = createClient(await cookies());

  const [rooms, tickets, departmentRows, staffRows] = await Promise.all([
    rows<HotelRoom>("rooms", supabase.from("rooms").select("*").order("room_number", { ascending: true })),
    rows<Reclamation>("tickets", supabase.from("reclamations").select(TICKET_SELECT).order("id", { ascending: true }) as unknown as Result<Reclamation>),
    departments ? rows<Department>("departments", supabase.from("departments").select("*").order("id", { ascending: true })) : null,
    staff ? rows<Staff>("staff", supabase.from("staff").select("*").order("id", { ascending: true })) : null,
  ]);

  const failed = [
    rooms === null && "rooms",
    tickets === null && "tickets",
    departments && departmentRows === null && "departments",
    staff && staffRows === null && "staff",
  ].filter(Boolean);
  if (failed.length) throw new Error(`Could not load ${failed.join(", ")} from the database.`);

  return {
    rooms: rooms ?? [],
    isLiveSupabase: Boolean(rooms?.length),
    reclamationsList: tickets ?? [],
    departmentsList: departmentRows ?? [],
    staffList: staffRows ?? [],
  };
}
