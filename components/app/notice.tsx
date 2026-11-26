"use client";

import { createContext, useCallback, useContext, useRef, useState, type ComponentType, type ReactNode } from "react";
import { VelocityToast } from "@/components/ui/velocity-toast";

export type NoticeTone = "success" | "danger";
export type Flash = (tone: NoticeTone, text: string) => void;

type Notice = { id: number; tone: NoticeTone; text: string };

/** Errors stay longer: they usually need reading, and the countdown pauses on hover/focus. */
const DURATION: Record<NoticeTone, number> = { success: 4000, danger: 8000 };

/** Stable `flash` (never changes), so callers do not re-render when a message shows. */
const FlashContext = createContext<Flash>(() => {});

/**
 * Holds the one transient result message of a portal and shows it as an
 * easyui VelocityToast above everything (pages and open sheets alike).
 * Only this provider re-renders when a message changes; the portal does not.
 */
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);
  const nextId = useRef(0);

  const flash = useCallback<Flash>((tone, text) => {
    setNotice({ id: ++nextId.current, tone, text });
    setOpen(true);
  }, []);

  // keep the last message rendered while the toast animates out
  const dismiss = useCallback(() => setOpen(false), []);

  return (
    <FlashContext.Provider value={flash}>
      {children}
      <VelocityToast
        open={open && notice !== null}
        messageKey={notice?.id}
        title={notice?.text ?? ""}
        variant={notice?.tone === "danger" ? "error" : "success"}
        duration={DURATION[notice?.tone ?? "success"]}
        onDismiss={dismiss}
      />
    </FlashContext.Provider>
  );
}

/** Show a short success or error message. */
export function useFlash(): Flash {
  return useContext(FlashContext);
}

/** Wraps a portal view in its NoticeProvider (every portal needs one for `flash`). */
export function withNotices<P extends object>(View: ComponentType<P>) {
  function WithNotices(props: P) {
    return (
      <NoticeProvider>
        <View {...props} />
      </NoticeProvider>
    );
  }
  WithNotices.displayName = `withNotices(${View.displayName || View.name || "View"})`;
  return WithNotices;
}
