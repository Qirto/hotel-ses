"use client";

import { useId, useState, type ReactNode } from "react";
import { History, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpringSelect, type SpringSelectProps } from "@/components/ui/spring-select";
import { DEFAULT_PRESETS, DISPATCH_DEPARTMENTS, PRESET_ISSUES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DAY_MS, toHotelDateTimeValue } from "@/lib/datetime";
import { TICKET_PRIORITY, TICKET_STATUS } from "@/lib/tickets";
import type { Reclamation } from "@/utils/roomsData";
import { DateTimeField } from "./DateTimeField";

/* ───────────── field primitives (same look in every form) ───────────── */

const control =
  "focus-ring w-full rounded-lg border border-border-strong bg-surface px-3 text-base text-fg placeholder:text-fg-muted md:text-sm";

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(control, "h-11", props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cn(control, "min-h-24 py-2.5", props.className)} />;
}

/** Form select: easyui SpringSelect (themed list, portal, full keyboard support). */
export function Select<V extends string>(props: SpringSelectProps<V> & { value: V; onChange: (value: V) => void }) {
  return <SpringSelect {...props} />;
}

/** Segmented single choice (priority, status, theme). */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  label,
  hideLabel = false,
}: {
  value: V;
  onChange: (v: V) => void;
  options: readonly { value: V; label: string; tone?: "danger" | "warning"; icon?: ReactNode }[];
  label: string;
  /** Keep the label for screen readers only (when a surrounding row already shows it). */
  hideLabel?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-medium text-fg-secondary"}>{label}</legend>
      <div className="grid gap-1 rounded-lg border border-border bg-surface-raised p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 truncate rounded-md px-2 text-sm font-medium transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
                active
                  ? o.tone === "danger"
                    ? "bg-danger-subtle text-danger shadow-card"
                    : o.tone === "warning"
                      ? "bg-warning-subtle text-warning shadow-card"
                      : "bg-surface text-fg shadow-card"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ───────────── ticket forms ───────────── */

export type Priority = Reclamation["priority"];
export interface NewTicketInput {
  department: string;
  category: string;
  description: string;
  priority: Priority;
  room?: string;
}

// Labels and tones from lib/tickets; least urgent first, so the default is the first choice.
const PRIORITIES = (["STANDARD", "HIGH", "EMERGENCY"] as const).map((value) => {
  const { label, tone } = TICKET_PRIORITY[value];
  return { value, label, tone: tone === "danger" || tone === "warning" ? tone : undefined };
});

/* ───────────── shared ticket-form parts ───────────── */

const DEFAULT_DEPARTMENT = "TECHNICAL";
const issueOptionsCache = new Map<string, { value: string; label: string }[]>();

/** Issue choices for a department (its presets, or the defaults); built once per department. */
function issueOptions(dept: string) {
  let options = issueOptionsCache.get(dept);
  if (!options) {
    options = (PRESET_ISSUES[dept] ?? DEFAULT_PRESETS).map((p) => ({ value: p.category, label: p.label }));
    issueOptionsCache.set(dept, options);
  }
  return options;
}
const firstIssue = (dept: string) => issueOptions(dept)[0]?.value ?? "General";

/** Department + issue state: changing the department resets the issue to its first preset. */
function useTicketSubject(defaultDepartment = DEFAULT_DEPARTMENT) {
  const [department, setDepartment] = useState(defaultDepartment);
  const [category, setCategory] = useState(() => firstIssue(defaultDepartment));
  const changeDepartment = (dept: string) => {
    setDepartment(dept);
    setCategory(firstIssue(dept));
  };
  return { department, category, setCategory, changeDepartment };
}

function DepartmentIssueFields({ id, subject }: { id: string; subject: ReturnType<typeof useTicketSubject> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Department" htmlFor={`${id}-dept`}>
        <Select id={`${id}-dept`} value={subject.department} options={DISPATCH_DEPARTMENTS} onChange={subject.changeDepartment} />
      </Field>
      <Field label="Issue" htmlFor={`${id}-cat`}>
        <Select id={`${id}-cat`} value={subject.category} options={issueOptions(subject.department)} onChange={subject.setCategory} />
      </Field>
    </div>
  );
}

function RoomNumberField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Room number" htmlFor={`${id}-room`}>
      <TextInput id={`${id}-room`} inputMode="numeric" required placeholder="e.g. 1031" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** Form submit that sends, then clears the free-text fields when the send succeeded. */
function submitThenReset(send: () => Promise<boolean> | boolean, reset: () => void) {
  return async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send()) reset();
  };
}

/* ───────────── new ticket ───────────── */

/** New ticket form. Owns its state, so typing never re-renders the portal. */
export function NewTicketForm({
  onSubmit,
  pending,
  withRoom = false,
  defaultDepartment,
}: {
  onSubmit: (input: NewTicketInput) => Promise<boolean> | boolean;
  pending?: boolean;
  /** Show a room number field (when not opened from a room). */
  withRoom?: boolean;
  defaultDepartment?: string;
}) {
  const id = useId();
  const subject = useTicketSubject(defaultDepartment);
  const [room, setRoom] = useState("");
  const [priority, setPriority] = useState<Priority>("STANDARD");
  const [description, setDescription] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={submitThenReset(
        () => onSubmit({ department: subject.department, category: subject.category, description: description.trim(), priority, room: room.trim() || undefined }),
        () => {
          setDescription("");
          setRoom("");
        }
      )}
    >
      {withRoom && <RoomNumberField id={id} value={room} onChange={setRoom} />}
      <DepartmentIssueFields id={id} subject={subject} />
      <Segmented label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
      <Field label="Details" htmlFor={`${id}-desc`}>
        <TextArea id={`${id}-desc`} placeholder="What did the guest report?" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" isLoading={pending} loadingText="Sending" leftIcon={<Send className="size-4" aria-hidden />} className="w-full justify-center">
        Dispatch ticket
      </Button>
    </form>
  );
}

export type PastStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export interface PastIncidentInput {
  department: string;
  category: string;
  description: string;
  createdAt: string;
  status: PastStatus;
  room?: string;
}

// Labels from lib/tickets. Tones differ from the badges on purpose: "Resolved" is the neutral default here.
const PAST_STATUSES = [
  { value: "RESOLVED", label: TICKET_STATUS.RESOLVED.label },
  { value: "IN_PROGRESS", label: TICKET_STATUS.IN_PROGRESS.label, tone: "warning" },
  { value: "OPEN", label: TICKET_STATUS.OPEN.label, tone: "danger" },
] as const;

/** Three days ago in hotel time ("YYYY-MM-DDTHH:mm"), rounded down to 5 minutes to match the minute list. */
function defaultPastIncidentDate(): string {
  const fiveMinutes = 5 * 60_000;
  return toHotelDateTimeValue(Math.floor((Date.now() - 3 * DAY_MS) / fiveMinutes) * fiveMinutes);
}

/** Backfill a past incident with its real date. */
export function PastIncidentForm({
  onSubmit,
  pending,
  withRoom = false,
}: {
  onSubmit: (input: PastIncidentInput) => Promise<boolean> | boolean;
  pending?: boolean;
  withRoom?: boolean;
}) {
  const id = useId();
  const subject = useTicketSubject();
  const [room, setRoom] = useState("");
  const [createdAt, setCreatedAt] = useState(() => defaultPastIncidentDate());
  const [status, setStatus] = useState<PastStatus>("RESOLVED");
  const [description, setDescription] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={submitThenReset(
        () => onSubmit({ department: subject.department, category: subject.category, description: description.trim(), createdAt, status, room: room.trim() || undefined }),
        () => {
          setDescription("");
          setRoom("");
        }
      )}
    >
      <div className={cn("grid grid-cols-1 gap-4", withRoom && "sm:grid-cols-2")}>
        {withRoom && <RoomNumberField id={id} value={room} onChange={setRoom} />}
        <DateTimeField id={`${id}-date`} label="Date and time" value={createdAt} onChange={setCreatedAt} maxDate={new Date()} required />
      </div>
      <DepartmentIssueFields id={id} subject={subject} />
      <Segmented label="Status" value={status} onChange={setStatus} options={PAST_STATUSES} />
      <Field label="Details" htmlFor={`${id}-desc`}>
        <TextArea id={`${id}-desc`} required placeholder="What happened?" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" size="lg" isLoading={pending} loadingText="Saving" leftIcon={<History className="size-4" aria-hidden />} className="w-full justify-center">
        Record past incident
      </Button>
    </form>
  );
}
