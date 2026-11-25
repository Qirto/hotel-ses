"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Re-renders the current route (router.refresh) whenever any row changes in
 * the given public tables. No-op when the app is running on fallback data.
 */
export function useRealtimeRefresh(channelName: string, tables: readonly string[], enabled: boolean) {
  const router = useRouter();
  // Stable dependency for the effect, so callers can pass an inline array.
  const tableKey = tables.join(",");

  useEffect(() => {
    if (!enabled || !tableKey) return;
    const supabase = createClient();
    let channel = supabase.channel(channelName);
    for (const table of tableKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        router.refresh();
      });
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, tableKey, enabled, router]);
}
