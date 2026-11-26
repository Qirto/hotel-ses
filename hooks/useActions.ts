"use client";

import { useCallback, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { isOffline, OFFLINE_MESSAGE } from "@/lib/connection";
import { useFlash, type Flash } from "@/components/app/notice";

/**
 * Local copy of a prop: optimistic edits show instantly, a new prop value (server
 * refresh) replaces them. Synced during render (React's "adjust state when a prop
 * changes"), so the replaced value never paints. `value` must keep its identity
 * between renders (server data, a constant or a memo): a fresh array each render
 * would reset the copy every time.
 */
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(value);
  const [synced, setSynced] = useState<T>(value);
  if (value !== synced) {
    setSynced(value);
    setState(value);
  }
  return [state, setState];
}

export interface Actions {
  /** A server action is running. */
  isPending: boolean;
  /** Runs a server action; refused while offline, recovers if the connection drops mid-request. */
  run: (action: () => Promise<void>) => void;
  /** `run` for forms: resolves `true` when the action succeeded (the form then resets). */
  runForResult: (action: () => Promise<boolean>) => Promise<boolean>;
  flash: Flash;
}

/**
 * How every screen runs server actions. Offline: refused up front, so no optimistic
 * change is shown for something never sent. Connection lost mid-request: say so and
 * refetch, so the screen shows the real state. Needs the app's NoticeProvider.
 */
export function useActions(): Actions {
  const flash = useFlash();
  const router = useRouter();
  const [isPending, startAction] = useTransition();

  const lostConnection = useCallback(() => {
    flash("danger", "Connexion perdue. La modification n’a peut-être pas été enregistrée ; affichage des données les plus récentes.");
    router.refresh();
  }, [flash, router]);

  const run = useCallback(
    (action: () => Promise<void>) => {
      if (isOffline()) return flash("danger", OFFLINE_MESSAGE);
      startAction(async () => {
        try {
          await action();
        } catch {
          lostConnection();
        }
      });
    },
    [flash, lostConnection]
  );

  const runForResult = useCallback(
    (action: () => Promise<boolean>) => {
      if (isOffline()) {
        flash("danger", OFFLINE_MESSAGE);
        return Promise.resolve(false);
      }
      return new Promise<boolean>((resolve) =>
        startAction(async () => {
          try {
            resolve(await action());
          } catch {
            lostConnection();
            resolve(false);
          }
        })
      );
    },
    [flash, lostConnection]
  );

  return { isPending, run, runForResult, flash };
}
