"use client";

import { createContext, memo, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Notice } from "@/components/features/Forms";

export type NoticeTone = "success" | "danger";
export type Flash = (tone: NoticeTone, text: string) => void;

type NoticeState = { tone: NoticeTone; text: string } | null;

const NOTICE_MS = 3500;

/** Stable `flash` (never changes), so callers do not re-render when a message shows. */
const FlashContext = createContext<Flash>(() => {});
/** Current message; `undefined` means "no provider", so outlets render nothing. */
const NoticeContext = createContext<NoticeState | undefined>(undefined);

/**
 * Holds the one transient result message of a portal. Only `NoticeOutlet`s
 * re-render when it changes; the portal itself does not.
 */
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<NoticeState>(null);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback<Flash>((tone, text) => {
    setNotice({ tone, text });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <FlashContext.Provider value={flash}>
      <NoticeContext.Provider value={notice}>{children}</NoticeContext.Provider>
    </FlashContext.Provider>
  );
}

/** Show a short success or error message in every mounted outlet. */
export function useFlash(): Flash {
  return useContext(FlashContext);
}

/**
 * Where messages appear: `AppShell` renders one above the page content and
 * `ResponsiveSheet` one at the top of its body. The live region is always
 * mounted so screen readers announce new messages politely.
 */
export const NoticeOutlet = memo(function NoticeOutlet({ className }: { className?: string }) {
  const notice = useContext(NoticeContext);
  if (notice === undefined) return null;
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {notice && (
        <div className={className}>
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      )}
    </div>
  );
});
