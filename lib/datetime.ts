/**
 * Dates and times, always in hotel time (shared by server and client).
 *
 * Every date is shown as dd/MM/yyyy and every time as HH:mm (24 h) in the hotel's
 * zone, whatever zone the device or server runs in (Vercel runs in UTC).
 * Instants are stored as UTC ISO strings; forms work in hotel wall-clock values
 * ("YYYY-MM-DDTHH:mm") and convert with `hotelWallTimeToISO` before saving.
 */

/** Hôtel Méditerranée, Hammamet: UTC+1 all year (Tunisia has no DST). */
export const HOTEL_TIME_ZONE = "Africa/Tunis";

export const DAY_MS = 864e5;
/** Two-digit zero padding (dates, times). */
export const pad2 = (n: number) => String(n).padStart(2, "0");

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: HOTEL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface WallTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The hotel's wall-clock reading of an instant. */
export function hotelParts(instant: Date | number | string): WallTime {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormat.formatToParts(new Date(instant))) if (type !== "literal") p[type] = Number(value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour === 24 ? 0 : p.hour, minute: p.minute };
}

/** dd/MM/yyyy */
export const formatWallDate = (w: Pick<WallTime, "year" | "month" | "day">) => `${pad2(w.day)}/${pad2(w.month)}/${w.year}`;
/** HH:mm */
export const formatWallTime = (w: Pick<WallTime, "hour" | "minute">) => `${pad2(w.hour)}:${pad2(w.minute)}`;

/** dd/MM/yyyy in hotel time. */
export const formatDate = (instant: Date | number | string) => formatWallDate(hotelParts(instant));
/** HH:mm in hotel time. */
export const formatTime = (instant: Date | number | string) => formatWallTime(hotelParts(instant));
/** dd/MM/yyyy HH:mm in hotel time. */
export const formatDateTime = (instant: Date | number | string) => {
  const w = hotelParts(instant);
  return `${formatWallDate(w)} ${formatWallTime(w)}`;
};

/** Days since the epoch of an instant's hotel calendar date (for "today", "yesterday", day diffs). */
export function hotelDayNumber(instant: Date | number | string): number {
  const w = hotelParts(instant);
  return Date.UTC(w.year, w.month - 1, w.day) / DAY_MS;
}

/** "YYYY-MM-DDTHH:mm" wall-clock value (forms) for an instant, in hotel time. */
export function toHotelDateTimeValue(instant: Date | number | string): string {
  const w = hotelParts(instant);
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}T${formatWallTime(w)}`;
}

/** Parses "YYYY-MM-DDTHH:mm" into its wall-clock fields, or null. */
export function parseWallTime(value: string): WallTime | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] } : null;
}

/**
 * A hotel wall-clock value ("YYYY-MM-DDTHH:mm", as entered in forms) as the real
 * instant, in UTC ISO. Strings that already carry a zone are parsed as they are.
 */
export function hotelWallTimeToISO(value: string): string {
  const w = parseWallTime(value);
  if (!w || /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value).toISOString();
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  // offset of the hotel zone at that moment (computed, so a future DST rule still works)
  const offsetAt = (t: number) => {
    const p = hotelParts(t);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t;
  };
  let instant = asUtc - offsetAt(asUtc);
  instant = asUtc - offsetAt(instant);
  return new Date(instant).toISOString();
}
