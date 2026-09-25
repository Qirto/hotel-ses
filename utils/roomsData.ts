export interface HotelRoom {
  id: number;
  room_number: string;
  floor: 1 | 2 | 3;
  block: "BLOCK_A" | "BLOCK_B";
  is_occupied: boolean;
  cleaning_status: "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN";
  qr_code_hash?: string;
  adult_count?: number;
  child_count?: number;
  created_at?: string;
}

export interface Resident {
  id: number;
  room_id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  check_in_date: string;
  check_out_date?: string;
  status: "ACTIVE" | "CHECKED_OUT";
  created_at?: string;
  room?: { room_number: string };
}

export interface Staff {
  id: number;
  full_name: string;
  role: string;
  department: string;
  phone_number?: string;
  shift_status: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
  skill_tags: string[];
  is_present: boolean;
  last_clock_in?: string;
  last_seen_at?: string;
  created_at?: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  icon: string;
  description?: string;
  head_of_department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Reclamation {
  id: number;
  room_id: number;
  resident_id?: number | null;
  created_by_staff_id?: number | null;
  assigned_staff_id?: number | null;
  department: string;
  category: string;
  description: string;
  priority: "EMERGENCY" | "HIGH" | "STANDARD";
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";
  is_confidential?: boolean;
  sla_deadline?: string;
  created_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  room?: { room_number: string };
  resident?: { first_name: string; last_name: string };
  created_by?: { full_name: string; role: string };
  assigned_to?: { full_name: string; role: string };
}

export const INITIAL_ROOMS: HotelRoom[] = [];

/**
 * Checks if a reclamation is a room fix/repair ticket (sent to Maintenance to fix, notifies Housekeeping Manager & GM).
 */
export function isMaintenanceFixTicket(r: { department: string; category: string }): boolean {
  const dept = (r.department || "").toUpperCase();
  const cat = (r.category || "").toLowerCase();

  // Explicit housekeeping categories overrides
  const hkCategories = ["towels", "bedding", "toiletries", "cleaning", "minibar", "missing", "dirty", "pillow", "blanket", "soap", "shampoo"];
  if (hkCategories.some((hk) => cat.includes(hk))) {
    return false;
  }

  if (dept === "MAINTENANCE" || dept === "TECHNICAL") {
    return true;
  }

  const maintCategories = ["a/c", "ac", "plumbing", "electrical", "tv/audio", "tv", "lock", "repair", "broken", "leak", "sink", "shower", "lighting", "safe"];
  return maintCategories.some((mc) => cat.includes(mc));
}

/**
 * Checks if a reclamation is about room missing something or not clean (sent to Housekeeping & GM, NOT sent to Maintenance).
 */
export function isHousekeepingMissingOrCleanTicket(r: { department: string; category: string }): boolean {
  const dept = (r.department || "").toUpperCase();
  const cat = (r.category || "").toLowerCase();

  if (dept === "HOUSEKEEPING" || dept === "GOVERNANCE") {
    return true;
  }

  const hkCategories = ["towels", "bedding", "toiletries", "cleaning", "minibar", "missing", "dirty", "pillow", "blanket", "soap", "shampoo", "floor clean", "restock"];
  return hkCategories.some((hk) => cat.includes(hk));
}


