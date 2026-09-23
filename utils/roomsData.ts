import crypto from "crypto";

export interface HotelRoom {
  id?: number;
  room_number: string;
  floor: 1 | 2 | 3;
  block: "BLOCK_A" | "BLOCK_B";
  is_occupied: boolean;
  cleaning_status: "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN";
  qr_code_hash: string;
  created_at?: string;
}

export interface Resident {
  id?: number;
  room_id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  check_in_date: string;
  check_out_date?: string;
  status: "ACTIVE" | "CHECKED_OUT";
  created_at?: string;
}

export interface Staff {
  id?: number;
  full_name: string;
  role: "master" | "manager" | "receptionist" | "maintenance" | "governance";
  department: "RECEPTION" | "HOUSEKEEPING" | "TECHNICAL" | "MANAGEMENT";
  phone_number?: string;
  shift_status: "ON_SHIFT" | "OFF_SHIFT" | "ON_BREAK";
  last_seen_at?: string;
  created_at?: string;
}

export interface Reclamation {
  id?: number;
  room_id: number;
  resident_id?: number | null;
  created_by_staff_id?: number | null;
  assigned_staff_id?: number | null;
  department: "MAINTENANCE" | "GOVERNANCE";
  category: string;
  description: string;
  priority: "EMERGENCY" | "HIGH" | "STANDARD";
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";
  created_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export function generateAllHotelRooms(): HotelRoom[] {
  const rooms: HotelRoom[] = [];

  // ====================================================
  // BLOCK A
  // ====================================================
  // Right side: odd numbers (1001-1067, 2001-2067, 3001-3067), skip ending in 13
  const blockARightFloors = [
    { floor: 1 as const, start: 1001, end: 1067 },
    { floor: 2 as const, start: 2001, end: 2067 },
    { floor: 3 as const, start: 3001, end: 3067 },
  ];

  for (const f of blockARightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: "BLOCK_A",
          is_occupied: false,
          cleaning_status: "CLEAN",
          qr_code_hash: `QR-${roomNum}-A-${n * 7}`,
        });
      }
    }
  }

  // Left side: even numbers (1002-1054, 2002-2054, 3002-3052), skip ending in 13
  const blockALeftFloors = [
    { floor: 1 as const, start: 1002, end: 1054 },
    { floor: 2 as const, start: 2002, end: 2054 },
    { floor: 3 as const, start: 3002, end: 3052 },
  ];

  for (const f of blockALeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: "BLOCK_A",
          is_occupied: false,
          cleaning_status: "CLEAN",
          qr_code_hash: `QR-${roomNum}-A-${n * 7}`,
        });
      }
    }
  }

  // ====================================================
  // BLOCK B
  // ====================================================
  // Left side: odd numbers (1071-1135, 2071-2135, 3091-3133), skip ending in 13
  const blockBLeftFloors = [
    { floor: 1 as const, start: 1071, end: 1135 },
    { floor: 2 as const, start: 2071, end: 2135 },
    { floor: 3 as const, start: 3091, end: 3133 },
  ];

  for (const f of blockBLeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: "BLOCK_B",
          is_occupied: false,
          cleaning_status: "CLEAN",
          qr_code_hash: `QR-${roomNum}-B-${n * 7}`,
        });
      }
    }
  }

  // Right side: even numbers (1070-1120, 2070-2120, 3070-3118), skip ending in 13
  const blockBRightFloors = [
    { floor: 1 as const, start: 1070, end: 1120 },
    { floor: 2 as const, start: 2070, end: 2120 },
    { floor: 3 as const, start: 3070, end: 3118 },
  ];

  for (const f of blockBRightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        const roomNum = n.toString();
        rooms.push({
          room_number: roomNum,
          floor: f.floor,
          block: "BLOCK_B",
          is_occupied: false,
          cleaning_status: "CLEAN",
          qr_code_hash: `QR-${roomNum}-B-${n * 7}`,
        });
      }
    }
  }

  return rooms;
}

export const INITIAL_ROOMS = generateAllHotelRooms();
