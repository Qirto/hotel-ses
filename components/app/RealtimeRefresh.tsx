"use client";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const TABLES = ["rooms", "reclamations", "staff", "departments"] as const;

/** One live-updates subscription for the whole app (mounted once by the app layout). */
export function RealtimeRefresh({ enabled }: { enabled: boolean }) {
  useRealtimeRefresh("realtime-app", TABLES, enabled);
  return null;
}
