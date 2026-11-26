"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { watchTheme } from "@/lib/theme";

/**
 * App-wide client setup: keeps the theme in sync with the device and other tabs
 * (preference lives in lib/theme), and makes Framer Motion follow the OS
 * "reduce motion" setting.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => watchTheme(), []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
