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
  role: "master" | "manager" | "receptionist" | "maintenance" | "governance";
  department: "RECEPTION" | "HOUSEKEEPING" | "TECHNICAL" | "MANAGEMENT";
  phone_number?: string;
  shift_status: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
  skill_tags: string[];
  is_present: boolean;
  last_clock_in?: string;
  last_seen_at?: string;
  created_at?: string;
}

export interface Reclamation {
  id: number;
  room_id: number;
  resident_id?: number | null;
  created_by_staff_id?: number | null;
  assigned_staff_id?: number | null;
  department: "MAINTENANCE" | "GOVERNANCE";
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

