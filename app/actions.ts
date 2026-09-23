"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateRoomCleaningStatus(roomId: number, cleaningStatus: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("rooms")
    .update({ cleaning_status: cleaningStatus })
    .eq("id", roomId);

  if (error) {
    console.error("Error updating cleaning status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleRoomOccupancy(roomId: number, currentOccupied: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("rooms")
    .update({ is_occupied: !currentOccupied })
    .eq("id", roomId);

  if (error) {
    console.error("Error toggling room occupancy:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
