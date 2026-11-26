"use client";

import * as React from "react";
import { AnchoredPopover } from "./anchored-popover";
import { CalendarDays } from "lucide-react";
import { cn } from "../../lib/utils";
import { Calendar, type CalendarOptions, type DateRange } from "./calendar";

function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (next: T) => void] {
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : internal;

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [controlled]
  );

  return [current, set];
}

type Side = "bottom" | "top";
const fmt = (d: Date, locale?: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);

/* ───────────── shell: trigger + animated popover ───────────── */

function PickerShell({
  text,
  placeholder,
  align = "start",
  // `side` is kept for API compatibility; AnchoredPopover picks the side that fits.
  side: _side,
  disabled,
  className,
  children,
}: {
  text: string | null;
  placeholder: string;
  align?: "start" | "end";
  side?: Side | "auto";
  disabled?: boolean;
  className?: string;
  children: (api: { close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const timer = React.useRef<number | undefined>(undefined);

  // brief beat so the selection pill lands before the popover closes
  const close = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const a = document.activeElement;
      setOpen(false);
      // only hand focus back if it hasn't left the picker in the meantime
      if (!a || a === document.body || a.closest('[role="dialog"][aria-label="Choose date"]')) triggerRef.current?.focus();
    }, 160);
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className={cn("relative inline-block w-64 max-w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          // Hotel SES: same size/tokens as every other input (44px, >= 3:1 outline, 16px text on phones)
          "focus-ring flex h-11 w-full items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 text-base text-fg transition-colors hover:border-border-hover disabled:pointer-events-none disabled:opacity-50 md:text-sm",
          open && "border-neutral-400 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-600"
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-fg-muted" />
        <span
          className={cn(
            "truncate",
            text ? "text-fg" : "text-fg-muted"
          )}
        >
          {text ?? placeholder}
        </span>
      </button>

      {/* Hotel SES: portalled + viewport-aware, so sheets and cards never clip it */}
      <AnchoredPopover
        open={open}
        onClose={(reason) => {
          setOpen(false);
          if (reason === "escape") triggerRef.current?.focus();
        }}
        anchorRef={triggerRef}
        align={align}
        role="dialog"
        aria-label="Choose date"
        className="w-max max-w-[calc(100vw-1rem)]"
      >
        {children({ close })}
      </AnchoredPopover>
    </div>
  );
}

/* ───────────── single date ───────────── */

export interface DatePickerProps extends CalendarOptions {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  align?: "start" | "end";
  side?: Side | "auto";
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  defaultValue = null,
  onChange,
  placeholder = "Pick a date",
  align,
  side,
  disabled,
  className,
  ...calendar
}: DatePickerProps) {
  const [date, setDate] = useControllableState<Date | null>(value, defaultValue, onChange);

  return (
    <PickerShell
      text={date ? fmt(date, calendar.locale) : null}
      placeholder={placeholder}
      align={align}
      side={side}
      disabled={disabled}
      className={className}
    >
      {({ close }) => (
        <Calendar
          mode="single"
          value={date}
          onChange={(d) => {
            setDate(d);
            close();
          }}
          {...calendar}
        />
      )}
    </PickerShell>
  );
}

/* ───────────── date range ───────────── */

export interface DateRangePickerProps extends CalendarOptions {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  align?: "start" | "end";
  side?: Side | "auto";
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  value,
  defaultValue = { from: null, to: null },
  onChange,
  placeholder = "Pick a range",
  align,
  side,
  disabled,
  className,
  ...calendar
}: DateRangePickerProps) {
  const [range, setRange] = useControllableState<DateRange>(value, defaultValue, onChange);
  const text = range.from
    ? `${fmt(range.from, calendar.locale)} – ${range.to ? fmt(range.to, calendar.locale) : "…"}`
    : null;

  return (
    <PickerShell
      text={text}
      placeholder={placeholder}
      align={align}
      side={side}
      disabled={disabled}
      className={cn("w-72", className)}
    >
      {({ close }) => (
        <Calendar
          mode="range"
          value={range}
          onChange={(r) => {
            setRange(r);
            if (r.from && r.to) close();
          }}
          {...calendar}
        />
      )}
    </PickerShell>
  );
}
