import type { Reclamation, HotelRoom } from "./roomsData";
import { resolutionMs } from "@/lib/tickets";
import { formatWallDate, hotelParts, pad2 } from "@/lib/datetime";
import { isTicketForRoom } from "@/lib/rooms";

export interface RoomRushHour {
  hour: number; // 0-23
  hourRange: string; // e.g. "14:00 – 15:00"
  date: string; // e.g. "25/09/2026" (hotel calendar day)
  count: number;
  totalForHourOfDay: number; // Total reclamations across all days at this hour
}

export interface TopProblem {
  category: string;
  count: number;
  percentage: number;
}

export interface RoomAnalyticsSummary {
  roomId: number;
  roomNumber: string;
  totalTickets: number;
  resolvedTickets: number;
  openTickets: number;
  hasEmergency: boolean;
  hasHighPriority: boolean;
  rushHour: RoomRushHour | null;
  topProblems: TopProblem[];
  avgResolutionMinutes: number | null;
  lastReclamationDate: string | null;
}

/**
 * Formats a 24-hour integer into "HH:00 – HH:00"
 */
export function formatHourRange(hour: number): string {
  return `${pad2(hour)}:00 – ${pad2((hour + 1) % 24)}:00`;
}

/**
 * Computes analytics for a specific room given the full list of reclamations
 */
export function computeRoomAnalytics(
  room: HotelRoom,
  allReclamations: Reclamation[]
): RoomAnalyticsSummary {
  const roomReclamations = allReclamations.filter((r) => isTicketForRoom(r, room));

  const totalTickets = roomReclamations.length;
  let resolvedTickets = 0;
  let openTickets = 0;
  let hasEmergency = false;
  let hasHighPriority = false;
  let totalResolutionTimeMs = 0;
  let resolvedWithDurationCount = 0;
  let lastReclamationDate: string | null = null;

  // Track counts by specific day+hour bucket (e.g., "2026-09-25 14")
  const dayHourCounts = new Map<string, { date: string; hour: number; count: number }>();
  // Track counts by hour of day (0-23)
  const hourOfDayCounts = new Array<number>(24).fill(0);
  // Track categories
  const categoryCounts = new Map<string, number>();

  for (const rec of roomReclamations) {
    const isResolved = rec.status === "RESOLVED";
    if (isResolved) {
      resolvedTickets++;
      const ms = resolutionMs(rec);
      if (ms != null) {
        totalResolutionTimeMs += ms;
        resolvedWithDurationCount++;
      }
    } else {
      openTickets++;
      if (rec.priority === "EMERGENCY") hasEmergency = true;
      if (rec.priority === "HIGH") hasHighPriority = true;
    }

    // Category aggregation
    const cat = (rec.category || "General").trim();
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

    // Timestamps for rush hour
    if (rec.created_at) {
      const d = new Date(rec.created_at);
      if (!isNaN(d.getTime())) {
        // bucket by the hotel's calendar day and hour, not the device's
        const wall = hotelParts(d);
        const dateStr = formatWallDate(wall); // dd/MM/yyyy
        const hour = wall.hour;

        hourOfDayCounts[hour]++;

        const key = `${dateStr}_${hour}`;
        const existing = dayHourCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          dayHourCounts.set(key, { date: dateStr, hour, count: 1 });
        }

        if (!lastReclamationDate || new Date(rec.created_at) > new Date(lastReclamationDate)) {
          lastReclamationDate = rec.created_at;
        }
      }
    }
  }

  // Calculate Rush Hour:
  // Find the single date + hour slot with maximum incidents
  let rushHour: RoomRushHour | null = null;
  if (dayHourCounts.size > 0) {
    let maxSlot: { date: string; hour: number; count: number } | null = null;
    for (const slot of dayHourCounts.values()) {
      if (!maxSlot || slot.count > maxSlot.count) {
        maxSlot = slot;
      }
    }

    if (maxSlot) {
      rushHour = {
        hour: maxSlot.hour,
        hourRange: formatHourRange(maxSlot.hour),
        date: maxSlot.date,
        count: maxSlot.count,
        totalForHourOfDay: hourOfDayCounts[maxSlot.hour],
      };
    }
  }

  // Top problems: sort by count descending
  const topProblems: TopProblem[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const avgResolutionMinutes =
    resolvedWithDurationCount > 0
      ? Math.round(totalResolutionTimeMs / resolvedWithDurationCount / (1000 * 60))
      : null;

  return {
    roomId: room.id,
    roomNumber: room.room_number,
    totalTickets,
    resolvedTickets,
    openTickets,
    hasEmergency,
    hasHighPriority,
    rushHour,
    topProblems,
    avgResolutionMinutes,
    lastReclamationDate,
  };
}

/**
 * Computes analytics for all rooms
 */
export function computeAllRoomsAnalytics(
  rooms: HotelRoom[],
  reclamations: Reclamation[]
): Map<number, RoomAnalyticsSummary> {
  const map = new Map<number, RoomAnalyticsSummary>();
  for (const room of rooms) {
    map.set(room.id, computeRoomAnalytics(room, reclamations));
  }
  return map;
}
