import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--panel-strong)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
}