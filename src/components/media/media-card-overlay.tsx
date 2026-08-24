import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Bottom overlay + caption styles for photo cards (mobile-readable). */
export function MediaCardScrim({
  strong = false,
  className,
}: {
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        strong ? "media-scrim-strong" : "media-scrim",
        className,
      )}
    />
  );
}

export function MediaCardCaption({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-[1] p-4 pt-14 sm:p-6 sm:pt-20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function mediaTitleClass(size: "sm" | "md" | "lg" = "md") {
  return cn(
    "media-caption font-display font-semibold leading-snug tracking-tight",
    size === "sm" && "text-lg sm:text-xl",
    size === "md" && "text-lg sm:text-2xl",
    size === "lg" && "text-xl sm:text-3xl",
  );
}

export function mediaBodyClass() {
  return "media-caption-muted mt-1.5 line-clamp-2 text-sm leading-relaxed sm:text-[0.95rem]";
}

export function mediaMetaClass() {
  return "media-caption-muted mt-2 text-xs font-semibold tracking-wide sm:mt-2.5 sm:text-sm";
}
