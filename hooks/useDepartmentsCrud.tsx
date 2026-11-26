"use client";

import { useCallback, useMemo, useState } from "react";
import type { Department } from "@/utils/roomsData";
import { DepartmentFormSheet, type DepartmentInput } from "@/components/features/hr/DepartmentFormSheet";
import { createDepartment, deleteDepartment, updateDepartment } from "@/app/actions";
import { departmentLabel } from "@/lib/format";
import { useSyncedState } from "./useActions";
import type { ConfirmRequest, PortalRunner } from "./useConfirm";

/**
 * The hotel's services (departments): list, names and options for selects, and
 * add / edit / delete. Shared by the RH and Administration portals. The database is
 * the only source (no hard-coded fallback). Render `formElement` once.
 */
export function useDepartmentsCrud(p: PortalRunner, departmentsList: Department[], ask: (r: ConfirmRequest) => void) {
  const { runForResult, flash, isPending } = p;
  const [departments, setDepartments] = useSyncedState<Department[]>(departmentsList);

  const active = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((d) => ({ code: d.code, name: d.name })),
    [departments]
  );
  const name = useCallback((code?: string | null) => active.find((d) => d.code === code)?.name ?? departmentLabel(code), [active]);
  const codes = useMemo(() => active.map((d) => d.code), [active]);
  const options = useMemo(() => active.map((d) => ({ value: d.code, label: d.name })), [active]);
  const filterOptions = useMemo(() => [{ value: "ALL", label: "Tous les services" }, ...options], [options]);

  const [form, setForm] = useState<{ open: boolean; department: Department | null }>({ open: false, department: null });
  const openCreate = useCallback(() => setForm({ open: true, department: null }), []);
  const openEdit = useCallback((department: Department) => setForm({ open: true, department }), []);
  const setFormOpen = useCallback((open: boolean) => setForm((f) => ({ ...f, open })), []);

  const save = (input: DepartmentInput) =>
    runForResult(async () => {
      const department = form.department;
      if (department) {
        const res = await updateDepartment(department.id, input);
        if (res.success) {
          setDepartments((prev) => prev.map((d) => (d.id === department.id ? { ...d, ...input } : d)));
          setFormOpen(false);
          flash("success", `Le service ${input.name} a été mis à jour.`);
        } else flash("danger", res.error || `Impossible de mettre à jour le service ${department.name}.`);
        return Boolean(res.success);
      }
      const res = await createDepartment(input);
      if (res.success) {
        if (res.data) setDepartments((prev) => [...prev, res.data as Department]);
        setFormOpen(false);
        flash("success", `Le service ${input.name} a été créé.`);
      } else flash("danger", res.error || "Impossible de créer le service.");
      return Boolean(res.success);
    });

  const askRemove = useCallback(
    (department: Department) =>
      ask({
        title: "Supprimer le service",
        description: `Supprimer le service ${department.name} ? Les demandes déjà enregistrées gardent leur service. Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        pendingLabel: "Suppression",
        tone: "danger",
        action: async () => {
          const res = await deleteDepartment(department.id);
          if (res.success) {
            setDepartments((prev) => prev.filter((d) => d.id !== department.id));
            flash("success", `Le service ${department.name} a été supprimé.`);
          } else flash("danger", res.error || `Impossible de supprimer le service ${department.name}.`);
        },
      }),
    [ask, setDepartments, flash]
  );

  const formElement = (
    <DepartmentFormSheet
      key={`dept-${form.department?.id ?? "new"}`}
      open={form.open}
      onOpenChange={setFormOpen}
      department={form.department}
      pending={isPending}
      onSubmit={save}
    />
  );

  return { departments, active, name, codes, options, filterOptions, openCreate, openEdit, askRemove, formElement };
}
