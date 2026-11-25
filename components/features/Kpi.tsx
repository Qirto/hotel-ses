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
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-fg-muted">{label}</span>
        {icon && <span className="text-fg-subtle [&>svg]:size-4" aria-hidden>{icon}</span>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums", VALUE_TONE[tone])}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-fg-muted">{hint}</div>}
    </>
  );
  const cls = "min-w-0 rounded-xl border border-border bg-surface p-4 text-left shadow-card";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "focus-ring transition-colors hover:border-border-hover hover:bg-surface-hover")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4", className)}>{children}</div>;
}
