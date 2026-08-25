import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SafeImage } from "@/components/media/safe-image";
import { cn } from "@/lib/utils";

export function PhotoGallery({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const photos = images.filter(Boolean);
  const [open, setOpen] = useState<number | null>(null);
  const shown = photos.slice(0, 5);
  const extra = Math.max(0, photos.length - 5);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photos.length) return null;

  return (
    <>
      <div
        className={cn(
          "grid gap-1.5 overflow-hidden rounded-2xl md:rounded-3xl md:grid-cols-[1.7fr_1fr] md:grid-rows-2 md:h-[440px]",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="relative h-64 overflow-hidden md:row-span-2 md:h-full"
        >
          <SafeImage src={photos[0]} alt={alt} className="size-full object-cover" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm md:hidden">
            <Images className="size-3.5" />
            {photos.length} фото
          </span>
        </button>
        {shown.slice(1).map((img, i) => {
          const isLast = i === shown.slice(1).length - 1 && extra > 0;
          return (
            <button
              type="button"
              key={`${img}-${i}`}
              onClick={() => setOpen(i + 1)}
              className={cn(
                "relative hidden overflow-hidden md:block",
                shown.length === 2 && "md:row-span-2",
              )}
            >
              <SafeImage
                src={img}
                alt={`${alt} фото ${i + 2}`}
                className="size-full object-cover"
              />
              {isLast ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold text-primary-foreground">
                  +{extra + 1} фото
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {photos.length > 1 ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar md:hidden">
          {photos.slice(1, 9).map((img, i) => (
            <button
              type="button"
              key={`${img}-m-${i}`}
              onClick={() => setOpen(i + 1)}
              className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"
            >
              <SafeImage src={img} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {open !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground"
            onClick={() => setOpen(null)}
          >
            <X className="size-5" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Назад"
                className="absolute left-3 grid size-11 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground md:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + photos.length) % photos.length);
                }}
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Дальше"
                className="absolute right-3 grid size-11 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground md:right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % photos.length);
                }}
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}
          <SafeImage
            src={photos[open]}
            alt={`${alt} ${open + 1}`}
            className="max-h-[86vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-5 text-sm font-medium text-primary-foreground/80">
            {open + 1} / {photos.length}
          </p>
        </div>
      ) : null}
    </>
  );
}

export function PhotoCount({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm backdrop-blur-sm">
      <Images className="size-3.5" />
      {count} фото
    </span>
  );
}
