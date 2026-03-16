import type { ButtonHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent-strong)] text-[var(--accent-contrast)] shadow-[0_18px_36px_rgba(37,99,235,0.24)] hover:bg-[var(--accent-stronger)]",
  secondary:
    "bg-[var(--panel-strong)] text-[var(--foreground)] hover:bg-[var(--panel-stronger)]",
  ghost:
    "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90"
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}