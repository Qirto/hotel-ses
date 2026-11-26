import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Department, HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import { loadRoster } from "@/lib/server/roster";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

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
 * Server-side data for a page: only what it shows. All queries run in parallel.
 *
 * If any requested dataset fails to load, this throws: the route's error page then
 * offers "Try again". A page never renders from silently missing data (an empty room
 * grid or ticket list would look real). `isLiveSupabase` is false only when rooms
 * were loaded and the table is genuinely empty (realtime is then skipped).
 */
export async function loadHotelData({
  rooms: withRooms = false,
  tickets: withTickets = false,
  departments = false,
  staff = false,
  roster = false,
}: { rooms?: boolean; tickets?: boolean; departments?: boolean; staff?: boolean; roster?: boolean }) {
  const supabase = createClient(await cookies());

  const [rooms, tickets, departmentRows, staffRows, rosterRows] = await Promise.all([
    withRooms ? rows<HotelRoom>("rooms", supabase.from("rooms").select("*").order("room_number", { ascending: true })) : null,
    withTickets ? rows<Reclamation>("tickets", supabase.from("reclamations").select(TICKET_SELECT).order("id", { ascending: true }) as unknown as Result<Reclamation>) : null,
    departments ? rows<Department>("departments", supabase.from("departments").select("*").order("id", { ascending: true })) : null,
    staff ? rows<Staff>("staff", supabase.from("staff").select("*").order("id", { ascending: true })) : null,
    roster ? loadRoster().catch((err): null => (console.error("Failed to load roster:", err), null)) : null,
  ]);

  const failed = [
    withRooms && rooms === null && "rooms",
    withTickets && tickets === null && "tickets",
    departments && departmentRows === null && "departments",
    staff && staffRows === null && "staff",
    roster && rosterRows === null && "roster",
  ].filter(Boolean);
  if (failed.length) throw new Error(`Could not load ${failed.join(", ")} from the database.`);

  return {
    rooms: rooms ?? [],
    isLiveSupabase: Boolean(rooms?.length),
    reclamationsList: tickets ?? [],
    departmentsList: departmentRows ?? [],
    staffList: staffRows ?? [],
    rosterEntries: rosterRows ?? [],
  };
}

/** One room (by number) and its requests, for the room detail. Null when no such room. */
export async function loadRoomDetail(number: string) {
  const supabase = createClient(await cookies());
  const { data: room, error } = await supabase.from("rooms").select("*").eq("room_number", number).maybeSingle();
  if (error) throw new Error(`Could not load room ${number}: ${error.message}`);
  if (!room) return null;
  const tickets = await rows<Reclamation>("room tickets", supabase.from("reclamations").select(TICKET_SELECT).eq("room_id", room.id).order("id", { ascending: true }) as unknown as Result<Reclamation>);
  if (tickets === null) throw new Error(`Could not load the requests of room ${number}.`);
  return { room: room as HotelRoom, tickets };
}

/** One request (with its relations), for the request detail. Null when no such request. */
export async function loadRequest(id: number) {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("reclamations").select(TICKET_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load request ${id}: ${error.message}`);
  return (data as Reclamation | null) ?? null;
}

/**
 * A request for its detail route, plus the staff its assignee list needs (only when the
 * role may edit it). Null for an id that isn't a positive integer or doesn't exist.
 */
export async function loadRequestDetail(role: Role, rawId: string) {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [ticket, data] = await Promise.all([loadRequest(id), loadHotelData({ staff: can(role, "requests.edit") })]);
  return ticket && { ticket, staff: data.staffList };
}
