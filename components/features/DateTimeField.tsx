"use client";

import { INPUT_ICON } from "@/lib/styles";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatWallDate, hotelParts, pad2 as pad, parseWallTime } from "@/lib/datetime";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * The picker works in hotel wall-clock time: `date` is a calendar day (a Date at
 * that day's local midnight, only used for its year/month/day and the Calendar),
 * plus the hour and minute. Real moments (now, maxDate) enter through `partsAt`.
 */
type Parts = { date: Date | null; hour: number; minute: number };

const roundDown5 = (minute: number) => Math.floor(minute / 5) * 5;

/** The hotel calendar day and time of an instant. */
function partsAt(instant: Date | number): Parts {
  const w = hotelParts(instant);
  return { date: new Date(w.year, w.month - 1, w.day), hour: w.hour, minute: roundDown5(w.minute) };
}

/** "YYYY-MM-DDTHH:mm" hotel wall-clock value (converted to an instant on save). */
function parse(value: string): Parts {
  const w = parseWallTime(value);
  if (!w) return { date: null, hour: 9, minute: 0 };
  return { date: new Date(w.year, w.month - 1, w.day), hour: w.hour, minute: Math.min(55, Math.round(w.minute / 5) * 5) };
}

const serialize = ({ date, hour, minute }: Parts) =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}` : "";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
/** "Mon, 23/11/2026" for a calendar day. */
const dayLabel = (d: Date) => `${weekdayFmt.format(d)}, ${formatWallDate({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })}`;

/** Latest allowed hour/minute on `date` (only limited on the max day). */
function limits(date: Date | null, max?: Parts) {
  if (!date || !max?.date || !sameDay(date, max.date)) return { hour: 23, minute: (_h: number) => 55 };
  return { hour: max.hour, minute: (h: number) => (h === max.hour ? max.minute : 55) };
}

/** Pull a time back inside the allowed range after the day changes. */
function clamp(p: Parts, max?: Parts): Parts {
  const l = limits(p.date, max);
  const hour = Math.min(p.hour, l.hour);
  return { ...p, hour, minute: Math.min(p.minute, l.minute(hour)) };
}

/**
 * Themed date + time field. One trigger like every other input; the popover
 * (portal, flips/clamps, docks to the bottom on phones) holds the easyui
 * Calendar and hour / 5-minute lists. Changes apply immediately.
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  maxDate,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Latest selectable moment (e.g. now, for past incidents). */
  maxDate?: Date;
  required?: boolean;
}) {
  const parts = useMemo(() => parse(value), [value]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  // the latest allowed moment, in hotel time
  const max = useMemo(() => (maxDate ? partsAt(maxDate) : undefined), [maxDate]);
  const lim = limits(parts.date, max);

  const update = (next: Partial<Parts>) => {
    const merged = { ...parts, ...next };
    // picking a time before a day: assume the hotel's today (or the max day)
    if (!merged.date) merged.date = (max ?? partsAt(Date.now())).date;
    onChange(serialize(clamp(merged, max)));
  };

  const setNow = () => onChange(serialize(clamp(partsAt(Date.now()), max)));

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const text = parts.date ? `${dayLabel(parts.date)} · ${pad(parts.hour)}:${pad(parts.minute)}` : null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-required={required || undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "focus-ring relative flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border bg-surface pl-9 pr-9 text-left text-base transition-colors md:text-sm",
          open ? "border-border-hover" : "border-border-strong hover:border-border-hover",
          text ? "text-fg" : "text-fg-muted"
        )}
      >
        <CalendarClock className={INPUT_ICON} aria-hidden />
        <span className="truncate tabular-nums">{text ?? "Choisir la date et l’heure"}</span>
        <ChevronDown
          className={cn("pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <AnchoredPopover
        open={open}
        onClose={(reason) => close(reason === "escape")}
        anchorRef={triggerRef}
        dockOnPhone
        id={panelId}
        role="dialog"
        aria-label={`${label} : choisir la date et l’heure`}
        className="flex flex-col sm:w-max"
      >
        <PanelBody
          parts={parts}
          maxDay={max?.date ?? undefined}
          maxHour={lim.hour}
          maxMinute={lim.minute}
          onDate={(date) => update({ date })}
          onHour={(hour) => update({ hour })}
          onMinute={(minute) => update({ minute })}
          onNow={setNow}
          onDone={() => close()}
          summary={text}
        />
      </AnchoredPopover>
    </div>
  );
}

function PanelBody({
  parts,
  maxDay,
  maxHour,
  maxMinute,
  onDate,
  onHour,
  onMinute,
  onNow,
  onDone,
  summary,
}: {
  parts: Parts;
  /** Last selectable calendar day (hotel time). */
  maxDay?: Date;
  maxHour: number;
  maxMinute: (hour: number) => number;
  onDate: (d: Date) => void;
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
  onNow: () => void;
  onDone: () => void;
  summary: string | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // move focus into the panel; the calendar takes it on its selected day
  useEffect(() => {
    const el = rootRef.current;
    const day = el?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]');
    (day ?? el)?.focus({ preventScroll: true });
  }, []);

  // keep Tab inside the panel
  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !rootRef.current) return;
    const nodes = [...rootRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]')];
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const hourOptions = HOURS.map((h) => ({ value: h, label: pad(h), disabled: h > maxHour }));
  const minuteOptions = MINUTES.map((m) => ({ value: m, label: pad(m), disabled: m > maxMinute(parts.hour) }));

  return (
    <div ref={rootRef} tabIndex={-1} onKeyDown={trap} className="flex min-h-0 flex-col outline-none">
      <div className="flex min-h-0 flex-col sm:flex-row">
        <Calendar
          mode="single"
          value={parts.date}
          onChange={(d) => d && onDate(d)}
          defaultMonth={parts.date ?? maxDay}
          maxDate={maxDay}
          weekStartsOn={1}
          locale="fr-FR"
          className="mx-auto shrink-0"
        />
        {/* phones: two scrolling rows under the calendar; sm+: two columns beside it, as tall as the calendar */}
        <div className="border-t border-border p-3 sm:relative sm:w-36 sm:border-l sm:border-t-0 sm:p-0">
          <div className="flex flex-col gap-3 sm:absolute sm:inset-0 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
            <TimeList label="Heure" options={hourOptions} value={parts.hour} onSelect={onHour} />
            <TimeList label="Minute" options={minuteOptions} value={parts.minute} onSelect={onMinute} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm tabular-nums text-fg-secondary" aria-live="polite">
          {summary ?? "Aucune date choisie"}
        </p>
        <Button type="button" variant="ghost" size="touch" onClick={onNow}>
          Maintenant
        </Button>
        <Button type="button" variant="primary" size="touch" onClick={onDone}>
          Valider
        </Button>
      </div>
    </div>
  );
}

/** Single-choice list of times: vertical column on sm+, horizontal row on phones. Roving focus, arrow keys. */
function TimeList({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: number; label: string; disabled: boolean }[];
  value: number;
  onSelect: (v: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  // bring the selected time into view (centred) on open and when it changes
  useEffect(() => {
    const list = listRef.current;
    const el = list?.children[selected] as HTMLElement | undefined;
    if (!list || !el) return;
    if (list.scrollHeight > list.clientHeight) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
    if (list.scrollWidth > list.clientWidth) list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.offsetWidth / 2;
  }, [selected]);

  const move = (e: KeyboardEvent) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    const edge = e.key === "Home" ? -1 : e.key === "End" ? options.length : null;
    if (!step && edge === null) return;
    e.preventDefault();
    let i = edge ?? selected;
    const dir = edge === null ? step : edge < 0 ? 1 : -1;
    do i += dir;
    while (i >= 0 && i < options.length && options[i].disabled);
    if (i < 0 || i >= options.length) return;
    onSelect(options[i].value);
    requestAnimationFrame(() => (listRef.current?.children[i] as HTMLElement | undefined)?.focus());
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 sm:gap-0">
      <span id={labelId} className="text-xs font-medium text-fg-muted sm:border-b sm:border-border sm:px-2 sm:py-2 sm:text-center">
        {label}
      </span>
      <div
        ref={listRef}
        role="listbox"
        aria-labelledby={labelId}
        onKeyDown={move}
        className="relative flex gap-1 overflow-x-auto overscroll-x-contain sm:overscroll-y-contain [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,#000_1.25rem,#000_calc(100%-1.25rem),transparent)] px-4 sm:[mask-image:none] sm:min-h-0 sm:flex-1 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:p-1"
      >
        {options.map((o, i) => {
          const isSelected = i === selected;
          return (
            <div
              key={o.value}
              role="option"
              aria-selected={isSelected}
              aria-disabled={o.disabled || undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => !o.disabled && onSelect(o.value)}
              className={cn(
                "focus-ring grid h-10 min-w-11 shrink-0 cursor-pointer select-none place-items-center rounded-lg text-sm tabular-nums transition-colors",
                isSelected ? "bg-fg font-semibold text-bg" : "text-fg-secondary hover:bg-surface-hover hover:text-fg",
                o.disabled && "pointer-events-none opacity-35"
              )}
            >
              {o.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
