"use client";

import { useCallback, useState } from "react";
import { ConfirmSheet } from "@/components/features/ConfirmSheet";
import type { PortalState } from "./usePortalState";

/** One confirmation step for any consequential action: what to say, and what to run. */
export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  tone: "primary" | "danger";
  action: () => Promise<void>;
};

export type PortalRunner = Pick<PortalState<string>, "run" | "runForResult" | "flash" | "isPending">;

/**
 * A portal's confirmation step, shared by every feature that needs one (absence,
 * deletions, anonymisation, accounts…). `ask(request)` opens it; render `element`
 * once. The action runs through the portal's `run` (offline guard, pending state).
 */
export function useConfirm({ run, isPending }: Pick<PortalRunner, "run" | "isPending">) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const cancel = useCallback(() => setRequest(null), []);
  const ask = useCallback((r: ConfirmRequest) => setRequest(r), []);

  const element = (
    <ConfirmSheet
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description ?? ""}
      confirmLabel={request?.confirmLabel ?? ""}
      pendingLabel={request?.pendingLabel}
      tone={request?.tone}
      pending={isPending}
      onConfirm={() => {
        if (!request) return;
        const { action } = request;
        run(async () => {
          await action();
          setRequest(null);
        });
      }}
      onCancel={cancel}
    />
  );

  return { ask, cancel, element };
}
