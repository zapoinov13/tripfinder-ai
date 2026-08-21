import { Check, Link2, PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { destinations, formatPrice, hotels, mealOptions } from "@/data/demo";
import {
  draftFromUrl,
  emptyDraft,
  operatorIdForOrg,
  publishTour,
  type TourDraft,
} from "@/lib/platform/tour-editor";
import type { MealCode } from "@/data/demo";
import { cn } from "@/lib/utils";

type Mode = "choose" | "manual" | "url" | "review";

export function AddTourDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [draft, setDraft] = useState<TourDraft>(() => emptyDraft());
  const [url, setUrl] = useState("");
  const [importedFields, setImportedFields] = useState<string[]>([]);

  const destinationHotels = hotels.filter((h) => h.destinationId === draft.destinationId);
  const hotel = hotels.find((h) => h.id === draft.hotelId);

  const patch = (next: Partial<TourDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const changeDestination = (destinationId: string) => {
    const first = hotels.find((h) => h.destinationId === destinationId);
    patch({ destinationId, ...(first ? { hotelId: first.id } : {}) });
  };

  const loadFromUrl = () => {
    if (!url.trim()) {
      toast.error("Вставьте ссылку на страницу тура");
      return;
    }
    const result = draftFromUrl(url.trim());
    setDraft(result.draft);
    setImportedFields(result.fields);
    setMode("review");
  };

  const publish = () => {
    publishTour(orgId, operatorIdForOrg(orgId), draft);
    toast.success("Тур опубликован — он уже виден туристам в поиске");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить тур</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Заполните данные сами или загрузите тур со своего сайта."
              : mode === "url"
                ? "Мы попробуем перенести название, отель, даты, питание и цену."
                : "Проверьте данные — тур появится в поиске сразу после публикации."}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <PencilLine className="size-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">Заполнить самостоятельно</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Отель, даты, питание, цена и условия.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <Link2 className="size-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">Загрузить с моего сайта</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Вставьте ссылку — мы перенесём данные.
              </p>
            </button>
          </div>
        ) : null}

        {mode === "url" ? (
          <div className="space-y-3">
            <Label htmlFor="tour-url">Вставьте ссылку на ваш тур</Label>
            <Input
              id="tour-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mycompany.kz/tours/dubai-7-nights"
            />
            <p className="text-xs text-muted-foreground">
              TourGo не публикует данные автоматически: перед публикацией вы всё проверите сами.
            </p>
          </div>
        ) : null}

        {mode === "manual" || mode === "review" ? (
          <div className="space-y-5">
            {mode === "review" && importedFields.length > 0 ? (
              <div className="rounded-xl bg-premium/12 p-4 text-sm">
                Проверьте данные: мы перенесли {importedFields.join(", ")}. Исправьте всё, что
                отличается от вашего сайта.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tour-country">Страна и город</Label>
                <select
                  id="tour-country"
                  value={draft.destinationId}
                  onChange={(e) => changeDestination(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.flag} {d.country} · {d.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-hotel">Отель</Label>
                <select
                  id="tour-hotel"
                  value={draft.hotelId}
                  onChange={(e) => patch({ hotelId: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {destinationHotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} · {h.stars}★
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-from">Город вылета</Label>
                <Input
                  id="tour-from"
                  value={draft.fromCity}
                  onChange={(e) => patch({ fromCity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-meal">Питание</Label>
                <select
                  id="tour-meal"
                  value={draft.mealCode}
                  onChange={(e) => patch({ mealCode: e.target.value as MealCode })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {mealOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-start">Дата вылета</Label>
                <Input
                  id="tour-start"
                  type="date"
                  value={draft.dateStart}
                  onChange={(e) => patch({ dateStart: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-end">Дата возвращения</Label>
                <Input
                  id="tour-end"
                  type="date"
                  value={draft.dateEnd}
                  onChange={(e) => {
                    const dateEnd = e.target.value;
                    const nights = Math.max(
                      1,
                      Math.round(
                        (new Date(dateEnd).getTime() - new Date(draft.dateStart).getTime()) /
                          86400000,
                      ),
                    );
                    patch({ dateEnd, nights });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-nights">Количество ночей</Label>
                <Input
                  id="tour-nights"
                  type="number"
                  min={1}
                  value={draft.nights}
                  onChange={(e) => patch({ nights: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-price">Цена, ₸</Label>
                <Input
                  id="tour-price"
                  type="number"
                  step={10000}
                  value={draft.price}
                  onChange={(e) => patch({ price: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tour-seats">Свободных мест</Label>
                <Input
                  id="tour-seats"
                  type="number"
                  min={0}
                  value={draft.availability}
                  onChange={(e) =>
                    patch({ availability: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>

              <label className="flex items-center justify-between gap-3 self-end rounded-xl border border-border px-4 py-3 text-sm">
                <span>Трансфер включён</span>
                <Switch checked={draft.transfer} onCheckedChange={(v) => patch({ transfer: v })} />
              </label>
            </div>

            <div className={cn("rounded-xl bg-secondary/60 p-4 text-sm")}>
              <p className="font-medium">Как турист увидит тур</p>
              <p className="mt-1 text-muted-foreground">
                {hotel?.name} · {draft.fromCity} → {hotel?.city} · {draft.nights} ночей ·{" "}
                {mealOptions.find((m) => m.code === draft.mealCode)?.label} ·{" "}
                {formatPrice(draft.price)}
                {draft.transfer ? " · трансфер включён" : ""}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {mode === "choose" ? (
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          ) : null}
          {mode === "url" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("choose")}>
                Назад
              </Button>
              <Button onClick={loadFromUrl}>Загрузить данные</Button>
            </>
          ) : null}
          {mode === "manual" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("choose")}>
                Назад
              </Button>
              <Button onClick={() => setMode("review")}>Посмотреть перед публикацией</Button>
            </>
          ) : null}
          {mode === "review" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("manual")}>
                Изменить
              </Button>
              <Button onClick={publish}>
                <Check className="size-4" />
                {importedFields.length > 0 ? "Всё верно — опубликовать" : "Опубликовать"}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
