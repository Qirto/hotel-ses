"use client";

import { useId, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import type { Reclamation, Staff } from "@/utils/roomsData";
import { ResponsiveSheet, SheetActions } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { DepartmentIssueFields, Field, PRIORITIES, Segmented, Select, TextArea, useTicketSubject } from "@/components/features/Forms";
import { staffDepartment } from "@/components/features/hr/staff";
import type { TicketEditInput } from "@/hooks/useTicketMutations";
import { categoryLabel, departmentLabel } from "@/lib/format";
import { TICKET_STATUS } from "@/lib/tickets";

type Assignee = Pick<Staff, "id" | "full_name" | "role">;

/**
 * Edit one request: service, issue, priority, details and assignee; or delete it.
 * Status changes stay with « Prendre en charge » / « Résolue ». Render with
 * `key={ticket.id}` so each request opens with its own values.
 */
export function TicketEditSheet({
  ticket,
  open,
  onOpenChange,
  staff,
  pending,
  onSave,
  onDelete,
  frame = "sheet",
  readOnly = false,
}: {
  ticket: Reclamation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: readonly Staff[];
  pending: boolean;
  onSave: (input: TicketEditInput, assignee: Assignee | null) => void;
  onDelete: () => void;
  /** "sheet": a modal (opened over a page); "page": the same form as a full page. */
  frame?: "sheet" | "page";
  /** Without the right to edit: the same fields, disabled, and only a close button. */
  readOnly?: boolean;
}) {
  const id = useId();
  const subject = useTicketSubject(ticket.department, ticket.category);
  const [priority, setPriority] = useState<Reclamation["priority"]>(ticket.priority);
  const [details, setDetails] = useState(ticket.description ?? "");
  const [assigneeId, setAssigneeId] = useState(ticket.assigned_staff_id ? String(ticket.assigned_staff_id) : "");
  // Two-step delete inside this modal (no second modal stacked on top of it).
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Staff of the chosen service, on-shift first; the current assignee stays listed even
  // when they belong to another service, so opening and saving never drops them.
  const assigneeOptions = useMemo(() => {
    const inDept = staff
      .filter((s) => staffDepartment(s) === subject.department)
      .sort((a, b) => Number(b.shift_status === "ON_SHIFT") - Number(a.shift_status === "ON_SHIFT") || a.full_name.localeCompare(b.full_name, "fr"));
    const options = [
      { value: "", label: "Non assignée" },
      ...inDept.map((s) => ({
        value: String(s.id),
        label: s.shift_status === "ON_SHIFT" ? `${s.full_name} · en service` : s.full_name,
      })),
    ];
    if (assigneeId && !options.some((o) => o.value === assigneeId)) {
      const current = staff.find((s) => String(s.id) === assigneeId);
      if (current)
        options.push({
          value: assigneeId,
          label: `${current.full_name} · ${departmentLabel(current.department)}`,
        });
    }
    return options;
  }, [staff, subject.department, assigneeId]);

  const room = ticket.room?.room_number ?? ticket.room_id;
  const status = TICKET_STATUS[ticket.status]?.label ?? ticket.status;

  const title = `Demande n° ${ticket.id}`;
  const description = `Chambre ${room} · ${categoryLabel(ticket.category)} · ${status}`;
  const footer = readOnly ? (
    <div className="flex w-full justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full justify-center sm:w-auto">
        Fermer
      </Button>
    </div>
  ) : (
    <SheetActions
      onCancel={() => onOpenChange(false)}
      secondary={
        confirmDelete ? (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={pending} leftIcon={<Trash2 className="size-4" aria-hidden />} className="w-full justify-center sm:w-auto">
            Confirmer la suppression
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            leftIcon={<Trash2 className="size-4 text-danger" aria-hidden />}
            className="w-full justify-center sm:w-auto"
          >
            Supprimer
          </Button>
        )
      }
    >
      <Button type="submit" form={`${id}-form`} variant="primary" isLoading={pending} loadingText="Enregistrement" leftIcon={<Save className="size-4" aria-hidden />} className="justify-center">
        Enregistrer
      </Button>
    </SheetActions>
  );
  const form = (
    <form
      id={`${id}-form`}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const assignee = staff.find((s) => String(s.id) === assigneeId) ?? null;
        onSave(
          {
            department: subject.department,
            category: subject.category,
            priority,
            description: details.trim(),
          },
          assignee && {
            id: assignee.id,
            full_name: assignee.full_name,
            role: assignee.role,
          },
        );
      }}
    >
      <fieldset disabled={readOnly} className="contents">
        <DepartmentIssueFields id={id} subject={subject} />
        <Segmented label="Priorité" value={priority} onChange={setPriority} options={PRIORITIES} />
        <Field label="Assignée à" htmlFor={`${id}-assignee`}>
          <Select id={`${id}-assignee`} value={assigneeId} options={assigneeOptions} onChange={setAssigneeId} />
        </Field>
        <Field label="Détails" htmlFor={`${id}-desc`}>
          <TextArea id={`${id}-desc`} placeholder={"Qu’a signalé le client ?"} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
      </fieldset>
    </form>
  );

  if (frame === "page")
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-border bg-surface p-4 shadow-card md:p-6" aria-label={title}>
        <header>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
        </header>
        {form}
        <div className="border-t border-border pt-4">{footer}</div>
      </section>
    );

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title} description={description} footer={footer}>
      {form}
    </ResponsiveSheet>
  );
}
