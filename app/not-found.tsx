import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { House, SearchX } from "lucide-react";
import { StatusScreen } from "@/components/app/StatusScreen";

export const metadata: Metadata = { title: "Page introuvable · Hotel SES" };

/** 404 for unknown URLs (and `notFound()` calls). */
export default function NotFound() {
  return (
    <StatusScreen
      icon={<SearchX />}
      title="Page introuvable"
      actions={
        <ButtonLink href="/" size="lg" fullWidth leftIcon={<House className="size-4" aria-hidden />}>
          Retour à mon espace
        </ButtonLink>
      }
    >
      <p>Cette adresse n’existe pas dans Hotel SES. Elle a peut-être été mal saisie ou déplacée.</p>
    </StatusScreen>
  );
}
