"use client";

import { INPUT_ICON } from "@/lib/styles";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { SpringSelect } from "@/components/ui/spring-select";
import { cn } from "@/lib/utils";

/*
 * Toolbar controls. They only live inside <FilterBar>, so each one carries its own
 * toolbar sizing (plain utilities: `md:` always overrides the phone value):
 * - phones: one control per full-width row. Their text is 16px (no iOS zoom on
 *   focus), and two French labels side by side no longer fit a 375px screen;
 * - md+: one row; the search takes the free space, dropdowns are a fixed width.
 * Height: 44px touch target on phones, compact 40px from md.
 */
const CONTROL_H = "h-11 md:h-10";
const SEARCH_SIZE = "min-w-0 basis-full md:min-w-56 md:flex-1 md:basis-0";
const SELECT_SIZE = "min-w-0 basis-full md:w-52 md:flex-none md:basis-auto";

/** Search field with icon. 16px text on phones (no iOS zoom). */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className={cn("relative block", SEARCH_SIZE)}>
      <span className="sr-only">{label}</span>
      <Search className={INPUT_ICON} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "focus-ring w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-base text-fg placeholder:text-fg-muted md:text-sm",
          CONTROL_H
        )}
      />
    </label>
  );
}

/** Filter dropdown: easyui SpringSelect, text only (no icon); the label is for screen readers. */
export function SelectField<V extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (value: V) => void;
  options: readonly { value: V; label: string }[];
  label: string;
}) {
  return (
    <div className={SELECT_SIZE}>
      <SpringSelect aria-label={label} value={value} onChange={onChange} options={options} triggerClassName={CONTROL_H} />
    </div>
  );
}

/** The one filter toolbar every filterable view uses: a wrapping row of the controls above. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="toolbar" aria-label="Filtres" className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

/** Single-select chips; scrolls horizontally with faded edges instead of clipping. */
export function PillGroup<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (value: V) => void;
  options: readonly { value: V; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar scroll-fade-x flex max-w-full gap-1.5 overflow-x-auto p-1 scroll-px-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors md:h-8",
              active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("tabular-nums text-xs", active ? "opacity-80" : "text-fg-muted")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
