import { cn } from "@/lib/utils";

import type { BadgeTone } from "./admin-labels";

const toneClass: Record<BadgeTone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-amber-500/15 text-amber-700",
  danger: "border-transparent bg-destructive/15 text-destructive",
  info: "border-transparent bg-accent/15 text-accent",
  premium: "border-transparent bg-premium/20 text-premium-foreground",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
