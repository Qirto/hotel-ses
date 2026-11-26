"use client";

import { useCallback, useMemo, useState } from "react";
import type { Staff } from "@/utils/roomsData";
import { StaffFormSheet } from "@/components/features/hr/StaffFormSheet";
import type { NewStaffInput } from "@/components/features/hr/staff";
import {
  anonymizeStaffRecord,
  createStaffMember,
  deleteStaffMember,
  markStaffAbsentAndRedistribute,
  toggleStaffShift,
  undoStaffAbsence,
  updateStaffMember,
} from "@/app/actions";
import { plural } from "@/lib/format";
import { useSyncedState } from "./useActions";
import type { ConfirmRequest, PortalRunner } from "./useConfirm";

/**
 * The staff directory: list, search and service filter, shift (undo), absence
 * (confirm + undo), removal, anonymisation and the add / edit form. Shared by the
 * RH and Administration portals. Render `formElement` once.
 */
export function useStaffDirectory(
  p: PortalRunner,
  staffList: Staff[],
  ask: (r: ConfirmRequest) => void,
  departmentOptions: { value: string; label: string }[]
) {
  const { run, runForResult, flash, isPending } = p;
  const [staff, setStaff] = useSyncedState<Staff[]>(staffList);

  /* ───────────── list ───────────── */
  const onShiftCount = useMemo(() => staff.filter((s) => s.shift_status === "ON_SHIFT").length, [staff]);

  /* ───────────── shift: one click, reversible, so no confirmation, an undo instead ───────────── */
  const toggleShift = useCallback(
    (member: Staff) => {
      const apply = (m: Staff, undoable: boolean) =>
        run(async () => {
          const res = await toggleStaffShift(m.id, m.shift_status);
          if (res.success) {
            const next = m.shift_status === "ON_SHIFT" ? "OFF_SHIFT" : "ON_SHIFT";
            setStaff((prev) => prev.map((s) => (s.id === m.id ? { ...s, shift_status: next, is_present: next === "ON_SHIFT" } : s)));
            flash(
              "success",
              `${m.full_name} est désormais ${next === "ON_SHIFT" ? "en service" : "hors service"}.`,
              undoable ? { label: "Annuler", onClick: () => apply({ ...m, shift_status: next }, false) } : undefined
            );
          } else flash("danger", `Impossible de mettre à jour le service de ${m.full_name}.`);
        });
      apply(member, true);
    },
    [run, setStaff, flash]
  );

  /* ───────────── absence: confirmed, requests move within the service, undo restores both ───────────── */
  const markAbsent = useCallback(
    async (member: Staff) => {
      const res = await markStaffAbsentAndRedistribute(member.id);
      if (!res.success) return flash("danger", `Impossible de déclarer ${member.full_name} absent(e).`);
      const { previousShift, previousPresent, substituteId, movedTicketIds, unassignedCount } = res.data;
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: "OFF_SHIFT", is_present: false } : s)));
      const detail = movedTicketIds.length
        ? `${plural(movedTicketIds.length, "demande réassignée", "demandes réassignées")} dans son service.`
        : unassignedCount
          ? `Aucun collègue présent dans son service : ${plural(unassignedCount, "demande reste", "demandes restent")} à réassigner.`
          : "Aucune demande ouverte à réassigner.";
      const undo = () =>
        run(async () => {
          const back = await undoStaffAbsence(member.id, { shift: previousShift, present: previousPresent }, substituteId, movedTicketIds);
          if (back.success) {
            setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, shift_status: previousShift, is_present: previousPresent } : s)));
            flash("success", `Absence de ${member.full_name} annulée.`);
          } else flash("danger", `Impossible d’annuler l’absence de ${member.full_name}.`);
        });
      flash("success", `${member.full_name} déclaré(e) absent(e). ${detail}`, { label: "Annuler", onClick: undo });
    },
    [run, setStaff, flash]
  );

  const askAbsent = useCallback(
    (member: Staff) =>
      ask({
        title: "Déclarer absent",
        description: `Déclarer ${member.full_name} absent(e) aujourd’hui ? Ses demandes ouvertes passent à un collègue présent de son service.`,
        confirmLabel: "Déclarer absent",
        tone: "primary",
        action: () => markAbsent(member),
      }),
    [ask, markAbsent]
  );

  const askRemove = useCallback(
    (member: Staff) =>
      ask({
        title: "Retirer l’employé",
        description: `Retirer ${member.full_name} de l’annuaire du personnel ? Ses demandes deviendront non assignées. Cette action est irréversible.`,
        confirmLabel: "Retirer",
        pendingLabel: "Retrait en cours",
        tone: "danger",
        action: async () => {
          const res = await deleteStaffMember(member.id);
          if (res.success) {
            setStaff((prev) => prev.filter((s) => s.id !== member.id));
            flash("success", `${member.full_name} a été retiré(e) de l’annuaire.`);
          } else flash("danger", `Impossible de retirer ${member.full_name}.`);
        },
      }),
    [ask, setStaff, flash]
  );

  /* ───────────── add / edit (one form) + anonymise ───────────── */
  const [form, setForm] = useState<{ open: boolean; member: Staff | null }>({ open: false, member: null });
  const openCreate = useCallback(() => setForm({ open: true, member: null }), []);
  const openEdit = useCallback((member: Staff) => setForm({ open: true, member }), []);
  const setFormOpen = useCallback((open: boolean) => setForm((f) => ({ ...f, open })), []);

  // Privacy policy: a former employee's record can be anonymised from the staff space.
  const askAnonymize = useCallback(
    (member: Staff) => {
      setForm((f) => ({ ...f, open: false }));
      ask({
        title: "Anonymiser la fiche",
        description: `Remplacer le nom de ${member.full_name} par « Ancien collaborateur » et effacer son téléphone ? L’historique des demandes est conservé. Cette action est irréversible.`,
        confirmLabel: "Anonymiser",
        pendingLabel: "Anonymisation",
        tone: "danger",
        action: async () => {
          const res = await anonymizeStaffRecord(member.id);
          if (res.success) {
            setStaff((prev) =>
              prev.map((s) => (s.id === member.id ? { ...s, full_name: "Ancien collaborateur", phone_number: "", shift_status: "OFF_SHIFT", is_present: false } : s))
            );
            flash("success", "La fiche a été anonymisée.");
          } else flash("danger", `Impossible d’anonymiser la fiche de ${member.full_name}.`);
        },
      });
    },
    [ask, setStaff, flash]
  );

  const save = (input: NewStaffInput) =>
    runForResult(async () => {
      const member = form.member;
      if (member) {
        const res = await updateStaffMember(member.id, { ...input, phone_number: input.phone_number ?? "" });
        if (res.success) {
          setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, ...input, phone_number: input.phone_number ?? "" } : s)));
          setFormOpen(false);
          flash("success", `La fiche de ${input.full_name} a été mise à jour.`);
        } else flash("danger", res.error || `Impossible de mettre à jour la fiche de ${member.full_name}.`);
        return Boolean(res.success);
      }
      const res = await createStaffMember({ ...input, shift_status: "ON_SHIFT" });
      if (res.success) {
        setFormOpen(false);
        flash("success", `${input.full_name} a été ajouté(e) à l’annuaire.`);
      } else flash("danger", res.error || "Impossible d’ajouter l’employé.");
      return Boolean(res.success);
    });

  const formElement = (
    <StaffFormSheet
      key={`staff-${form.member?.id ?? "new"}`}
      open={form.open}
      onOpenChange={setFormOpen}
      member={form.member}
      departments={departmentOptions}
      pending={isPending}
      onSubmit={save}
      onAnonymize={askAnonymize}
    />
  );

  return { staff, onShiftCount, toggleShift, askAbsent, askRemove, openCreate, openEdit, formElement };
}
