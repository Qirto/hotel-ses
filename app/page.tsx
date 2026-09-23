import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { INITIAL_ROOMS, HotelRoom } from "@/utils/roomsData";
import HotelDashboard from "@/app/components/HotelDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  let rooms: HotelRoom[] = INITIAL_ROOMS;
  let isLiveSupabase = false;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true });

    if (!error && data && data.length > 0) {
      rooms = data as HotelRoom[];
      isLiveSupabase = true;
    }
  } catch (err) {
    console.warn("Supabase rooms fetch fallback to default configuration:", err);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0f17" }}>
      <HotelDashboard initialRooms={rooms} isLiveSupabase={isLiveSupabase} />
    </main>
  );
}
