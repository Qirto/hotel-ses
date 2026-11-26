"use client";

import { useTransition } from "react";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";
import { signOutToLogin } from "@/lib/session";
import { useRouter } from "next/navigation";
import { PORTALS, type PortalRole } from "@/lib/portals";

interface Props {
  requiredRole: PortalRole;
  currentRole: PortalRole | null;
}

export default function AccessDenied({ requiredRole, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const required = PORTALS[requiredRole].name;
  const current = currentRole ? PORTALS[currentRole].name : null;

  return (
    <StatusScreen
      icon={<ShieldAlert />}
      tone="danger"
      title="No access to this workspace"
      actions={
        <>
          {currentRole && currentRole !== requiredRole && (
            <Button variant="primary" size="lg" onClick={() => router.push(PORTALS[currentRole].path)} leftIcon={<ArrowLeft className="size-4" aria-hidden />} className="w-full justify-center">
              Go to {current}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            isLoading={isPending}
            loadingText="Signing out"
            onClick={() => startTransition(() => signOutToLogin())}
            leftIcon={<LogOut className="size-4" aria-hidden />}
            className="w-full justify-center"
          >
            Sign in with another passcode
          </Button>
        </>
      }
    >
      <p>
        This page is for <strong className="font-semibold text-fg">{required}</strong> staff.
      </p>
      <p className="mt-1">{current ? `You are signed in as ${current}.` : "You are not signed in."}</p>
    </StatusScreen>
  );
}
