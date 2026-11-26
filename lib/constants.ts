/** Quick-dispatch presets per department (labels are plain text; icons come from lib/icons). */
export const PRESET_ISSUES: Record<string, { category: string; label: string }[]> = {
  TECHNICAL: [
    { category: "A/C", label: "Climatisation inefficace" },
    { category: "Plumbing", label: "Fuite lavabo / douche" },
    { category: "Electrical", label: "Panne d’éclairage / d’électricité" },
    { category: "TV/Audio", label: "TV / télécommande en panne" },
    { category: "Lock", label: "Serrure de porte difficile" },
  ],
  HOUSEKEEPING: [
    { category: "Towels", label: "Serviettes supplémentaires" },
    { category: "Bedding", label: "Couverture / oreiller supplémentaire" },
    { category: "Toiletries", label: "Réassort shampooing & savon" },
    { category: "Cleaning", label: "Nettoyage urgent du sol" },
    { category: "Minibar", label: "Réassort du minibar" },
  ],
  FOOD_AND_BEVERAGE: [
    { category: "Room Service", label: "Livraison room service" },
    { category: "Breakfast", label: "Plateau petit-déjeuner continental" },
    { category: "Drinks", label: "Champagne & seau à glace" },
  ],
  CONCIERGE: [
    { category: "Luggage", label: "Prise en charge des bagages" },
    { category: "Transport", label: "Transfert aéroport" },
    { category: "Keycard", label: "Reprogrammation de carte-clé" },
  ],
};

export const DEFAULT_PRESETS = [
  { category: "General", label: "Demande client générale" },
  { category: "Urgent", label: "Intervention prioritaire" },
];

/** Departments a ticket can be routed to from the dispatch forms. */
export const DISPATCH_DEPARTMENTS = [
  { value: "TECHNICAL", label: "Service technique" },
  { value: "HOUSEKEEPING", label: "Gouvernance" },
  { value: "FOOD_AND_BEVERAGE", label: "Restauration" },
  { value: "CONCIERGE", label: "Conciergerie & réception" },
  { value: "SECURITY", label: "Sécurité" },
] as const;

export type ShiftType = "MORNING" | "EVENING" | "NIGHT" | "OFF";

export const SHIFT_LABELS: Record<ShiftType, { label: string; time: string; tone: "info" | "warning" | "special" | "neutral" }> = {
  MORNING: { label: "Matin", time: "07:00 – 15:00", tone: "info" },
  EVENING: { label: "Soir", time: "15:00 – 23:00", tone: "warning" },
  NIGHT: { label: "Nuit", time: "23:00 – 07:00", tone: "special" },
  OFF: { label: "Repos", time: "Jour de repos", tone: "neutral" },
};

