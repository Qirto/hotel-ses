"use client";

import type { ReactNode } from "react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MD_UP, useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Sticky action row under the scrolling body. */
  footer?: ReactNode;
  /** Desktop modal width; mobile is always full width. */
  size?: "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
}

const DESKTOP_WIDTH = {
  md: "max-w-[28rem]",
  lg: "max-w-[40rem]",
  xl: "max-w-[56rem]",
} as const;

/** easyui Sheet: bottom sheet on phones, a centred modal dialog from md up. */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  className,
  children,
}: ResponsiveSheetProps) {
  const desktop = useMediaQuery(MD_UP);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "center" : "bottom"}
        className={cn(
          "border-border bg-surface text-fg",
          desktop ? DESKTOP_WIDTH[size] : "max-h-[92dvh] max-w-none pb-[var(--safe-bottom)]",
          className
        )}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && <SheetDescription className="text-fg-muted">{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="px-4 py-4 md:px-6">
          {children}
        </SheetBody>
        {footer && <SheetFooter className="border-border px-4 md:px-6">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

/** Sheet footer: Cancel plus the primary action; stacked on phones (primary on top), a row from sm.
 *  `secondary` (e.g. Delete) sits apart: at the far left from sm, at the bottom on phones. */
export function SheetActions({
  onCancel,
  cancelDisabled,
  secondary,
  children,
}: {
  onCancel: () => void;
  cancelDisabled?: boolean;
  secondary?: ReactNode;
  /** The primary button. */
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      {secondary && <div className="sm:mr-auto">{secondary}</div>}
      <Button variant="outline" onClick={onCancel} disabled={cancelDisabled} className="justify-center">
        Annuler
      </Button>
      {children}
    </div>
  );
}
