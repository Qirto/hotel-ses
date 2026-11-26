/** Button look (variants, sizes) as plain classes: usable by server and client components. */
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'link'
  | 'gradient';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'touch';

export const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 shadow-xs border border-transparent font-medium cursor-pointer',
  // Hotel SES: primary actions use the brand tokens (easyui monochrome: black/white).
  primary:
    'bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)] shadow-xs border border-transparent font-semibold cursor-pointer',
  secondary:
    'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] cursor-pointer',
  outline:
    'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] cursor-pointer',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent cursor-pointer',
  destructive:
    'bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500 hover:text-white cursor-pointer',
  success:
    'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-pointer',
  link:
    'bg-transparent text-[var(--text-primary)] underline-offset-4 hover:underline p-0 h-auto border-0 focus-ring shadow-none inline-flex cursor-pointer',
  gradient:
    'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] relative overflow-hidden cursor-pointer',
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4.5 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
  icon: 'h-10 w-10 p-0 rounded-lg justify-center shrink-0',
  /** Square 32px icon button, the height of `sm`: edit / delete in list rows. */
  'icon-sm': 'h-8 w-8 p-0 rounded-md justify-center shrink-0',
  /** Compact 40px action for rows, cards and tickets. */
  touch: 'h-10 px-3 text-sm rounded-lg gap-1.5',
};

/** Hotel SES: Button's look as classes, shared with ButtonLink (links styled as buttons). */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(
    // whitespace-nowrap: a label never wraps onto several lines (rows stay one line tall).
    'relative inline-flex items-center justify-center whitespace-nowrap font-medium select-none focus-ring transition-colors duration-150',
    variantStyles[variant],
    variant !== 'link' && sizeStyles[size],
    fullWidth && 'w-full',
    className
  );
}

