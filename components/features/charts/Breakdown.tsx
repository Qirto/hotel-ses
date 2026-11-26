"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { percent } from "@/lib/format";

/*
 * Breakdown charts shared by every portal. Figures are always printed as text, so the
 * bars only carry proportion and never colour alone: they are aria-hidden, the
 * list is the accessible content.
 *
 * - <SplitBreakdown>: one whole split into parts (room status). A thin segmented bar,
 *   then one row per part: swatch, name, count, share.
 * - <RankedBreakdown>: items ranked largest first (tickets or staff per department).
 *   One row per item: name, its split and its total, and a bar that is that item's own
 *   100% split by series (each row reads on its own; volume is the bold total and the
 *   order). One legend and a grand total for the whole list.
 */

export interface Series {
  key: string;
  label: string;
  /** CSS colour, from theme tokens (e.g. "var(--success)"). */
  color: string;
}

/** Segments laid end to end with a 2px gap; any non-zero part stays visible. */
function StackBar({ segments, className }: { segments: { key: string; value: number; color: string }[]; className?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-surface-raised", className)} aria-hidden>
      <div className="flex h-full w-full gap-0.5">
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span
                key={s.key}
                className="h-full min-w-1 first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: s.value, flexBasis: 0, backgroundColor: s.color }}
              />
            ))}
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

/** "341 rooms": the whole the chart adds up to. */
function Total({ value, unit }: { value: number; unit: readonly [string, string] }) {
  return (
    <p className="text-sm tabular-nums text-fg-secondary">
      <span className="font-semibold text-fg">{value}</span> {value === 1 ? unit[0] : unit[1]}
    </p>
  );
}

export function Legend({ series }: { series: readonly Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-secondary" aria-label="Legend">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <Swatch color={s.color} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/* ───────────── one whole, split into parts ───────────── */

export const SplitBreakdown = memo(function SplitBreakdown({
  parts,
  label,
  unit,
}: {
  parts: readonly (Series & { value: number })[];
  /** Accessible name of the list, e.g. "Room status". */
  label: string;
  /** Singular and plural noun for the total, e.g. ["room", "rooms"]. */
  unit: readonly [string, string];
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <Total value={total} unit={unit} />
      <StackBar segments={parts.map((p) => ({ key: p.key, value: p.value, color: p.color }))} className="h-2.5" />
      <ul className="flex flex-col divide-y divide-border" aria-label={label}>
        {parts.map((p) => (
          <li key={p.key} className="flex min-h-10 items-center gap-3 py-2 text-sm">
            <Swatch color={p.color} />
            <span className="min-w-0 flex-1 truncate text-fg">{p.label}</span>
            <span className="font-medium tabular-nums text-fg">{p.value}</span>
            <span className="w-10 text-right tabular-nums text-fg-muted">{percent(p.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

/* ───────────── items compared, each split by series ───────────── */

export interface RankedRow {
  label: string;
  values: Record<string, number>;
}

export const RankedBreakdown = memo(function RankedBreakdown({
  rows,
  series,
  label,
  unit,
}: {
  rows: readonly RankedRow[];
  series: readonly Series[];
  label: string;
  /** Singular and plural noun for the grand total, e.g. ["ticket", "tickets"]. */
  unit: readonly [string, string];
}) {
  const totals = rows.map((r) => series.reduce((a, s) => a + (r.values[s.key] ?? 0), 0));
  const grand = totals.reduce((a, n) => a + n, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Legend series={series} />
        <Total value={grand} unit={unit} />
      </div>
      <ol className="flex flex-col gap-3.5" aria-label={label}>
        {rows.map((r, i) => (
          <li key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-fg">{r.label}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                {/* per-series split, muted; the row total, bold */}
                <span className="text-xs text-fg-muted">
                  {series.map((s) => `${r.values[s.key] ?? 0} ${s.label.toLowerCase()}`).join(" · ")}
                </span>
                <span className="font-semibold text-fg">{totals[i]}</span>
              </span>
            </div>
            <StackBar
              segments={series.map((s) => ({ key: s.key, value: r.values[s.key] ?? 0, color: s.color }))}
            />
          </li>
        ))}
      </ol>
    </div>
  );
});
