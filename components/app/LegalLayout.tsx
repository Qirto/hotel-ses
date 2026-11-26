import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Shared frame for /privacy and /tos: themed, readable line length, mobile padding. */
export function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="min-h-dvh px-4 pb-16 pt-[calc(1.5rem+var(--safe-top))] md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/login"
          className="focus-ring mb-8 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden /> Retour à la connexion
        </Link>
        <article className="legal-prose">{children}</article>
      </div>
    </main>
  );
}
