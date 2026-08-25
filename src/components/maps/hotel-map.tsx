import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { Hotel } from "@/data/demo";
import {
  googleMapsUrl,
  openStreetMapUrl,
  resolveHotelCoords,
  type GeoPoint,
} from "@/lib/hotel-location";
import { cn } from "@/lib/utils";

type Props = {
  hotel: Pick<Hotel, "id" | "name" | "destinationId" | "city" | "country" | "district">;
  className?: string;
  heightClassName?: string;
};

export function HotelMap({
  hotel,
  className,
  heightClassName = "h-64 md:h-80",
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [point] = useState<GeoPoint>(() => resolveHotelCoords(hotel));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    const boot = async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;

        map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        }).setView([point.lat, point.lng], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const pinHtml = `
          <div style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            max-width:220px;
            padding:8px 12px;
            border-radius:999px;
            background:#e4572e;
            color:#fff;
            font:600 12px/1.2 Manrope,system-ui,sans-serif;
            box-shadow:0 8px 20px rgba(15,23,42,.25);
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            <span style="width:8px;height:8px;border-radius:999px;background:#fff;flex:0 0 auto"></span>
            <span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(hotel.name)}</span>
          </div>
        `;

        const icon = L.divIcon({
          className: "tourgo-hotel-map-pin",
          html: pinHtml,
          iconSize: [200, 36],
          iconAnchor: [100, 40],
        });

        L.marker([point.lat, point.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(hotel.name)}</strong><br/>${escapeHtml(hotel.district)} · ${escapeHtml(hotel.city)}`,
          );

        // Leaflet needs a tick after layout to size correctly inside cards.
        requestAnimationFrame(() => {
          map?.invalidateSize();
          if (!cancelled) setReady(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
  }, [hotel.city, hotel.district, hotel.id, hotel.name, point.lat, point.lng]);

  const mapsHref = googleMapsUrl(hotel, point);
  const osmHref = openStreetMapUrl(point);

  return (
    <div className={cn("relative overflow-hidden bg-secondary/40", heightClassName, className)}>
      <div
        ref={containerRef}
        id={`hotel-map-${mapId}`}
        className="absolute inset-0 z-0 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:bg-white/80"
        role="presentation"
      />

      {!ready && !failed ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-secondary/50 text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Загружаем карту
          </span>
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-secondary/60 px-4 text-center">
          <MapPin className="size-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            Карта временно недоступна. Откройте точку во внешних картах.
          </p>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {hotel.name}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end gap-2 p-3">
        <a
          href={osmHref}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur"
        >
          OpenStreetMap
          <ExternalLink className="size-3" />
        </a>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"
        >
          Google Maps
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
