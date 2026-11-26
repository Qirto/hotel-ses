import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";

/** Tickets with the relations every ticket list shows (room number, reporter, assignee). */
const TICKET_SELECT =
  "*, room:rooms(room_number), resident:residents(first_name, last_name), created_by:staff!created_by_staff_id(full_name, role), assigned_to:staff!assigned_staff_id(full_name, role)";

type Result<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Runs one query; a failure is logged and yields null, so one table never takes the page down. */
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
 * parallel. `isLiveSupabase` is false when rooms could not be loaded (the
 * portal then skips realtime).
 */
export async function loadHotelData({ departments = false, staff = false }: { departments?: boolean; staff?: boolean } = {}) {
  const supabase = createClient(await cookies());

  const [rooms, tickets, departmentRows, staffRows] = await Promise.all([
    rows<HotelRoom>("rooms", supabase.from("rooms").select("*").order("room_number", { ascending: true })),
    rows<Reclamation>("tickets", supabase.from("reclamations").select(TICKET_SELECT).order("id", { ascending: true }) as unknown as Result<Reclamation>),
    departments ? rows<Department>("departments", supabase.from("departments").select("*").order("id", { ascending: true })) : null,
    staff ? rows<Staff>("staff", supabase.from("staff").select("*").order("id", { ascending: true })) : null,
  ]);

  return {
    rooms: rooms ?? [],
    isLiveSupabase: Boolean(rooms?.length),
    reclamationsList: tickets ?? [],
    departmentsList: departmentRows ?? [],
    staffList: staffRows ?? [],
  };
}
