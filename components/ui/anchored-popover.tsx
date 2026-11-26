"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PopoverCloseReason = "escape" | "outside";

const MARGIN = 8; // keep this far from the viewport edge
const GAP = 6; // between trigger and popover
const PHONE = "(max-width: 639px)";

/**
 * Popover anchored to a trigger, rendered in a portal on <body> so no
 * `overflow` ancestor (sheets, tables, cards) can clip it.
 *
 * - Opens below, flips above when there is more room there, clamps to the
 *   viewport horizontally and caps its height to the space it has.
 * - Follows the trigger on scroll / resize / content size changes.
 * - Escape and outside clicks close it without reaching a parent sheet.
 * - `dockOnPhone` docks it to the bottom edge on phones (large pickers).
 *
 * Positioning writes straight to the DOM, so moving it never re-renders React.
 * Nothing is mounted or listened to until the first open.
 */
export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  className,
  matchWidth = false,
  align = "start",
  dockOnPhone = false,
  ...rest
}: {
  open: boolean;
  onClose: (reason: PopoverCloseReason) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  /** At least as wide as the trigger (selects). */
  matchWidth?: boolean;
  align?: "start" | "end";
  dockOnPhone?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className" | "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag">) {
  const popRef = React.useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = React.useState(false);
  if (open && !rendered) setRendered(true);

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  const place = React.useCallback(() => {
    const a = anchorRef.current;
    const p = popRef.current;
    if (!a || !p) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const s = p.style;

    if (dockOnPhone && window.matchMedia(PHONE).matches) {
      s.left = `${MARGIN}px`;
      s.right = `${MARGIN}px`;
      s.top = "auto";
      s.bottom = `calc(${MARGIN}px + env(safe-area-inset-bottom))`;
      s.minWidth = "";
      s.maxHeight = `${vh - MARGIN * 2}px`;
      s.transformOrigin = "bottom center";
      s.visibility = "visible";
      return;
    }

    const r = a.getBoundingClientRect();
    s.right = "auto";
    s.bottom = "auto";
    s.minWidth = matchWidth ? `${Math.min(r.width, vw - MARGIN * 2)}px` : "";
    const w = p.offsetWidth; // offset* ignores the scale animation
    // Natural height without lifting the current cap: clearing max-height to measure
    // would leave nothing to scroll for a moment and reset the list to its top.
    const h = p.scrollHeight + (p.offsetHeight - p.clientHeight);

    const below = vh - r.bottom - GAP - MARGIN;
    const above = r.top - GAP - MARGIN;
    const down = below >= h || below >= above;
    const room = Math.max(120, down ? below : above);
    const height = Math.min(h, room);

    const left = Math.min(Math.max(align === "end" ? r.right - w : r.left, MARGIN), vw - w - MARGIN);
    s.left = `${Math.max(MARGIN, left)}px`;
    s.top = `${down ? r.bottom + GAP : r.top - GAP - height}px`;
    s.maxHeight = `${room}px`;
    s.transformOrigin = `${align === "end" ? "right" : "left"} ${down ? "top" : "bottom"}`;
    s.visibility = "visible";
  }, [anchorRef, align, matchWidth, dockOnPhone]);

  React.useLayoutEffect(() => {
    if (!open) return;
    place();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    // Scrolling the page or a sheet moves the trigger; scrolling the list itself does not.
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      schedule();
    };
    const ro = new ResizeObserver(schedule);
    if (popRef.current) ro.observe(popRef.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, true);

    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onCloseRef.current("outside");
    };
    // Capture on window: runs before a parent sheet's Escape handler, which we stop.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onCloseRef.current("escape");
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, place, anchorRef]);

  if (!rendered) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popRef}
          {...rest}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
          transition={{ type: "spring", stiffness: 560, damping: 40, mass: 0.6 }}
          // Portal events still bubble through the React tree: keep drags and
          // sheet handlers from reacting to taps inside the popover.
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", visibility: "hidden", top: 0, left: 0 }}
          className={cn(
            "z-[70] overflow-y-auto overscroll-y-contain rounded-xl border border-border-strong bg-surface text-fg shadow-float",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
