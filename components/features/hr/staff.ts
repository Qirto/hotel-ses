import type { Department, Staff } from "@/utils/roomsData";

/** Built-in departments. Icons are rendered with `departmentIcon(code)`, never stored here. */
export const DEFAULT_HOTEL_DEPARTMENTS: Omit<Department, "icon">[] = [
  { id: 1, code: "RECEPTION", name: "Reception & Front Desk", description: "Guest check-in/out, switchboard, inquiries and concierge dispatches", head_of_department: "Sophie Mercier" },
  { id: 2, code: "HOUSEKEEPING", name: "Housekeeping & Gouvernante", description: "Room cleaning, linen management, amenity restocking and floor inspections", head_of_department: "Martine Aubry" },
  { id: 3, code: "TECHNICAL", name: "Technical & Maintenance", description: "Plumbing, electrical, HVAC, fixtures and preventive facilities maintenance", head_of_department: "Pierre Dubois" },
  { id: 4, code: "FOOD_AND_BEVERAGE", name: "Food & Beverage (F&B)", description: "Kitchen, restaurants, banquets, room service and bars", head_of_department: "Chef Antoine Girard" },
  { id: 5, code: "MANAGEMENT", name: "Executive & General Management", description: "Hotel operations oversight, executive decisions, VIP relations and strategy", head_of_department: "Jean-Paul Bonnet" },
  { id: 6, code: "SECURITY", name: "Security & Safety", description: "Premises surveillance, access control, keycards, guest safety and emergency protocols", head_of_department: "Marc Lambert" },
  { id: 7, code: "CONCIERGE", name: "Concierge & Guest Relations", description: "Valet parking, luggage handling, excursions, transport and VIP guest assistance", head_of_department: "Lucie Moreau" },
  { id: 8, code: "SPA_AND_WELLNESS", name: "Spa, Wellness & Fitness", description: "Massage treatments, thermal baths, sauna, gym and wellness therapies", head_of_department: "Camille Roux" },
  { id: 9, code: "SALES_AND_MARKETING", name: "Sales, Marketing & Events", description: "Group bookings, corporate events, weddings, digital marketing and PR", head_of_department: "Helene Fontaine" },
  { id: 10, code: "FINANCE_AND_ACCOUNTING", name: "Finance, Accounting & Audit", description: "Night audit, billing, purchasing, payroll and revenue management", head_of_department: "Bernard Leroy" },
  { id: 11, code: "HUMAN_RESOURCES", name: "Human Resources (HR)", description: "Recruitment, employee onboarding, scheduling, payroll and training", head_of_department: "Claire Delacroix" },
];

export const STANDARD_ROLES = [
  "manager", "receptionist", "maintenance", "governance", "chef", "cook", "waiter", "bartender",
  "concierge", "security_officer", "spa_therapist", "housekeeper", "bellboy", "accountant", "hr_specialist", "master",
];

export function roleLabel(role: string) {
  const s = role.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ROLE_OPTIONS = STANDARD_ROLES.map((r) => ({ value: r, label: roleLabel(r) }));

export const SHIFT_STATUS: Record<Staff["shift_status"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  ON_SHIFT: { label: "On shift", tone: "success" },
  OFF_SHIFT: { label: "Off shift", tone: "neutral" },
  ON_BREAK: { label: "On break", tone: "warning" },
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
