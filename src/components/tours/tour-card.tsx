import { Link } from "@tanstack/react-router";
import {
  Clock3,
  Heart,
  MessageSquare,
  Plane,
  Scale,
  ShieldCheck,
  Star,
  TicketCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatPrice,
  formatNumber,
  getHotel,
  getOperator,
  guestsLabel,
  nightsLabel,
  offerCategoryLabels,
  availabilityLabel,
  priceFreshnessMinutes,
  type Tour,
} from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { useTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";

function TagBadge({ tag }: { tag: string }) {
  const map: Record<string, { label: string; className: string }> = {
    hot: { label: "🔥 HOT DEAL", className: "bg-primary text-primary-foreground" },
    premium: { label: "💎 PREMIUM", className: "bg-ink text-primary-foreground" },
    best: { label: "BEST MATCH", className: "bg-success text-primary-foreground" },
    sponsored: { label: "SPONSORED", className: "bg-premium text-ink" },
    price: { label: "BEST PRICE", className: "bg-accent text-primary-foreground" },
  };
  const item = map[tag];
  if (!item) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

export function TourCard({
  tour,
  layout = "row",
  bestPrice = false,
}: {
  tour: Tour;
  layout?: "row" | "grid";
  bestPrice?: boolean;
}) {
  const hotel = getHotel(tour.hotelId);
  const operator = getOperator(tour.operatorId);
  const { isFavorite, toggleFavorite, isCompared, toggleCompare } = useTourState();
  const { isPremium } = useAuth();
  const fav = isFavorite(tour.id);
  const compared = isCompared(tour.id);
  const isPremiumDeal = tour.tags.includes("premium") && Boolean(tour.premiumPrice);
  const displayPrice =
    isPremiumDeal && isPremium && tour.premiumPrice ? tour.premiumPrice : tour.price;

  return (
    <article
      className={cn(
        "surface-card hover-lift relative overflow-hidden",
        layout === "row" ? "grid sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]" : "flex flex-col",
      )}
    >
      <Link
        to="/tour/$tourId"
        params={{ tourId: tour.id }}
        aria-label={hotel.name}
        className="absolute inset-0 z-10"
      />
      <div
        className={cn(
          "relative",
          layout === "row" ? "aspect-[4/3] sm:aspect-auto" : "aspect-[4/3]",
        )}
      >
        <img src={hotel.image} alt={hotel.name} loading="lazy" className="size-full object-cover" />
        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
          {bestPrice ? <TagBadge tag="price" /> : null}
          {tour.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <button
          type="button"
          aria-label={fav ? "Убрать из избранного" : "Сохранить"}
          onClick={() => toggleFavorite(tour.id)}
          className={cn(
            "absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-card/90 shadow-card transition-colors hover:text-primary",
            fav ? "text-primary" : "text-foreground",
          )}
        >
          <Heart className={cn("size-4", fav && "fill-current")} />
        </button>
      </div>

      <div className="pointer-events-none relative z-20 flex flex-col gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
              {offerCategoryLabels[tour.offerCategory ?? "tour"]}
            </span>
            <span>
              {hotel.flag} {hotel.city}, {hotel.country}
            </span>
            <span className="flex items-center gap-0.5 text-premium">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="size-3 fill-current" />
              ))}
            </span>
          </div>
          <h3 className="mt-1.5 truncate font-display text-lg font-semibold">{hotel.name}</h3>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="rounded-lg bg-accent/10 px-2 py-0.5 font-semibold text-accent">
              {hotel.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {formatNumber(hotel.reviews)} отзывов
            </span>
          </div>
        </div>

        <ul className="grid gap-1.5 text-[13px] text-muted-foreground sm:grid-cols-2">
          <li>
            {tour.dateStart} – {tour.dateEnd} · {nightsLabel(tour.nights)}
          </li>
          <li className="flex items-center gap-1.5">
            <Plane className="size-3.5" /> {tour.from} → {hotel.city}
          </li>
          <li className="flex items-center gap-1.5">
            <UtensilsCrossed className="size-3.5" /> {tour.mealCode} · {tour.meal}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-3.5" /> {guestsLabel(tour.adults, tour.children)}
          </li>
        </ul>

        <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5">
            <ShieldCheck className="size-3.5 text-success" />
            Проверенный поставщик
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5">
            <Clock3 className="size-3.5 text-accent" />
            Цена {priceFreshnessMinutes(tour)} мин назад
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5">
            <TicketCheck className="size-3.5 text-primary" />
            {availabilityLabel(tour)}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <div>
            {tour.oldPrice ? (
              <div className="text-sm text-muted-foreground line-through">
                {formatPrice(tour.oldPrice)}
              </div>
            ) : null}
            {isPremiumDeal && !isPremium ? (
              <>
                <div className="font-display text-2xl font-semibold">Premium Deal</div>
                <Button size="sm" className="pointer-events-auto mt-2" asChild>
                  <Link to="/premium">Открыть Premium</Link>
                </Button>
              </>
            ) : (
              <div className="font-display text-2xl font-semibold">{formatPrice(displayPrice)}</div>
            )}
            <div className="text-xs text-muted-foreground">от {operator.name}</div>
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <Button
              variant={compared ? "secondary" : "ghost"}
              size="sm"
              className={compared ? "" : "text-muted-foreground"}
              onClick={() => toggleCompare(tour.id)}
            >
              <Scale className="size-4" />
              {compared ? "В сравнении" : "Сравнить"}
            </Button>
            <Button size="sm" asChild>
              <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                Подробнее
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
