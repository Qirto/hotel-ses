"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motionTransitions } from "@/lib/motion-tokens";
import { AnchoredPopover } from "./anchored-popover";

/*
 * easyui SpringSelect (Surajmaurya1/easyui/spring-select), adapted for Hotel SES:
 * - list rendered in a portal (never clipped by sheets or tables), flips/clamps to the viewport
 * - WAI-ARIA select-only combobox: focus stays on the trigger, arrows / Home / End /
 *   type-ahead move the active option, Enter / Space pick, Escape closes without closing the sheet
 * - 44px trigger, 16px text on phones (no iOS zoom), 40px options, token colours
 * - generic values (string or number), optional leading icon
 */

export interface SpringSelectOption<V extends string | number = string> {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SpringSelectProps<V extends string | number = string> {
  options: readonly SpringSelectOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  placeholder?: string;
  /** Visible label above the trigger. Use `aria-label` or an external <label htmlFor={id}> otherwise. */
  label?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Leading icon inside the trigger. */
  icon?: React.ReactNode;
  disabled?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
}

const nextEnabled = <V extends string | number>(options: readonly SpringSelectOption<V>[], from: number, step: 1 | -1) => {
  for (let i = from + step; i >= 0 && i < options.length; i += step) if (!options[i].disabled) return i;
  return from;
};

export function SpringSelect<V extends string | number = string>({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select…",
  label,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  icon,
  disabled = false,
  error,
  className,
  triggerClassName,
}: SpringSelectProps<V>) {
  const uid = React.useId();
  const triggerId = id ?? `${uid}-trigger`;
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<V | undefined>(defaultValue);
  const [active, setActive] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const typed = React.useRef({ text: "", at: 0 });

  const current = value !== undefined ? value : internal;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const show = (index = selectedIndex) => {
    if (disabled) return;
    setActive(index >= 0 && !options[index]?.disabled ? index : nextEnabled(options, -1, 1));
    setOpen(true);
  };

  const pick = (index: number) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    if (value === undefined) setInternal(opt.value);
    if (opt.value !== current) onChange?.(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // keep the active option visible while navigating
  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const typeAhead = (key: string) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 600 ? key : t.text + key;
    t.at = now;
    const start = open ? active : selectedIndex;
    const n = options.length;
    for (let k = 1; k <= n; k++) {
      const i = (start + (t.text.length > 1 ? k - 1 : k) + n) % n;
      const o = options[i];
      if (!o.disabled && o.label.toLowerCase().startsWith(t.text.toLowerCase())) return i;
    }
    return -1;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        show();
      } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const i = typeAhead(k);
        if (i >= 0) show(i);
      }
      return;
    }
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      setActive((i) => nextEnabled(options, i, k === "ArrowDown" ? 1 : -1));
    } else if (k === "Home" || k === "End") {
      e.preventDefault();
      setActive(k === "Home" ? nextEnabled(options, -1, 1) : nextEnabled(options, options.length, -1));
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      pick(active);
    } else if (k === "Tab") {
      setOpen(false);
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const i = typeAhead(k);
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      {label && (
        <label htmlFor={triggerId} className="mb-1.5 block text-sm font-medium text-fg-secondary">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          "focus-ring relative flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border bg-surface pr-9 text-left text-base transition-colors md:text-sm",
          icon ? "pl-9" : "pl-3",
          open ? "border-border-hover" : error ? "border-danger" : "border-border-strong hover:border-border-hover",
          disabled && "cursor-not-allowed opacity-50",
          selected ? "text-fg" : "text-fg-muted",
          triggerClassName
        )}
      >
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted [&>svg]:size-4" aria-hidden>
            {icon}
          </span>
        )}
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={motionTransitions.springSnappy}
          className="pointer-events-none absolute right-3 top-1/2 -mt-2 text-fg-muted"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnchoredPopover
        open={open}
        onClose={(reason) => {
          setOpen(false);
          if (reason === "escape") triggerRef.current?.focus();
        }}
        anchorRef={triggerRef}
        matchWidth
        id={listId}
        role="listbox"
        aria-labelledby={ariaLabelledBy ?? (label || !ariaLabel ? triggerId : undefined)}
        aria-label={ariaLabelledBy || label ? undefined : ariaLabel}
        className="max-w-[calc(100vw-1rem)] p-1"
        // keep focus on the trigger when clicking an option
        onMouseDown={(e) => e.preventDefault()}
      >
        {options.map((opt, i) => {
          const isSelected = i === selectedIndex;
          return (
            <div
              key={String(opt.value)}
              id={optionId(i)}
              role="option"
              aria-selected={isSelected}
              aria-disabled={opt.disabled || undefined}
              onPointerMove={() => !opt.disabled && active !== i && setActive(i)}
              onClick={() => pick(i)}
              className={cn(
                "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-base md:text-sm",
                isSelected ? "font-medium text-fg" : "text-fg-secondary",
                i === active && !opt.disabled && "bg-surface-hover text-fg",
                opt.disabled && "cursor-not-allowed opacity-40"
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{opt.label}</span>
                {opt.description && <span className="text-xs text-fg-muted">{opt.description}</span>}
              </span>
              {isSelected && <Check className="size-4 shrink-0 text-fg" aria-hidden />}
            </div>
          );
        })}
      </AnchoredPopover>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
