"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** "icon" = square icon button; "full" = full-width row with a label (sidebar). */
  variant?: "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  const Icon = isDark ? Sun : Moon;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className={cn(
          "focus-ring flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
          className
        )}
      >
        <span className="grid size-5 shrink-0 place-items-center">
          <Icon className="size-[18px] text-brand" aria-hidden />
        </span>
        <span className="flex-1 truncate text-left">{isDark ? "Light mode" : "Dark mode"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring grid size-11 place-items-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
        className
      )}
    >
      <Icon className="size-[18px] text-brand" aria-hidden />
    </button>
  );
}
