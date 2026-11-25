"use client";

import { useId, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, History, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRESETS, DISPATCH_DEPARTMENTS, PRESET_ISSUES } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

export function Select({ options, ...props }: React.ComponentProps<"select"> & { options: readonly { value: string; label: string }[] }) {
  return (
    <select {...props} className={cn(control, "h-11", props.className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Segmented single choice (priority, status). */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  options: readonly { value: V; label: string; tone?: "danger" | "warning" }[];
  label: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-fg-secondary">{label}</legend>
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
                "focus-ring min-h-10 truncate rounded-md px-2 text-sm font-medium transition-colors",
                active
                  ? o.tone === "danger"
                    ? "bg-danger-subtle text-danger shadow-card"
                    : o.tone === "warning"
                      ? "bg-warning-subtle text-warning shadow-card"
                      : "bg-surface text-fg shadow-card"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Inline result message under a form or at the top of a view. */
export function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  const Icon = tone === "success" ? CircleCheck : CircleX;
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        tone === "success" ? "border-success/30 bg-success-subtle text-success" : "border-danger/30 bg-danger-subtle text-danger"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/* ───────────── ticket forms ───────────── */

export type Priority = "STANDARD" | "HIGH" | "EMERGENCY";
export interface NewTicketInput {
  department: string;
  category: string;
  description: string;
  priority: Priority;
  room?: string;
}

const PRIORITIES = [
  { value: "STANDARD", label: "Standard" },
  { value: "HIGH", label: "High", tone: "warning" },
  { value: "EMERGENCY", label: "Emergency", tone: "danger" },
] as const;

function categoriesFor(dept: string) {
  return (PRESET_ISSUES[dept] ?? DEFAULT_PRESETS).map((p) => ({ value: p.category, label: p.label }));
}

/** New ticket form. Owns its state, so typing never re-renders the portal. */
export function NewTicketForm({
  onSubmit,
  pending,
  withRoom = false,
  submitLabel = "Dispatch ticket",
  defaultDepartment = "TECHNICAL",
}: {
  onSubmit: (input: NewTicketInput) => Promise<boolean> | boolean;
  pending?: boolean;
  /** Show a room number field (when not opened from a room). */
  withRoom?: boolean;
  submitLabel?: string;
  defaultDepartment?: string;
}) {
  const id = useId();
  const [room, setRoom] = useState("");
  const [department, setDepartment] = useState(defaultDepartment);
  const [category, setCategory] = useState(categoriesFor(defaultDepartment)[0]?.value ?? "General");
  const [priority, setPriority] = useState<Priority>("STANDARD");
  const [description, setDescription] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({ department, category, description: description.trim(), priority, room: room.trim() || undefined });
        if (ok) {
          setDescription("");
          setRoom("");
        }
      }}
    >
      {withRoom && (
        <Field label="Room number" htmlFor={`${id}-room`}>
          <TextInput id={`${id}-room`} inputMode="numeric" required placeholder="e.g. 1031" value={room} onChange={(e) => setRoom(e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor={`${id}-dept`}>
          <Select
            id={`${id}-dept`}
            value={department}
            options={DISPATCH_DEPARTMENTS}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCategory(categoriesFor(e.target.value)[0]?.value ?? "General");
            }}
          />
        </Field>
        <Field label="Issue" htmlFor={`${id}-cat`}>
          <Select id={`${id}-cat`} value={category} options={categoriesFor(department)} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
      <Segmented label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
      <Field label="Details" htmlFor={`${id}-desc`}>
        <TextArea id={`${id}-desc`} placeholder="What did the guest report?" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" isLoading={pending} loadingText="Sending" leftIcon={<Send className="size-4" aria-hidden />} className="w-full justify-center">
        {submitLabel}
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

const PAST_STATUSES = [
  { value: "RESOLVED", label: "Resolved" },
  { value: "IN_PROGRESS", label: "In progress", tone: "warning" },
  { value: "OPEN", label: "Open", tone: "danger" },
] as const;

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
  const [room, setRoom] = useState("");
  const [department, setDepartment] = useState("TECHNICAL");
  const [category, setCategory] = useState(categoriesFor("TECHNICAL")[0]?.value ?? "General");
  const [createdAt, setCreatedAt] = useState(() => new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 16));
  const [status, setStatus] = useState<PastStatus>("RESOLVED");
  const [description, setDescription] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({ department, category, description: description.trim(), createdAt, status, room: room.trim() || undefined });
        if (ok) {
          setDescription("");
          setRoom("");
        }
      }}
    >
      <div className={cn("grid grid-cols-1 gap-4", withRoom && "sm:grid-cols-2")}>
        {withRoom && (
          <Field label="Room number" htmlFor={`${id}-room`}>
            <TextInput id={`${id}-room`} inputMode="numeric" required placeholder="e.g. 1031" value={room} onChange={(e) => setRoom(e.target.value)} />
          </Field>
        )}
        <Field label="Date and time" htmlFor={`${id}-date`}>
          <TextInput id={`${id}-date`} type="datetime-local" required value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor={`${id}-dept`}>
          <Select
            id={`${id}-dept`}
            value={department}
            options={DISPATCH_DEPARTMENTS}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCategory(categoriesFor(e.target.value)[0]?.value ?? "General");
            }}
          />
        </Field>
        <Field label="Issue" htmlFor={`${id}-cat`}>
          <Select id={`${id}-cat`} value={category} options={categoriesFor(department)} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
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
