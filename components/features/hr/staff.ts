import type { Staff } from "@/utils/roomsData";

export const STANDARD_ROLES = [
  "manager", "receptionist", "maintenance", "governance", "chef", "cook", "waiter", "bartender",
  "concierge", "security_officer", "spa_therapist", "housekeeper", "bellboy", "accountant", "hr_specialist", "master",
];

/** Display label per role code (codes unchanged). */
const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  receptionist: "Réceptionniste",
  maintenance: "Technicien de maintenance",
  governance: "Gouvernante",
  housekeeper: "Agent d’étage",
  chef: "Chef de cuisine",
  cook: "Cuisinier",
  waiter: "Serveur",
  bartender: "Barman",
  concierge: "Concierge",
  security_officer: "Agent de sécurité",
  spa_therapist: "Praticien spa",
  bellboy: "Bagagiste",
  accountant: "Comptable",
  hr_specialist: "Chargé RH",
  master: "Administrateur",
};

export function roleLabel(role: string) {
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  const s = role.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ROLE_OPTIONS = STANDARD_ROLES.map((r) => ({ value: r, label: roleLabel(r) }));

export const SHIFT_STATUS: Record<Staff["shift_status"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  ON_SHIFT: { label: "En service", tone: "success" },
  OFF_SHIFT: { label: "Hors service", tone: "neutral" },
  ON_BREAK: { label: "En pause", tone: "warning" },
};

export type NewStaffInput = { full_name: string; role: string; department: string; phone_number?: string };

/** A staff member's department code (records without one count as Reception). */
export const staffDepartment = (s: Pick<Staff, "department">) => s.department || "RECEPTION";

/** Staff on and off shift per department, largest department first. */
export function headcountByDepartment(staff: readonly Staff[], label: (code: string) => string) {
  const counts = new Map<string, { onShift: number; offShift: number }>();
  for (const s of staff) {
    const dept = staffDepartment(s);
    const c = counts.get(dept) ?? { onShift: 0, offShift: 0 };
    if (s.shift_status === "ON_SHIFT") c.onShift++;
    else c.offShift++;
    counts.set(dept, c);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].onShift + b[1].offShift - (a[1].onShift + a[1].offShift))
    .map(([dept, values]) => ({ label: label(dept), values }));
}
