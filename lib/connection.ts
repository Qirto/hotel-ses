"use client";

import { useSyncExternalStore } from "react";

/**
 * Connection state shared by the whole app, so staff never act on data that
 * silently stopped updating.
 *
 * - `useOnline`: the browser's network state. `false` is reliable; `true` only
 *   means "has a network", so realtime state is tracked separately.
 * - `useRealtimeState`: the Supabase realtime channel of the open portal.
 */

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Read outside React (action guards). */
export const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

export type RealtimeState = "idle" | "live" | "reconnecting";

let realtime: RealtimeState = "idle";
const listeners = new Set<() => void>();

export function setRealtimeState(next: RealtimeState): void {
  if (next === realtime) return;
  realtime = next;
  listeners.forEach((l) => l());
}

const subscribeRealtime = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

export function useRealtimeState(): RealtimeState {
  return useSyncExternalStore(subscribeRealtime, () => realtime, () => "idle");
}

export const OFFLINE_MESSAGE = "Vous êtes hors ligne. Rien n’a été enregistré. Réessayez une fois la connexion rétablie.";
