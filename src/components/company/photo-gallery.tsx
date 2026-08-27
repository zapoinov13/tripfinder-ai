import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Галерея компании: первое фото крупным, остальные — сеткой.
 * Клик открывает просмотр во весь экран со стрелками и клавиатурой.
 */
export function PhotoGallery({ photos, alt = "" }: { photos: string[]; alt?: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) =>
      setOpenAt((current) =>
        current === null ? current : (current + delta + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAt, move]);

  if (photos.length === 0) return null;

  const [first, ...rest] = photos;

  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="group relative overflow-hidden rounded-2xl"
        >
          <img
            src={first}
            alt={alt}
            loading="lazy"
            className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] md:h-full md:min-h-[18rem]"
          />
        </button>

        {rest.length > 0 ? (
          <div className={cn("grid gap-3", rest.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {rest.slice(0, 4).map((url, i) => {
              const index = i + 1;
              const hiddenCount = photos.length - 5;
              const isLastTile = i === 3 && hiddenCount > 0;
              return (
                <button
                  key={`${url.slice(0, 24)}-${index}`}
                  type="button"
                  onClick={() => setOpenAt(index)}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] md:h-[8.6rem]"
                  />
                  {isLastTile ? (
                    <span className="absolute inset-0 grid place-items-center bg-ink/60 font-display text-lg font-semibold text-white">
                      +{hiddenCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {openAt !== null ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenAt(null)}
        >
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setOpenAt(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white"
          >
            <X className="size-5" />
          </button>

          {photos.length > 1 ? (
            <button
              type="button"
              aria-label="Предыдущее фото"
              onClick={(e) => {
                e.stopPropagation();
                move(-1);
              }}
              className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white md:left-8"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          <img
            src={photos[openAt]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Следующее фото"
                onClick={(e) => {
                  e.stopPropagation();
                  move(1);
                }}
                className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white md:right-8"
              >
                <ChevronRight className="size-6" />
              </button>
              <p className="absolute bottom-6 text-sm text-white/80">
                {openAt + 1} из {photos.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
