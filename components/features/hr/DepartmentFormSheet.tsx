"use client";

import { useId, useState } from "react";
import { Building2, Save } from "lucide-react";
import type { Department } from "@/utils/roomsData";
import { ResponsiveSheet, SheetActions } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/features/Forms";

export type DepartmentInput = { name: string; head_of_department: string; description: string };

/**
 * Create or edit a hotel department (service). Pass `department` to edit it; render
 * with `key={department?.id ?? "new"}` so each record opens with its own values.
 * The code stored on staff and requests is derived from the name at creation and
 * never changes, so renaming is safe.
 */
export function DepartmentFormSheet({
  open,
  onOpenChange,
  department,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  pending: boolean;
  onSubmit: (input: DepartmentInput) => Promise<boolean>;
}) {
  const id = useId();
  const editing = Boolean(department);
  const [name, setName] = useState(department?.name ?? "");
  const [head, setHead] = useState(department?.head_of_department ?? "");
  const [description, setDescription] = useState(department?.description ?? "");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Modifier le service" : "Ajouter un service"}
      description={editing ? `Mettez à jour les informations du service ${department?.name}.` : "Créez un service de l’hôtel. Vous pourrez ensuite y rattacher des employés."}
      footer={
        <SheetActions onCancel={() => onOpenChange(false)}>
          <Button
            type="submit"
            form={`${id}-form`}
            variant="primary"
            isLoading={pending}
            loadingText="Enregistrement"
            leftIcon={editing ? <Save className="size-4" aria-hidden /> : <Building2 className="size-4" aria-hidden />}
            className="justify-center"
          >
            {editing ? "Enregistrer" : "Créer le service"}
          </Button>
        </SheetActions>
      }
    >
      <form
        id={`${id}-form`}
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await onSubmit({ name: name.trim(), head_of_department: head.trim(), description: description.trim() });
        }}
      >
        <Field label="Nom du service" htmlFor={`${id}-name`}>
          <TextInput id={`${id}-name`} required autoComplete="off" placeholder="ex. Blanchisserie" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Responsable" htmlFor={`${id}-head`} hint="Facultatif">
          <TextInput id={`${id}-head`} autoComplete="off" placeholder="ex. Leïla Haddad" value={head} onChange={(e) => setHead(e.target.value)} />
        </Field>
        <Field label="Missions" htmlFor={`${id}-desc`} hint="Facultatif">
          <TextArea id={`${id}-desc`} placeholder="Ce que gère ce service" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
