import type { Department, Staff } from "@/utils/roomsData";

/** Built-in departments. Icons are rendered with `departmentIcon(code)`, never stored here. */
export const DEFAULT_HOTEL_DEPARTMENTS: Omit<Department, "icon">[] = [
  { id: 1, code: "RECEPTION", name: "Réception", description: "Arrivées et départs des clients, standard, demandes d’information et transmissions à la conciergerie", head_of_department: "Sophie Mercier" },
  { id: 2, code: "HOUSEKEEPING", name: "Gouvernance", description: "Nettoyage des chambres, gestion du linge, réassort des produits d’accueil et contrôle des étages", head_of_department: "Martine Aubry" },
  { id: 3, code: "TECHNICAL", name: "Service technique & maintenance", description: "Plomberie, électricité, climatisation et ventilation, équipements et maintenance préventive des installations", head_of_department: "Pierre Dubois" },
  { id: 4, code: "FOOD_AND_BEVERAGE", name: "Restauration (F&B)", description: "Cuisine, restaurants, banquets, room service et bars", head_of_department: "Chef Antoine Girard" },
  { id: 5, code: "MANAGEMENT", name: "Direction générale", description: "Supervision des opérations de l’hôtel, décisions de direction, relations VIP et stratégie", head_of_department: "Jean-Paul Bonnet" },
  { id: 6, code: "SECURITY", name: "Sécurité & sûreté", description: "Surveillance des locaux, contrôle d’accès, cartes-clés, sécurité des clients et procédures d’urgence", head_of_department: "Marc Lambert" },
  { id: 7, code: "CONCIERGE", name: "Conciergerie & relations clients", description: "Voiturier, gestion des bagages, excursions, transport et assistance aux clients VIP", head_of_department: "Lucie Moreau" },
  { id: 8, code: "SPA_AND_WELLNESS", name: "Spa, thalasso & fitness", description: "Massages, bains thermaux, sauna, salle de sport et soins bien-être", head_of_department: "Camille Roux" },
  { id: 9, code: "SALES_AND_MARKETING", name: "Commercial, marketing & événements", description: "Réservations de groupe, événements d’entreprise, mariages, marketing digital et relations presse", head_of_department: "Helene Fontaine" },
  { id: 10, code: "FINANCE_AND_ACCOUNTING", name: "Finance, comptabilité & audit", description: "Audit de nuit, facturation, achats, paie et revenue management", head_of_department: "Bernard Leroy" },
  { id: 11, code: "HUMAN_RESOURCES", name: "Ressources humaines (RH)", description: "Recrutement, intégration des employés, plannings, paie et formation", head_of_department: "Claire Delacroix" },
];

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
