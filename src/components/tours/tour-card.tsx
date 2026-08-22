import { Link } from "@tanstack/react-router";
import {
  Heart,
  MapPin,
  Plane,
  Scale,
  Star,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhotoCount } from "@/components/media/photo-gallery";
import { SafeImage } from "@/components/media/safe-image";
import {
  formatNumber,
  formatPrice,
  getOperator,
  guestsLabel,
  nightsLabel,
  tourCover,
  tourPhotos,
  type Tour,
} from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { getHotel } from "@/lib/platform/catalog";
import { useTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";

const tagMap: Record<string, { label: string; className: string }> = {
  hot: { label: "Горящий", className: "bg-primary text-primary-foreground" },
  premium: { label: "Выгодная цена", className: "bg-ink text-primary-foreground" },
  best: { label: "Хит", className: "bg-success text-primary-foreground" },
  sponsored: { label: "Рекомендуем", className: "bg-premium text-ink" },
  price: { label: "Лучшая цена", className: "bg-accent text-primary-foreground" },
};

function TagBadge({ tag }: { tag: string }) {
  const item = tagMap[tag];
  if (!item) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5 text-premium">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="size-3 fill-current" />
      ))}
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
  const cover = tourCover(tour, hotel);
  const shots = tourPhotos(tour, hotel);
  const title = tour.title || hotel.name;
  const { isFavorite, toggleFavorite, isCompared, toggleCompare } = useTourState();
  const { isPremium } = useAuth();
  const fav = isFavorite(tour.id);
  const compared = isCompared(tour.id);
  const isPremiumDeal = tour.tags.includes("premium") && Boolean(tour.premiumPrice);
  const displayPrice =
    isPremiumDeal && isPremium && tour.premiumPrice ? tour.premiumPrice : tour.price;
  const discount =
    tour.oldPrice && tour.oldPrice > displayPrice
      ? Math.round((1 - displayPrice / tour.oldPrice) * 100)
      : 0;
  const lockedPremium = isPremiumDeal && !isPremium;
  const sea =
    hotel.amenities.includes("Beach") && hotel.beachLine === 1
      ? "1-я линия"
      : hotel.distanceToSea > 0 && hotel.distanceToSea <= 400
        ? `${hotel.distanceToSea} м до моря`
        : null;

  return (
    <article
      className={cn(
        "surface-card hover-lift group relative overflow-hidden",
        layout === "row" ? "grid sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]" : "flex flex-col",
      )}
    >
      <Link
        to="/tour/$tourId"
        params={{ tourId: tour.id }}
        aria-label={title}
        className="absolute inset-0 z-10"
      />

      <div
        className={cn(
          "relative overflow-hidden",
          layout === "row" ? "aspect-[4/3] sm:aspect-auto sm:min-h-[280px]" : "aspect-[5/4]",
        )}
      >
        <SafeImage
          src={cover}
          alt={title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-ink/20" />
        <div className="absolute left-3 top-3 z-20 flex max-w-[70%] flex-wrap gap-1.5">
          {bestPrice ? <TagBadge tag="price" /> : null}
          {tour.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {discount > 0 ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
              -{discount}%
            </span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 z-20 flex gap-1.5">
          <button
            type="button"
            aria-label={compared ? "Убрать из сравнения" : "Сравнить"}
            onClick={() => toggleCompare(tour.id)}
            className={cn(
              "grid size-9 place-items-center rounded-full bg-card/90 shadow-card transition-colors",
              compared ? "text-primary" : "text-foreground hover:text-primary",
            )}
          >
            <Scale className="size-4" />
          </button>
          <button
            type="button"
            aria-label={fav ? "Убрать из избранного" : "Сохранить"}
            onClick={() => toggleFavorite(tour.id)}
            className={cn(
              "grid size-9 place-items-center rounded-full bg-card/90 shadow-card transition-colors hover:text-primary",
              fav ? "text-primary" : "text-foreground",
            )}
          >
            <Heart className={cn("size-4", fav && "fill-current")} />
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-end justify-between gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm">
              {nightsLabel(tour.nights)}
            </span>
            <span className="rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
              {tour.meal}
            </span>
          </div>
          <PhotoCount count={shots.length} />
        </div>
        {shots.length > 2 ? (
          <div className="absolute inset-x-3 bottom-12 z-20 hidden gap-1.5 sm:flex">
            {shots.slice(1, 4).map((img, i) => (
              <span key={`${img}-${i}`} className="h-12 w-16 overflow-hidden rounded-lg ring-1 ring-primary-foreground/40">
                <img src={img} alt="" className="size-full object-cover" />
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "pointer-events-none relative z-20 flex flex-col",
          layout === "row" ? "gap-3 p-5" : "gap-2.5 p-4",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {hotel.flag} {hotel.city}, {hotel.country}
            </span>
            <Stars count={hotel.stars} />
          </div>
          <h3
            className={cn(
              "mt-1 font-display font-semibold leading-snug",
              layout === "grid" ? "line-clamp-2 text-base" : "truncate text-lg",
            )}
          >
            {title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg bg-accent/10 px-2 py-0.5 font-semibold text-accent">
              {hotel.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">{formatNumber(hotel.reviews)} отзывов</span>
            {sea ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Waves className="size-3.5" />
                {sea}
              </span>
            ) : null}
          </div>
        </div>

        {layout === "row" ? (
          <ul className="grid gap-1.5 text-[13px] text-muted-foreground sm:grid-cols-2">
            <li>
              {tour.dateStart} - {tour.dateEnd}
            </li>
            <li className="flex items-center gap-1.5">
              <Plane className="size-3.5" /> {tour.from} → {hotel.city}
            </li>
            <li className="flex items-center gap-1.5">
              <UtensilsCrossed className="size-3.5" /> {tour.meal}
            </li>
            <li>{guestsLabel(tour.adults, tour.children)}</li>
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Plane className="size-3.5 shrink-0" />
            <span className="truncate">
              {tour.from} · {tour.dateStart} - {tour.dateEnd}
            </span>
          </p>
        )}

        <div
          className={cn(
            "mt-auto flex items-end justify-between gap-3 border-t border-border",
            layout === "row" ? "pt-4" : "pt-3",
          )}
        >
          <div className="min-w-0">
            {tour.oldPrice ? (
              <div className="text-xs text-muted-foreground line-through">
                {formatPrice(tour.oldPrice)}
              </div>
            ) : null}
            {lockedPremium ? (
              <div className="font-display text-lg font-semibold">Закрытая цена</div>
            ) : (
              <div
                className={cn(
                  "font-display font-semibold tracking-tight",
                  layout === "grid" ? "text-xl" : "text-2xl",
                )}
              >
                {formatPrice(displayPrice)}
              </div>
            )}
            <div className="truncate text-xs text-muted-foreground">
              {lockedPremium ? "Для подписчиков" : `${guestsLabel(tour.adults, tour.children)} · ${operator.name}`}
            </div>
          </div>
          {layout === "row" ? (
            <Button size="sm" className="pointer-events-auto shrink-0" asChild>
              <Link to="/tour/$tourId" params={{ tourId: tour.id }}>
                Смотреть
              </Link>
            </Button>
          ) : lockedPremium ? (
            <Button size="sm" className="pointer-events-auto shrink-0" asChild>
              <Link to="/premium">Открыть</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
