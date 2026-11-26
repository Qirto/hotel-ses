import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/rooms";

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-fg",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-fg",
  special: "text-special",
};

/** Headline number card. Same size and rhythm in every portal. */
export function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
}) {
  // Three rows (label, value, hint) on the KpiGrid's subgrid: every card in a grid
  // row shares them, so numbers line up however each label or hint wraps.
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-fg-muted">{label}</span>
        {icon && <span className="text-fg-subtle [&>svg]:size-4" aria-hidden>{icon}</span>}
      </div>
      <div className={cn("pt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums", VALUE_TONE[tone])}>{value}</div>
      <div className="pt-1.5 text-xs text-fg-muted">{hint}</div>
    </>
  );
  const cls = "row-span-3 grid min-w-0 grid-rows-subgrid gap-y-0 rounded-xl border border-border bg-surface p-4 text-left shadow-card";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "focus-ring transition-colors hover:border-border-hover hover:bg-surface-hover")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Grid for Kpi cards (they sit on its subgrid). `columns={2}` inside a half-width panel. */
export function KpiGrid({ children, className, columns = 4 }: { children: ReactNode; className?: string; columns?: 2 | 4 }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:gap-4", columns === 4 && "lg:grid-cols-4", className)}>{children}</div>;
}
