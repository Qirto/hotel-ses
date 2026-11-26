/**
 * Demo data for the sales environment: staff, guests, room states and ~90 days of tickets.
 *
 *   node scripts/seed_demo_data.mjs           add demo data (keeps existing rows)
 *   node scripts/seed_demo_data.mjs --reset   first delete ALL tickets, residents and staff
 *
 * Deterministic (fixed random seed). Times are generated in hotel time (Africa/Tunis,
 * UTC+1, no DST) and stored as UTC. Writes with the secret key (SUPABASE_SECRET_KEY in
 * .env.local): the access rules refuse writes without a signed-in role.
 */
import { adminClient } from "./accounts_lib.mjs";
import { ensureRosterBucket, startingWeek, writeWeek } from "./roster_storage.mjs";
import { FIRST_NAMES, LAST_NAMES } from "./tunisian_names_data.mjs";

/* ───────────── setup ───────────── */

const supabase = adminClient();
const env = process.env;
const RESET = process.argv.includes("--reset");

// mulberry32: small, fast, deterministic PRNG
let seed = 20261126;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
/** Picks from [value, weight] pairs. */
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((a, [, w]) => a + w, 0);
  for (const [value, w] of pairs) if ((r -= w) <= 0) return value;
  return pairs[pairs.length - 1][0];
};

const HOTEL_OFFSET_MS = 60 * 60_000; // Africa/Tunis is UTC+1 all year
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const now = Date.now();
/** An instant `daysAgo` days back at a given hotel wall-clock hour/minute. */
const hotelTime = (daysAgo, hour, minute) => {
  const hotelNow = new Date(now + HOTEL_OFFSET_MS);
  const day = Date.UTC(hotelNow.getUTCFullYear(), hotelNow.getUTCMonth(), hotelNow.getUTCDate() - daysAgo, hour, minute);
  return day - HOTEL_OFFSET_MS;
};
const iso = (t) => new Date(t).toISOString();

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/* ───────────── people ───────────── */

const FIRST = FIRST_NAMES;
const LAST = LAST_NAMES;
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;
const phone = () => `+216 ${between(20, 99)} ${between(100, 999)} ${between(100, 999)}`;

/** [department, role, how many, skills] */
const TEAM = [
  ["MANAGEMENT", "manager", 2, ["operations", "guest relations"]],
  ["RECEPTION", "receptionist", 5, ["check-in", "languages", "billing"]],
  ["HOUSEKEEPING", "governance", 2, ["inspection", "scheduling"]],
  ["HOUSEKEEPING", "housekeeper", 8, ["rooms", "linen", "minibar"]],
  ["TECHNICAL", "maintenance", 5, ["HVAC", "plumbing", "electrical"]],
  ["FOOD_AND_BEVERAGE", "chef", 1, ["kitchen"]],
  ["FOOD_AND_BEVERAGE", "waiter", 3, ["room service", "breakfast"]],
  ["FOOD_AND_BEVERAGE", "bartender", 1, ["bar"]],
  ["CONCIERGE", "concierge", 2, ["transport", "excursions"]],
  ["CONCIERGE", "bellboy", 2, ["luggage"]],
  ["SECURITY", "security_officer", 3, ["access control", "first aid"]],
  ["SPA_AND_WELLNESS", "spa_therapist", 2, ["massage", "thalasso"]],
];

/* ───────────── tickets ───────────── */

/** Categories match the app's issue presets (lib/constants), with realistic details. */
const ISSUES = {
  TECHNICAL: [
    ["A/C", ["La climatisation souffle de l’air chaud", "Climatiseur très bruyant la nuit", "Le thermostat ne répond pas"]],
    ["Plumbing", ["Évacuation de la douche bouchée", "Fuite sous le lavabo", "Pas d’eau chaude dans la salle de bains"]],
    ["Electrical", ["Lampe de chevet en panne", "Prise du bureau hors service", "L’éclairage de la salle de bains clignote"]],
    ["TV/Audio", ["Pas de signal sur la TV", "Télécommande en panne", "Chaînes internationales manquantes"]],
    ["Lock", ["La serrure de la porte accroche", "Lecteur de carte-clé lent à ouvrir", "La porte du balcon ne ferme pas à clé"]],
  ],
  HOUSEKEEPING: [
    ["Towels", ["Serviettes de bain supplémentaires demandées", "Serviettes de piscine demandées", "Serviettes propres après le spa"]],
    ["Bedding", ["Oreiller supplémentaire demandé", "Couverture supplémentaire pour un enfant", "Draps à changer"]],
    ["Toiletries", ["Réassort shampooing et savon", "Kit brosse à dents demandé", "Plus d’après-shampooing"]],
    ["Cleaning", ["Café renversé sur la moquette", "Balcon à nettoyer", "Sable dans la chambre au retour de la plage"]],
    ["Minibar", ["Réassort du minibar", "Le minibar ne refroidit pas", "Bouteilles d’eau demandées"]],
  ],
  // Restauration: complaints only (no orders)
  FOOD_AND_BEVERAGE: [
    ["Room Service", ["Dîner livré avec 45 minutes de retard", "Erreur dans la commande livrée", "Plat manquant dans la commande room service"]],
    ["Breakfast", ["Petit-déjeuner en chambre arrivé froid", "Petit-déjeuner sans gluten oublié", "Plateau du petit-déjeuner incomplet"]],
    ["Drinks", ["Attente de plus de 20 minutes au bar de la piscine", "Cocktail servi différent de la commande"]],
    ["Food Quality", ["Poisson trop cuit au restaurant", "Plat servi tiède"]],
    ["Billing", ["Consommation du bar facturée deux fois", "Dîner facturé sur la mauvaise chambre"]],
  ],
  CONCIERGE: [
    ["Luggage", ["Prise en charge des bagages au départ", "Bagages à garder jusqu’au soir"]],
    ["Transport", ["Transfert vers l’aéroport d’Enfidha", "Taxi pour la médina de Hammamet", "Navette pour le golf"]],
    ["Keycard", ["Carte-clé démagnétisée", "Deuxième carte-clé demandée"]],
  ],
  SECURITY: [
    ["General", ["Plainte pour bruit de la chambre voisine", "Téléphone perdu près de la piscine", "Client bloqué à l’extérieur sur le balcon"]],
    ["Urgent", ["Odeur de fumée dans le couloir", "Personne inconnue à la porte"]],
  ],
};
const DEPARTMENT_WEIGHTS = [["TECHNICAL", 38], ["HOUSEKEEPING", 32], ["FOOD_AND_BEVERAGE", 12], ["CONCIERGE", 10], ["SECURITY", 8]];
/** Who handles each department's tickets. */
const HANDLER_ROLES = {
  TECHNICAL: ["maintenance"],
  HOUSEKEEPING: ["housekeeper", "governance"],
  FOOD_AND_BEVERAGE: ["waiter", "chef", "bartender"],
  CONCIERGE: ["concierge", "bellboy"],
  SECURITY: ["security_officer"],
};
/** Busy hours in hotel time: mornings and evenings. */
const HOUR_WEIGHTS = Array.from({ length: 24 }, (_, h) => [h, h < 6 ? 1 : h < 8 ? 3 : h < 11 ? 9 : h < 17 ? 5 : h < 22 ? 8 : 3]);
/** Minutes to resolve, by priority. */
const FIX_MINUTES = { EMERGENCY: [8, 45], HIGH: [15, 120], STANDARD: [25, 360] };

/* ───────────── run ───────────── */

async function main() {
  console.log(`Insertion des données de démonstration dans ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).host}${RESET ? " (réinitialisation préalable)" : ""}`);

  if (RESET) {
    for (const table of ["reclamations", "residents", "staff"]) await must(`clear ${table}`, supabase.from(table).delete().gte("id", 0));
    console.log("Demandes, clients et personnel supprimés.");
  }

  /* staff */
  const staffRows = TEAM.flatMap(([department, role, count, skills]) =>
    Array.from({ length: count }, () => {
      const shift = weighted([["ON_SHIFT", 6], ["OFF_SHIFT", 3], ["ON_BREAK", 1]]);
      return {
        full_name: fullName(),
        role,
        department,
        phone_number: phone(),
        shift_status: shift,
        is_present: shift !== "OFF_SHIFT",
        skill_tags: skills,
        last_clock_in: shift === "OFF_SHIFT" ? null : iso(hotelTime(0, between(6, 9), between(0, 59))),
      };
    })
  );
  const staff = await must("insert staff", supabase.from("staff").insert(staffRows).select("id, role, department"));
  console.log(`Personnel : ${staff.length}`);

  /* weekly roster: the starting pattern, saved in Storage (scripts/roster_storage.mjs) */
  await ensureRosterBucket(supabase);
  for (const [index, s] of staff.entries()) await writeWeek(supabase, s.id, startingWeek(index, s.role));
  console.log(`Planning : ${staff.length} semaines`);
  const byRole = (roles) => staff.filter((s) => roles.includes(s.role));
  const receptionists = byRole(["receptionist"]);

  /* rooms: ~72% occupancy, realistic cleaning states */
  const rooms = await must("read rooms", supabase.from("rooms").select("id, room_number").order("room_number"));
  const groups = new Map();
  const occupied = [];
  for (const room of rooms) {
    const isOccupied = rand() < 0.72;
    const cleaning = isOccupied
      ? weighted([["CLEAN", 80], ["DIRTY", 12], ["CLEANING", 6], ["INSPECTING", 2]])
      : weighted([["CLEAN", 82], ["DIRTY", 9], ["CLEANING", 5], ["INSPECTING", 4]]);
    const adults = isOccupied ? weighted([[1, 2], [2, 7], [3, 1]]) : 0;
    const children = isOccupied ? weighted([[0, 7], [1, 2], [2, 1]]) : 0;
    const key = `${isOccupied}|${cleaning}|${adults}|${children}`;
    if (!groups.has(key)) groups.set(key, { patch: { is_occupied: isOccupied, cleaning_status: cleaning, adult_count: adults, child_count: children }, ids: [] });
    groups.get(key).ids.push(room.id);
    if (isOccupied) occupied.push({ ...room, adults });
  }
  for (const { patch, ids } of groups.values()) await must("update rooms", supabase.from("rooms").update(patch).in("id", ids));
  console.log(`Chambres : ${occupied.length} occupées sur ${rooms.length}`);

  /* guests in occupied rooms */
  const residentRows = occupied.flatMap((room) =>
    Array.from({ length: room.adults }, () => {
      const nights = between(3, 10);
      const arrived = between(0, nights - 1);
      return {
        room_id: room.id,
        first_name: pick(FIRST),
        last_name: pick(LAST),
        phone_number: rand() < 0.7 ? phone() : null,
        check_in_date: iso(hotelTime(arrived, between(13, 20), between(0, 59))),
        check_out_date: iso(hotelTime(arrived - nights, 11, 0)),
        status: "ACTIVE",
      };
    })
  );
  const residents = [];
  for (let i = 0; i < residentRows.length; i += 200) {
    residents.push(...(await must("insert residents", supabase.from("residents").insert(residentRows.slice(i, i + 200)).select("id, room_id"))));
  }
  console.log(`Clients : ${residents.length}`);
  const residentByRoom = new Map(residents.map((r) => [r.room_id, r.id]));

  /* tickets: 90 days, a few rooms with repeat problems, some open right now */
  const problemRooms = Array.from({ length: 8 }, () => pick(rooms));
  const ticket = (daysAgo, { forceOpen = false } = {}) => {
    const department = weighted(DEPARTMENT_WEIGHTS);
    const [category, details] = pick(ISSUES[department]);
    const priority = department === "SECURITY" && category === "Urgent" ? "EMERGENCY" : weighted([["STANDARD", 70], ["HIGH", 22], ["EMERGENCY", 8]]);
    const room = rand() < 0.18 ? pick(problemRooms) : pick(rooms);
    const created = hotelTime(daysAgo, weighted(HOUR_WEIGHTS), between(0, 59));
    const handlers = byRole(HANDLER_ROLES[department]);
    const assignee = handlers.length && rand() < 0.9 ? pick(handlers) : null;

    let status = "RESOLVED";
    if (forceOpen) status = weighted([["OPEN", 5], ["ACKNOWLEDGED", 2], ["IN_PROGRESS", 3]]);
    const [lo, hi] = FIX_MINUTES[priority];
    const acknowledged = status === "OPEN" ? null : created + between(2, 15) * MINUTE;
    const resolved = status === "RESOLVED" ? Math.min(created + between(lo, hi) * MINUTE, now - MINUTE) : null;

    return {
      room_id: room.id,
      resident_id: daysAgo <= 3 ? residentByRoom.get(room.id) ?? null : null,
      created_by_staff_id: receptionists.length ? pick(receptionists).id : null,
      assigned_staff_id: assignee?.id ?? null,
      department,
      category,
      description: pick(details),
      priority,
      status,
      created_at: iso(created),
      acknowledged_at: acknowledged ? iso(acknowledged) : null,
      resolved_at: resolved ? iso(resolved) : null,
      is_confidential: false,
      sla_deadline: iso(created + 30 * MINUTE),
    };
  };

  const ticketRows = [];
  for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
    const perDay = daysAgo <= 14 ? between(3, 5) : between(1, 4);
    for (let i = 0; i < perDay; i++) ticketRows.push(ticket(daysAgo));
  }
  // today: a resolved few plus the current open workload, some urgent
  for (let i = 0; i < 5; i++) ticketRows.push(ticket(0));
  for (let i = 0; i < 11; i++) ticketRows.push(ticket(0, { forceOpen: true }));
  // keep "today" tickets in the past
  for (const t of ticketRows) {
    const created = Date.parse(t.created_at);
    if (created > now - 5 * MINUTE) {
      const shift = created - (now - between(20, 240) * MINUTE);
      for (const k of ["created_at", "acknowledged_at", "resolved_at", "sla_deadline"]) if (t[k]) t[k] = iso(Date.parse(t[k]) - shift);
      if (t.resolved_at && Date.parse(t.resolved_at) > now) t.resolved_at = iso(now - MINUTE);
    }
  }
  for (let i = 0; i < ticketRows.length; i += 200) await must("insert tickets", supabase.from("reclamations").insert(ticketRows.slice(i, i + 200)));
  const open = ticketRows.filter((t) => t.status !== "RESOLVED");
  console.log(`Demandes : ${ticketRows.length} (${open.length} ouvertes, ${open.filter((t) => t.priority !== "STANDARD").length} urgentes)`);
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
