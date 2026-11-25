import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card surface used for every section of every portal. */
export function Panel({
  title,
  description,
  actions,
  icon,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn("min-w-0 rounded-xl border border-border bg-surface shadow-card", className)}>
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-3.5 md:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-fg-muted [&>svg]:size-[18px]">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-semibold leading-6 tracking-tight">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 md:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Vertical rhythm for a portal view: same gaps everywhere. */
export function PageStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-4 md:gap-6", className)}>{children}</div>;
}

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {icon && <span className="grid size-10 place-items-center rounded-full bg-surface-hover text-fg-muted [&>svg]:size-5">{icon}</span>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
    </div>
  );
}
