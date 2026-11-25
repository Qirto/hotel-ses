"use client";

import { useId, useState } from "react";
import { Phone, UserPlus } from "lucide-react";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/features/Forms";
import { ROLE_OPTIONS, type NewStaffInput } from "./staff";

/** Add-employee sheet. Owns its form state, so typing never re-renders the portal. */
export function AddStaffSheet({
  open,
  onOpenChange,
  departments,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { value: string; label: string }[];
  pending: boolean;
  onSubmit: (input: NewStaffInput) => Promise<boolean>;
}) {
  const id = useId();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("receptionist");
  const [department, setDepartment] = useState("RECEPTION");
  const [phone, setPhone] = useState("");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add employee"
      description="Create a staff profile. New employees start on shift."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="justify-center">
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} variant="primary" isLoading={pending} loadingText="Saving" leftIcon={<UserPlus className="size-4" aria-hidden />} className="justify-center">
            Create profile
          </Button>
        </div>
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
          if (ok) {
            setFullName("");
            setPhone("");
          }
        }}
      >
        <Field label="Full name" htmlFor={`${id}-name`}>
          <TextInput id={`${id}-name`} required autoComplete="off" placeholder="e.g. Marc Vance" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor={`${id}-role`}>
            <Select id={`${id}-role`} value={role} options={ROLE_OPTIONS} onChange={(e) => setRole(e.target.value)} />
          </Field>
          <Field label="Department" htmlFor={`${id}-dept`}>
            <Select id={`${id}-dept`} value={department} options={departments} onChange={(e) => setDepartment(e.target.value)} />
          </Field>
        </div>
        <Field label="Phone number" htmlFor={`${id}-phone`} hint="Optional">
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <TextInput id={`${id}-phone`} type="tel" placeholder="+33 6 12 34 56 78" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
          </div>
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
