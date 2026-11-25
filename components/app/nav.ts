import type { ReactNode } from "react";

export interface NavTabItem {
  id: string;
  label: string;
  /** A lucide icon element, e.g. <BedDouble aria-hidden /> */
  icon: ReactNode;
  /** Omitted or 0 hides the badge. */
  badge?: number;
  /** "alert" = something needs action (danger colour); "neutral" = informational count. */
  badgeTone?: "neutral" | "alert";
  onClick: () => void;
  isActive: boolean;
}

/** Portal accent used for the department code chip. */
export type DepartmentTone = "brand" | "success" | "special";
