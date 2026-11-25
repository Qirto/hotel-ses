import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-page centred message (offline, access denied, ...). */
export function StatusScreen({
  icon,
  tone = "neutral",
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  tone?: "neutral" | "danger" | "warning";
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-float sm:p-8">
        <span
          className={cn(
            "mx-auto mb-5 grid size-12 place-items-center rounded-full [&>svg]:size-6",
            tone === "danger" ? "bg-danger-subtle text-danger" : tone === "warning" ? "bg-warning-subtle text-warning" : "bg-surface-hover text-fg-muted"
          )}
          aria-hidden
        >
          {icon}
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</div>
        <div className="mt-6 flex flex-col gap-2">{actions}</div>
      </section>
    </main>
  );
}
