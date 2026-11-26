import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { House, SearchX } from "lucide-react";
import { StatusScreen } from "@/components/app/StatusScreen";

export const metadata: Metadata = { title: "Page not found · Hotel SES" };

/** 404 for unknown URLs (and `notFound()` calls). */
export default function NotFound() {
  return (
    <StatusScreen
      icon={<SearchX />}
      title="Page not found"
      actions={
        <ButtonLink href="/" size="lg" fullWidth leftIcon={<House className="size-4" aria-hidden />}>
          Back to my workspace
        </ButtonLink>
      }
    >
      <p>This address does not exist in Hotel SES. It may have been mistyped or moved.</p>
    </StatusScreen>
  );
}
