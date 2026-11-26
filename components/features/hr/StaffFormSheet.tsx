"use client";

import { INPUT_ICON } from "@/lib/styles";
import { useId, useState } from "react";
import { EyeOff, Phone, Save, UserPlus } from "lucide-react";
import type { Staff } from "@/utils/roomsData";
import { ResponsiveSheet, SheetActions } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/features/Forms";
import { ROLE_OPTIONS, staffDepartment, type NewStaffInput } from "./staff";

/**
 * Create or edit an employee record: one form for both. Pass `member` to edit it.
 * Owns its form state (typing never re-renders the portal); render it with
 * `key={member?.id ?? "new"}` so each record opens with its own values.
 */
export function StaffFormSheet({
  open,
  onOpenChange,
  member,
  departments,
  pending,
  onSubmit,
  onAnonymize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The employee being edited; null or omitted to create one. */
  member?: Staff | null;
  departments: { value: string; label: string }[];
  pending: boolean;
  onSubmit: (input: NewStaffInput) => Promise<boolean>;
  /** Edit mode: anonymise the record (asks for confirmation). */
  onAnonymize?: (member: Staff) => void;
}) {
  const id = useId();
  const editing = Boolean(member);
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [role, setRole] = useState(member?.role ?? "receptionist");
  const [department, setDepartment] = useState(member ? staffDepartment(member) : "RECEPTION");
  const [phone, setPhone] = useState(member?.phone_number ?? "");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Modifier la fiche" : "Ajouter un employé"}
      description={
        editing ? `Mettez à jour les informations de ${member?.full_name}.` : "Créez la fiche de l’employé. Les nouveaux employés commencent en service."
      }
      footer={
        <SheetActions onCancel={() => onOpenChange(false)}>
          <Button
            type="submit"
            form={`${id}-form`}
            variant="primary"
            isLoading={pending}
            loadingText="Enregistrement"
            leftIcon={editing ? <Save className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
            className="justify-center"
          >
            {editing ? "Enregistrer" : "Créer la fiche"}
          </Button>
        </SheetActions>
      }
    >
      <form
        id={`${id}-form`}
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const name = fullName.trim();
          if (!name) return;
          const ok = await onSubmit({ full_name: name, role, department, phone_number: phone.trim() || undefined });
          if (ok && !editing) {
            setFullName("");
            setPhone("");
          }
        }}
      >
        <Field label="Nom complet" htmlFor={`${id}-name`}>
          <TextInput id={`${id}-name`} required autoComplete="off" placeholder="ex. Sami Ben Ali" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fonction" htmlFor={`${id}-role`}>
            <Select id={`${id}-role`} value={role} options={ROLE_OPTIONS} onChange={setRole} />
          </Field>
          <Field label="Service" htmlFor={`${id}-dept`}>
            <Select id={`${id}-dept`} value={department} options={departments} onChange={setDepartment} />
          </Field>
        </div>
        <Field label="Numéro de téléphone" htmlFor={`${id}-phone`} hint="Facultatif">
          <div className="relative">
            <Phone className={INPUT_ICON} aria-hidden />
            <TextInput id={`${id}-phone`} type="tel" placeholder="+216 20 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
          </div>
        </Field>
        {member && onAnonymize && (
          <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">Anonymiser la fiche</p>
              <p className="text-xs text-fg-muted">Pour un ancien collaborateur : efface son nom et son téléphone, garde l’historique.</p>
            </div>
            <Button type="button" variant="destructive" size="touch" onClick={() => onAnonymize(member)} disabled={pending} leftIcon={<EyeOff className="size-4" aria-hidden />} className="shrink-0 justify-center">
              Anonymiser
            </Button>
          </div>
        )}
      </form>
    </ResponsiveSheet>
  );
}
