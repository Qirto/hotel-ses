/** Quick-dispatch presets per department (labels are plain text; icons come from lib/icons). */
export const PRESET_ISSUES: Record<string, { category: string; label: string }[]> = {
  TECHNICAL: [
    { category: "A/C", label: "A/C not cooling" },
    { category: "Plumbing", label: "Leaking sink / shower" },
    { category: "Electrical", label: "Lighting / power issue" },
    { category: "TV/Audio", label: "TV / remote malfunction" },
    { category: "Lock", label: "Door lock stiff" },
  ],
  HOUSEKEEPING: [
    { category: "Towels", label: "Extra towels requested" },
    { category: "Bedding", label: "Extra blanket / pillow" },
    { category: "Toiletries", label: "Shampoo & soap restock" },
    { category: "Cleaning", label: "Urgent floor clean" },
    { category: "Minibar", label: "Minibar restock" },
  ],
  FOOD_AND_BEVERAGE: [
    { category: "Room Service", label: "Room service delivery" },
    { category: "Breakfast", label: "Continental breakfast tray" },
    { category: "Drinks", label: "Champagne & ice bucket" },
  ],
  CONCIERGE: [
    { category: "Luggage", label: "Luggage collection" },
    { category: "Transport", label: "Airport transfer" },
    { category: "Keycard", label: "Keycard reprogramming" },
  ],
};

export const DEFAULT_PRESETS = [
  { category: "General", label: "General guest request" },
  { category: "Urgent", label: "High-priority attention" },
];

/** Departments a ticket can be routed to from the dispatch forms. */
export const DISPATCH_DEPARTMENTS = [
  { value: "TECHNICAL", label: "Technical / Maintenance" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
  { value: "FOOD_AND_BEVERAGE", label: "Food & Beverage" },
  { value: "CONCIERGE", label: "Concierge & Front Desk" },
  { value: "SECURITY", label: "Security & Safety" },
] as const;

export type ShiftType = "MORNING" | "EVENING" | "NIGHT" | "OFF";

export const SHIFT_LABELS: Record<ShiftType, { label: string; time: string; tone: "info" | "warning" | "special" | "neutral" }> = {
  MORNING: { label: "Morning", time: "07:00 – 15:00", tone: "info" },
  EVENING: { label: "Evening", time: "15:00 – 23:00", tone: "warning" },
  NIGHT: { label: "Night", time: "23:00 – 07:00", tone: "special" },
  OFF: { label: "Off / rest", time: "Rest day", tone: "neutral" },
};

