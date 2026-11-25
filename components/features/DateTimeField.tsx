"use client";

import { useMemo } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: pad(h), label: pad(h) }));
const MINUTES = Array.from({ length: 12 }, (_, i) => ({ value: pad(i * 5), label: pad(i * 5) }));

/** "YYYY-MM-DDTHH:mm" (the datetime-local format the server actions already accept). */
function parse(value: string): { date: Date | null; hour: string; minute: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { date: null, hour: "09", minute: "00" };
  const minute = pad(Math.min(55, Math.round(Number(m[5]) / 5) * 5));
  return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), hour: m[4], minute };
}

function format(date: Date, hour: string, minute: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hour}:${minute}`;
}

const selectCls =
  "focus-ring h-11 w-full appearance-none rounded-lg border border-border-strong bg-surface pl-3 pr-8 text-base tabular-nums text-fg md:text-sm";

/**
 * Themed date + time input (replaces the browser's unstyled datetime-local popup).
 * Date: easyui DatePicker. Time: hour and 5-minute selects (native on phones).
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
  /** Latest selectable day (e.g. today for past incidents). */
  maxDate?: Date;
  required?: boolean;
}) {
  const { date, hour, minute } = useMemo(() => parse(value), [value]);

  const set = (next: Partial<{ date: Date | null; hour: string; minute: string }>) => {
    const d = next.date === undefined ? date : next.date;
    if (!d) return;
    onChange(format(d, next.hour ?? hour, next.minute ?? minute));
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend id={`${id}-legend`} className="mb-1.5 text-sm font-medium text-fg-secondary">
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <DatePicker
          value={date}
          onChange={(d) => set({ date: d })}
          maxDate={maxDate}
          weekStartsOn={1}
          placeholder="Pick a date"
          className="block w-full"
        />
        <div className="flex items-center gap-1.5" role="group" aria-label="Time">
          <Clock className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <label className="relative min-w-[4.5rem] flex-1 sm:flex-none">
            <span className="sr-only">Hour</span>
            <select id={`${id}-hour`} value={hour} onChange={(e) => set({ hour: e.target.value })} className={selectCls}>
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          </label>
          <span className="text-fg-muted" aria-hidden>
            :
          </span>
          <label className="relative min-w-[4.5rem] flex-1 sm:flex-none">
            <span className="sr-only">Minute</span>
            <select id={`${id}-minute`} value={minute} onChange={(e) => set({ minute: e.target.value })} className={cn(selectCls)}>
              {MINUTES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
