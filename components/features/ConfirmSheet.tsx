"use client";

import type { ReactNode } from "react";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Button } from "@/components/ui/button";

/** Confirmation step for a consequential action. Cannot be dismissed while the action runs. */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = "Updating",
  tone = "primary",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  /** "danger" for destructive actions. */
  tone?: "primary" | "danger";
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && !pending && onCancel()}
      title={title}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={pending} className="justify-center">
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={pending}
            loadingText={pendingLabel}
            className="justify-center"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-fg-secondary">{description}</p>
    </ResponsiveSheet>
  );
}
