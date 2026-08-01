import { Link } from "@tanstack/react-router";
import { Heart, Plane, Scale, Star, UtensilsCrossed, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatPrice,
  getHotel,
  getOperator,
  guestsLabel,
  nightsLabel,
  type Tour,
} from "@/data/demo";
import { cn } from "@/lib/utils";

function TagBadge({ tag }: { tag: string }) {
  const map: Record<string, { label: string; className: string }> = {
    hot: { label: "🔥 HOT DEAL", className: "bg-primary text-primary-foreground" },
    premium: { label: "💎 PREMIUM", className: "bg-ink text-primary-foreground" },
    best: { label: "BEST MATCH", className: "bg-success text-primary-foreground" },
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

export function TourCard({ tour, layout = "row" }: { tour: Tour; layout?: "row" | "grid" }) {
  const hotel = getHotel(tour.hotelId);
  const operator = getOperator(tour.operatorId);

  return (
    <article
      className={cn(
        "surface-card hover-lift overflow-hidden",
        layout === "row" ? "grid sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]" : "flex flex-col",
      )}
    >
      <div className={cn("relative", layout === "row" ? "aspect-[4/3] sm:aspect-auto" : "aspect-[4/3]")}>
        <img
          src={hotel.image}
          alt={hotel.name}
          loading="lazy"
          className="size-full object-cover"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {tour.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <button
          type="button"
          aria-label="Сохранить"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-card transition-colors hover:text-primary"
        >
          <Heart className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span>
              {hotel.flag} {hotel.city}
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
            <span className="text-muted-foreground">Отлично</span>
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
            <UtensilsCrossed className="size-3.5" /> {tour.meal}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-3.5" /> {guestsLabel(tour.adults, tour.children)}
          </li>
        </ul>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <div>
            {tour.oldPrice ? (
              <div className="text-sm text-muted-foreground line-through">
                {formatPrice(tour.oldPrice)}
              </div>
            ) : null}
            <div className="font-display text-2xl font-semibold">{formatPrice(tour.price)}</div>
            <div className="text-xs text-muted-foreground">от {operator.name}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Scale className="size-4" />
              Сравнить
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