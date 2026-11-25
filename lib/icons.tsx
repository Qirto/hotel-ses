import type { LucideIcon } from "lucide-react";
import {
  Bath,
  BedDouble,
  Briefcase,
  Building2,
  BrushCleaning,
  Candy,
  Car,
  CarTaxiFront,
  CircleAlert,
  ClipboardList,
  ConciergeBell,
  CreditCard,
  Croissant,
  Droplets,
  Flower2,
  KeyRound,
  Lightbulb,
  Luggage,
  Moon,
  ShieldCheck,
  Snowflake,
  SprayCan,
  Sunrise,
  Sunset,
  TreePalm,
  TrendingUp,
  Tv,
  Users,
  UtensilsCrossed,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Single source of truth for domain icons (replaces emojis app-wide).
 * Department icons are looked up by code, never read from the database:
 * stored icon text is legacy emoji data and may be corrupted.
 */
const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  RECEPTION: ConciergeBell,
  HOUSEKEEPING: BrushCleaning,
  GOVERNANCE: BrushCleaning,
  TECHNICAL: Wrench,
  MAINTENANCE: Wrench,
  FOOD_AND_BEVERAGE: UtensilsCrossed,
  MANAGEMENT: Briefcase,
  SECURITY: ShieldCheck,
  CONCIERGE: Car,
  SPA_AND_WELLNESS: Flower2,
  SALES_AND_MARKETING: TrendingUp,
  FINANCE_AND_ACCOUNTING: CreditCard,
  HUMAN_RESOURCES: Users,
};

export function departmentIcon(code?: string | null): LucideIcon {
  return (code && DEPARTMENT_ICONS[code.toUpperCase()]) || Building2;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "A/C": Snowflake,
  HVAC: Snowflake,
  Plumbing: Droplets,
  Electrical: Lightbulb,
  "TV/Audio": Tv,
  Lock: KeyRound,
  Towels: Bath,
  Bedding: BedDouble,
  Toiletries: SprayCan,
  Cleaning: BrushCleaning,
  Minibar: Candy,
  "Room Service": UtensilsCrossed,
  Breakfast: Croissant,
  Drinks: Wine,
  Luggage: Luggage,
  Transport: CarTaxiFront,
  Keycard: CreditCard,
  General: ClipboardList,
  Urgent: Zap,
};

export function categoryIcon(category?: string | null): LucideIcon {
  return (category && CATEGORY_ICONS[category]) || CircleAlert;
}

export const SHIFT_ICONS = {
  MORNING: Sunrise,
  EVENING: Sunset,
  NIGHT: Moon,
  OFF: TreePalm,
} as const satisfies Record<string, LucideIcon>;
