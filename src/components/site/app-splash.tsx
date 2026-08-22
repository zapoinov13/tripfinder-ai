import { Plane } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  fading?: boolean;
};

/** Короткий брендированный экран при первом подключении, не блокирует отрисовку страницы. */
export function AppSplash({ fading }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-500 ease-out",
        fading ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      aria-live="polite"
      aria-busy={!fading}
    >
      <div className="flex flex-col items-center gap-8 px-6">
        <div className="relative">
          <div className="grid size-20 place-items-center rounded-[1.35rem] bg-primary shadow-xl shadow-primary/20">
            <Plane className="size-9 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <span className="absolute -inset-3 rounded-[1.75rem] border border-primary/20 animate-ping opacity-30" />
        </div>

        <div className="text-center">
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground">TourGo</p>
          <p className="mt-2 text-sm text-muted-foreground">Подбираем туры для вас…</p>
        </div>

        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-primary/70 animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
