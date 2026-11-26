"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { setRealtimeState } from "@/lib/connection";

/**
 * Keeps the open portal in sync with the database:
 * - re-renders the route (router.refresh) whenever a row changes in `tables`;
 * - reports the channel state, so the shell can warn when live updates stop;
 * - refetches everything once the channel or the network comes back, so changes
 *   missed while disconnected are never left out.
 * No-op when the app is running on fallback data.
 */
export function useRealtimeRefresh(channelName: string, tables: readonly string[], enabled: boolean) {
  const router = useRouter();
  // Stable dependency for the effect, so callers can pass an inline array.
  const tableKey = tables.join(",");

  useEffect(() => {
    if (!enabled || !tableKey) return;
    const supabase = createClient();
    let disposed = false;
    let wasDown = false;

    let channel = supabase.channel(channelName);
    for (const table of tableKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        router.refresh();
      });
    }
    channel.subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        setRealtimeState("live");
        if (wasDown) router.refresh(); // catch up on what changed while disconnected
        wasDown = false;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        wasDown = true;
        setRealtimeState("reconnecting");
      }
    });

    const onOnline = () => router.refresh();
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      setRealtimeState("idle");
      supabase.removeChannel(channel);
    };
  }, [channelName, tableKey, enabled, router]);
}
