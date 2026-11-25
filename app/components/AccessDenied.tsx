"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/app/StatusScreen";
import { signOutToLogin } from "@/lib/session";

interface Props {
  requiredRole: "reception" | "rh" | "gm";
  currentRole: string | null;
}

const ROLE_NAMES: Record<string, string> = {
  reception: "Reception",
  rh: "Human Resources",
  gm: "General Manager",
};

export default function AccessDenied({ requiredRole, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const required = ROLE_NAMES[requiredRole] ?? requiredRole;
  const current = currentRole ? ROLE_NAMES[currentRole] ?? currentRole : null;

  return (
    <StatusScreen
      icon={<ShieldAlert />}
      tone="danger"
      title="No access to this workspace"
      actions={
        <>
          {currentRole && currentRole !== requiredRole && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/${currentRole}`)}
              leftIcon={<ArrowLeft className="size-4" aria-hidden />}
              className="w-full justify-center"
            >
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
