import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { HotelRoom, Staff, Resident, Reclamation, Department, INITIAL_ROOMS } from "@/utils/roomsData";

export async function loadHotelData() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch all rooms
  let rooms: HotelRoom[] = INITIAL_ROOMS;
  let isLiveSupabase = false;

  try {
    const { data: dbRooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true });

    if (!roomsError && dbRooms && dbRooms.length > 0) {
      rooms = dbRooms as HotelRoom[];
      isLiveSupabase = true;
    }
  } catch (err) {
    console.error("Failed to fetch rooms from Supabase:", err);
  }

  // Fetch departments
  let departmentsList: Department[] = [];
  try {
    const { data: dbDepts } = await supabase
      .from("departments")
      .select("*")
      .order("id", { ascending: true });
    if (dbDepts) departmentsList = dbDepts as Department[];
  } catch (err) {
    console.error("Failed to fetch departments from Supabase:", err);
  }

  // Fetch staff
  let staffList: Staff[] = [];
  try {
    const { data: dbStaff } = await supabase
      .from("staff")
      .select("*")
      .order("id", { ascending: true });
    if (dbStaff) staffList = dbStaff as Staff[];
  } catch (err) {
    console.error("Failed to fetch staff from Supabase:", err);
  }

  // Fetch residents
  let residentsList: Resident[] = [];
  try {
    const { data: dbResidents } = await supabase
      .from("residents")
      .select("*")
      .order("id", { ascending: true });
    if (dbResidents) residentsList = dbResidents as Resident[];
  } catch (err) {
    console.error("Failed to fetch residents from Supabase:", err);
  }

  // Fetch reclamations
  let reclamationsList: Reclamation[] = [];
  try {
    const { data: dbReclamations } = await supabase
      .from("reclamations")
      .select("*, room:rooms(room_number), resident:residents(first_name, last_name), created_by:staff!created_by_staff_id(full_name, role), assigned_to:staff!assigned_staff_id(full_name, role)")
      .order("id", { ascending: true });
    if (dbReclamations) reclamationsList = dbReclamations as unknown as Reclamation[];
  } catch (err) {
    console.error("Failed to fetch reclamations from Supabase:", err);
  }

  // Get logged-in role
  const userRole = cookieStore.get("hotel_role")?.value || null;

  return {
    rooms,
    isLiveSupabase,
    departmentsList,
    staffList,
    residentsList,
    reclamationsList,
    userRole,
  };
}
