import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";

/** A navigation link that looks exactly like Button (same variants and sizes). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  leftIcon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; leftIcon?: ReactNode }) {
  return (
    <Link {...props} className={buttonClasses({ variant, size, fullWidth, className })}>
      {leftIcon}
      {children}
    </Link>
  );
}
