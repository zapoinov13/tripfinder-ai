import { createFileRoute } from "@tanstack/react-router";
import { CornerDownRight, MessageSquare, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  getCompanyRating,
  getCompanyReviews,
  replyToCompanyReview,
} from "@/lib/platform/messages";
import type { CompanyReview } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/reviews")({
  head: () => ({ meta: [{ title: "Отзывы · TourGo" }] }),
  component: OperatorReviewsPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function OperatorReviewsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);

  if (!allowed || !organization || !user) return null;

  void state.companyReviews.length;
  const reviews = getCompanyReviews(organization.id);
  const rating = getCompanyRating(organization.id);
  const unanswered = reviews.filter((r) => !r.reply?.trim()).length;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Отзывы"
      subtitle="Отвечайте туристам публично: ответ виден на странице компании."
    >
      <div className="surface-card flex flex-wrap items-center gap-6 p-6">
        <div>
          <p className="text-sm text-muted-foreground">Средняя оценка</p>
          <p className="font-display text-4xl font-semibold">
            {rating ? rating.average.toFixed(1) : "нет"}
          </p>
          <Stars value={rating?.average ?? 0} />
        </div>
        <div className="h-14 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Отзывов</p>
          <p className="font-display text-4xl font-semibold">{rating?.count ?? 0}</p>
        </div>
        <div className="h-14 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Без ответа</p>
          <p
            className={cn(
              "font-display text-4xl font-semibold",
              unanswered > 0 ? "text-premium" : "text-success",
            )}
          >
            {unanswered}
          </p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Высокий рейтинг и вежливые ответы повышают доверие. Турист видит ответ под отзывом на
          вашей странице.
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
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              organizationId={organization.id}
              actorId={user.id}
              actorName={user.name}
            />
          ))}
        </div>
      )}
    </DashShell>
  );
}

function ReviewCard({
  review,
  organizationId,
  actorId,
  actorName,
}: {
  review: CompanyReview;
  organizationId: string;
  actorId: string;
  actorName: string;
}) {
  const [editing, setEditing] = useState(!review.reply?.trim());
  const [draft, setDraft] = useState(review.reply ?? "");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const text = draft.trim();
    if (!text) {
      toast.error("Напишите текст ответа");
      return;
    }
    setSaving(true);
    const updated = replyToCompanyReview({
      reviewId: review.id,
      organizationId,
      reply: text,
      actorId,
      actorName,
    });
    setSaving(false);
    if (!updated) {
      toast.error("Не удалось сохранить ответ");
      return;
    }
    setEditing(false);
    toast.success(review.reply ? "Ответ обновлён" : "Ответ опубликован");
  };

  return (
    <article className="surface-card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{review.authorName}</p>
          <p className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</p>
        </div>
        <Stars value={review.rating} />
        <p className="mt-3 text-sm leading-relaxed">{review.text}</p>
      </div>

      {review.reply && !editing ? (
        <div className="border-t border-border bg-secondary/30 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <CornerDownRight className="size-3.5" />
              Ответ компании
            </p>
            {review.replyAt ? (
              <p className="text-xs text-muted-foreground">{fmtDate(review.replyAt)}</p>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{review.reply}</p>
          {review.replyByName ? (
            <p className="mt-2 text-xs text-muted-foreground">{review.replyByName}</p>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 h-8 px-2"
            onClick={() => {
              setDraft(review.reply ?? "");
              setEditing(true);
            }}
          >
            Изменить ответ
          </Button>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {review.reply ? "Изменить ответ" : "Ответить туристу"}
          </p>
          <Textarea
            className="mt-3 min-h-[96px] resize-y"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Спасибо за отзыв! Рады, что поездка прошла хорошо…"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={saving} onClick={submit}>
              {review.reply ? "Сохранить" : "Опубликовать ответ"}
            </Button>
            {review.reply ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(review.reply ?? "");
                  setEditing(false);
                }}
              >
                Отмена
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
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
