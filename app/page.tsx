import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { HotelRoom, Staff, Resident, Reclamation, INITIAL_ROOMS } from "@/utils/roomsData";
import HotelDashboard from "@/app/components/HotelDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch all rooms directly from Supabase
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

  return (
    <main style={{ minHeight: "100vh", background: "#0b0f17" }}>
      <HotelDashboard
        initialRooms={rooms}
        isLiveSupabase={isLiveSupabase}
        staffList={staffList}
        residentsList={residentsList}
        reclamationsList={reclamationsList}
      />
    </main>
  );
}
