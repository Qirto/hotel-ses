"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Primary floating action. Sits above the mobile bottom nav and safe area. */
export function Fab({
  label,
  onClick,
  icon,
  className,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-float transition-transform hover:bg-brand-hover active:scale-95 [&>svg]:size-6",
        "bottom-[calc(5rem+var(--safe-bottom))] md:bottom-8 md:right-8",
        className
      )}
    >
      {icon ?? <Plus aria-hidden />}
    </button>
  );
}
