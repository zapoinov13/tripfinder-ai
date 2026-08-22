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
        "absolute inset-x-0 bottom-0 z-[1] p-3 pt-12 sm:p-5 sm:pt-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function mediaTitleClass(size: "sm" | "md" | "lg" = "md") {
  return cn(
    "media-caption font-display font-semibold leading-snug",
    size === "sm" && "text-base sm:text-lg",
    size === "md" && "text-base sm:text-xl",
    size === "lg" && "text-lg sm:text-2xl",
  );
}

export function mediaBodyClass() {
  return "media-caption-muted mt-1 line-clamp-2 text-xs leading-snug sm:text-sm";
}

export function mediaMetaClass() {
  return "media-caption-muted mt-1.5 text-[11px] font-semibold tracking-wide sm:mt-2 sm:text-xs";
}
