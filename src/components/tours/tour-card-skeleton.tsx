import { Skeleton } from "@/components/ui/skeleton";

export function TourCardSkeleton({ layout = "row" }: { layout?: "row" | "grid" }) {
  return (
    <div
      className={
        layout === "row"
          ? "surface-card grid overflow-hidden sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
          : "surface-card flex flex-col overflow-hidden"
      }
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-end justify-between pt-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
