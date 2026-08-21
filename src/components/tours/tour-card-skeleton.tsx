import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TourCardSkeleton({ layout = "row" }: { layout?: "row" | "grid" }) {
  return (
    <div
      className={cn(
        "surface-card overflow-hidden",
        layout === "row"
          ? "grid sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"
          : "flex flex-col",
      )}
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className={cn("space-y-3", layout === "grid" ? "p-4" : "p-5")}>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-end justify-between pt-3">
          <Skeleton className="h-8 w-32" />
          {layout === "row" ? <Skeleton className="h-9 w-24" /> : null}
        </div>
      </div>
    </div>
  );
}
