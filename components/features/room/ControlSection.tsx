import type { ReactNode } from "react";

/** A titled block of room controls in the room detail (housekeeping, stay). */
export function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </section>
  );
}
