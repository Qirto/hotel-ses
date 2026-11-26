/**
 * The hotel's rooms: the one source for every seed script (seed_supabase_rooms.js,
 * generate_full_erd_sql.js). Taken from the hotel's floor plan.
 *
 * Per floor and block, two corridor sides: even numbers on the left, odd on the right.
 * Numbers ending in 13 do not exist. 3077 stands alone on Bloc B's odd side, floor 3.
 *
 *            Bloc A                        Bloc B
 *            left (even)   right (odd)     left (even)   right (odd)
 *   Floor 1  1002-1052     1001-1067       1070-1120     1071-1135
 *   Floor 2  2002-2052     2001-2067       2070-2120     2071-2135
 *   Floor 3  3002-3052     3001-3067       3070-3118     3091-3133 + 3077
 *
 * Totals: 117 + 117 + 106 = 340 rooms.
 */
const crypto = require("crypto");

/** [block, floor, first, last]: every second number from first to last. */
const RUNS = [
  ["BLOCK_A", 1, 1002, 1052], ["BLOCK_A", 1, 1001, 1067], ["BLOCK_B", 1, 1070, 1120], ["BLOCK_B", 1, 1071, 1135],
  ["BLOCK_A", 2, 2002, 2052], ["BLOCK_A", 2, 2001, 2067], ["BLOCK_B", 2, 2070, 2120], ["BLOCK_B", 2, 2071, 2135],
  ["BLOCK_A", 3, 3002, 3052], ["BLOCK_A", 3, 3001, 3067], ["BLOCK_B", 3, 3070, 3118], ["BLOCK_B", 3, 3091, 3133],
];

/** Rooms outside the runs above. */
const EXTRA = [["BLOCK_B", 3, 3077]];

/** Door QR code: deterministic, so regenerating never changes an existing room's code. */
const qrCode = (number, block) =>
  `QR-${number}-${crypto.createHash("sha256").update(`HOTEL_DOOR_${number}_${block}`).digest("hex").slice(0, 16)}`;

const room = (block, floor, n) => ({
  room_number: String(n),
  floor,
  block,
  is_occupied: false,
  cleaning_status: "CLEAN",
  qr_code_hash: qrCode(n, block),
});

/** Every room, in number order, as rows for the `rooms` table. */
function hotelRooms() {
  const rooms = [];
  for (const [block, floor, first, last] of RUNS)
    for (let n = first; n <= last; n += 2) if (n % 100 !== 13) rooms.push(room(block, floor, n));
  for (const [block, floor, n] of EXTRA) rooms.push(room(block, floor, n));
  return rooms.sort((a, b) => Number(a.room_number) - Number(b.room_number));
}

module.exports = { hotelRooms };
