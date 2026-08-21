import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyRating, getCompanyReviews } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/reviews")({
  head: () => ({ meta: [{ title: "Отзывы — TourGo" }] }),
  component: OperatorReviewsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function OperatorReviewsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);

  if (!allowed || !organization) return null;

  void state.companyReviews.length;
  const reviews = getCompanyReviews(organization.id);
  const rating = getCompanyRating(organization.id);

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Отзывы"
      subtitle="Что пишут туристы после поездки"
    >
      <div className="surface-card flex flex-wrap items-center gap-6 p-6">
        <div>
          <p className="text-sm text-muted-foreground">Средняя оценка</p>
          <p className="font-display text-4xl font-semibold">
            {rating ? rating.average.toFixed(1) : "—"}
          </p>
          <Stars value={rating?.average ?? 0} />
        </div>
        <div className="h-14 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Отзывов</p>
          <p className="font-display text-4xl font-semibold">{rating?.count ?? 0}</p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Оценку видят туристы в списке предложений: чем выше рейтинг, тем чаще выбирают вашу
          компанию.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <Star className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Отзывов пока нет. Турист сможет оставить отзыв после того, как выберет ваше предложение.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{r.authorName}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
              </div>
              <Stars value={r.rating} />
              <p className="mt-3 text-sm">{r.text}</p>
            </article>
          ))}
        </div>
      )}
    </DashShell>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="mt-1 flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= Math.round(value) ? "fill-premium text-premium" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
