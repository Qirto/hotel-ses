"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motionTransitions } from "@/lib/motion-tokens";

/*
 * easyui VelocityToast (Surajmaurya1/easyui/velocity-toast), adapted for Hotel SES:
 * - the fixed container is a persistent polite live region, so every message is announced
 * - sits above open sheets (z-80), clears the safe area, full width on phones
 * - messages wrap instead of truncating; 14px text
 * - each new message restarts the countdown; hover or keyboard focus pauses it
 * - status colours from theme tokens
 */

export type VelocityToastVariant = "default" | "success" | "warning" | "error" | "info";
export type VelocityToastPosition = "top-center" | "bottom-center" | "bottom-right";

export interface VelocityToastProps {
  open: boolean;
  /** Change it to restart the countdown for a repeated message. */
  messageKey?: string | number;
  onDismiss?: () => void;
  title: string;
  description?: string;
  duration?: number;
  variant?: VelocityToastVariant;
  position?: VelocityToastPosition;
  showProgress?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const positionClasses: Record<VelocityToastPosition, string> = {
  "top-center": "inset-x-4 top-[calc(0.75rem+var(--safe-top,0px))] items-center sm:inset-x-0",
  "bottom-center": "inset-x-4 bottom-[calc(1.25rem+var(--safe-bottom,0px))] items-center sm:inset-x-0",
  "bottom-right": "inset-x-4 bottom-[calc(1.25rem+var(--safe-bottom,0px))] items-center sm:left-auto sm:right-5 sm:items-end",
};

const variantIcon = (variant: VelocityToastVariant, custom?: React.ReactNode) => {
  if (custom) return custom;
  switch (variant) {
    case "success":
      return <Check className="size-4 text-success" />;
    case "warning":
      return <AlertTriangle className="size-4 text-warning" />;
    case "error":
      return <AlertCircle className="size-4 text-danger" />;
    default:
      return <Info className="size-4 text-fg-secondary" />;
  }
};

export const VelocityToast: React.FC<VelocityToastProps> = ({
  open,
  onDismiss,
  messageKey,
  title,
  description,
  duration = 4000,
  variant = "default",
  position = "top-center",
  showProgress = true,
  icon,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(open);
  const [isPaused, setIsPaused] = useState(false);

  const progressMV = useMotionValue(100);
  const progressWidth = useTransform(progressMV, (v) => `${v}%`);

  const remainingRef = useRef<number>(duration);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // (Re)start on open and on every new message.
  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
    progressMV.set(100);
    remainingRef.current = duration;
    startRef.current = performance.now();
  }, [open, title, description, messageKey, duration, progressMV]);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    startRef.current = performance.now() - (duration - remainingRef.current);

    const tick = () => {
      const remaining = Math.max(0, duration - (performance.now() - startRef.current));
      remainingRef.current = remaining;
      progressMV.set(Math.pow(remaining / duration, 1.05) * 100);
      if (remaining <= 0) {
        setIsVisible(false);
        onDismiss?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible, isPaused, duration, progressMV, onDismiss, title, description, messageKey]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const isTop = position.startsWith("top");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn("pointer-events-none fixed z-[80] flex flex-col", positionClasses[position])}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: isTop ? -22 : 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, y: isTop ? -12 : 12 }}
            transition={motionTransitions.springSnappy}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            className={cn(
              "pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border border-border-strong bg-surface p-3.5 text-fg shadow-float sm:w-auto sm:min-w-[340px] sm:p-4",
              className
            )}
          >
            <div className="relative z-10 flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised" aria-hidden>
                {variantIcon(variant, icon)}
              </div>
              <div className="min-w-0 flex-1 self-center pr-1">
                <p className="text-sm font-medium text-fg">{title}</p>
                {description && <p className="mt-0.5 text-sm text-fg-secondary">{description}</p>}
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="focus-ring -mr-1 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                aria-label="Close notification"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {showProgress && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-border" aria-hidden>
                <motion.div className="h-full bg-fg" style={{ width: progressWidth }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
