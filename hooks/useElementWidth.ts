"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Width of an element, kept current with a ResizeObserver. Shared by the
 * data table and the charts.
 *
 * - Hidden elements (inactive tab, `display: none`) measure 0: that is ignored and
 *   the last real width kept, so switching views never re-lays out hidden content.
 * - A new width is applied synchronously inside the observer callback, which runs
 *   after layout and before paint. A view shown for the first time therefore paints
 *   at its real width, never one frame at `initial` (which overflowed narrow screens).
 * - `initial` is only the server-render / never-measured fallback.
 */
export function useElementWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => Math.round(el.clientWidth);

    const first = measure();
    if (first > 0) setWidth(first);

    const ro = new ResizeObserver(() => {
      const w = measure();
      if (w > 0) flushSync(() => setWidth(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
