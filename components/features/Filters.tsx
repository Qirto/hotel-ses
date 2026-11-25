"use client";

import type { ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Search field with icon. 44px tall, 16px text (no iOS zoom). */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring h-11 w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-base text-fg placeholder:text-fg-muted md:text-sm"
      />
    </label>
  );
}

/** Native select (best on mobile) styled to match. */
export function SelectField<V extends string | number>({
  value,
  onChange,
  options,
  label,
  icon,
  className,
}: {
  value: V;
  onChange: (value: V) => void;
  options: readonly { value: V; label: string }[];
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{label}</span>
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted [&>svg]:size-4" aria-hidden>
          {icon}
        </span>
      )}
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className={cn(
          "focus-ring h-11 w-full appearance-none truncate rounded-lg border border-border-strong bg-surface pr-9 text-base text-fg md:text-sm",
          icon ? "pl-9" : "pl-3"
        )}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
    </label>
  );
}

/** Responsive filter row: stacks on phones, one line from md. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:items-center [&>*]:md:min-w-44 [&>*:first-child]:md:flex-1", className)}>{children}</div>;
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
    <div role="radiogroup" aria-label={label} className="no-scrollbar scroll-fade-x -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
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
              "focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
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
