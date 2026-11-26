import { cn } from "@/lib/utils";

/** One placeholder block (pulses unless the user prefers reduced motion). */
function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-surface-hover motion-safe:animate-pulse", className)} />;
}

/**
 * Loading state for portal routes while the server loads rooms and tickets:
 * the shell's shape (sidebar, top bar, KPI row, panels), so nothing jumps when
 * the real page arrives. Announced to screen readers as busy.
 */
export function PortalSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <aside className="hidden w-[248px] shrink-0 flex-col gap-2 border-r border-border p-3 md:flex" aria-hidden>
        <div className="flex h-14 items-center gap-2.5 px-1">
          <Bone className="size-8" />
          <div className="flex flex-col gap-1.5">
            <Bone className="h-3 w-20" />
            <Bone className="h-2.5 w-32" />
          </div>
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-9" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col" aria-hidden>
        <div className="flex h-14 items-center border-b border-border px-4 md:px-6 lg:px-8">
          <Bone className="h-4 w-32" />
        </div>
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 pt-4 md:gap-6 md:px-6 md:pt-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <Bone className="h-72 rounded-xl" />
            <Bone className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Loading state for single-column pages (settings). */
export function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-20" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <Bone className="h-40 rounded-xl" />
      <Bone className="h-56 rounded-xl" />
    </div>
  );
}

/** Loading state inside the app shell (the shell stays on screen): KPI row and panels. */
export function ContentSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 md:gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Bone className="h-96 rounded-xl" />
    </div>
  );
}
