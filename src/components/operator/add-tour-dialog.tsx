import {
  Check,
  Cable,
  ImagePlus,
  Link2,
  PencilLine,
  Send,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TourApiImportPanel } from "@/components/operator/tour-api-import";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AMENITIES,
  amenityLabels,
  destinations,
  formatPrice,
  hotels,
  mealOptions,
  nightsLabel,
  type MealCode,
} from "@/data/demo";
import { readImageFile, youtubeEmbed } from "@/lib/image-file";
import {
  applyHotelToDraft,
  emptyDraft,
  extraIncludeOptions,
  includesFromDraft,
  mealIncludes,
  operatorIdForOrg,
  publishTour,
  roomTypeOptions,
  type ExtraIncludeKey,
  type TourDraft,
} from "@/lib/platform/tour-editor";
import { draftFromTelegram, draftFromUrl } from "@/lib/platform/ingest";
import { ingestTourFromUrl } from "@/lib/platform/page-ingest";
import { originCities } from "@/lib/search";
import { cn } from "@/lib/utils";

type Mode = "choose" | "manual" | "url" | "telegram" | "review" | "api";

const MAX_PHOTOS = 8;
const MAX_VIDEOS = 3;

export function AddTourDialog({
  orgId,
  onClose,
  initialMode = "choose",
}: {
  orgId: string;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [draft, setDraft] = useState<TourDraft>(() => emptyDraft());
  const [url, setUrl] = useState("");
  const [telegramText, setTelegramText] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [importedFields, setImportedFields] = useState<string[]>([]);
  const [ingestWarnings, setIngestWarnings] = useState<string[]>([]);
  const [urlBusy, setUrlBusy] = useState(false);

  const destinationHotels = hotels.filter((h) => h.destinationId === draft.destinationId);
  const dest = destinations.find((d) => d.id === draft.destinationId);

  const patch = (next: Partial<TourDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const changeDestination = (destinationId: string) => {
    const first = hotels.find((h) => h.destinationId === destinationId);
    if (first && !draft.customHotel) {
      setDraft(applyHotelToDraft({ ...draft, destinationId }, first));
      return;
    }
    const nextDest = destinations.find((d) => d.id === destinationId);
    patch({
      destinationId,
      district: nextDest?.city ?? draft.district,
    });
  };

  const loadFromUrl = async () => {
    if (!url.trim()) {
      toast.error("Вставьте ссылку на страницу тура");
      return;
    }
    setUrlBusy(true);
    try {
      const result = await ingestTourFromUrl(url.trim());
      setDraft(result.draft);
      setImportedFields(result.fields);
      setIngestWarnings(result.warnings);
      setMode("review");
      if (result.fetched) {
        toast.success("Страница прочитана на сервере");
      } else if (result.warnings[0]) {
        toast.message(result.warnings[0]);
      }
    } catch {
      const result = draftFromUrl(url.trim());
      setDraft(result.draft);
      setImportedFields(result.fields);
      setIngestWarnings(result.warnings);
      setMode("review");
      toast.message("Сервер недоступен, собрали черновик по ссылке");
    } finally {
      setUrlBusy(false);
    }
  };

  const loadFromTelegram = () => {
    const result = draftFromTelegram({
      text: telegramText.trim(),
      ...(telegramLink.trim() ? { sourceLink: telegramLink.trim() } : {}),
    });
    if (
      result.warnings.includes("Вставьте текст поста или описание тура") &&
      !telegramText.trim()
    ) {
      toast.error("Вставьте текст поста или описание");
      return;
    }
    setDraft(result.draft);
    setImportedFields(result.fields);
    setIngestWarnings(result.warnings.filter((w) => !w.startsWith("Вставьте")));
    setMode("review");
    if (result.warnings.some((w) => !w.startsWith("Вставьте"))) {
      toast.message("Черновик собран, проверьте поля перед публикацией");
    }
  };

  const canPublish = Boolean(draft.hotelName.trim() && draft.price > 0 && draft.fromCity.trim());

  const publish = () => {
    if (!canPublish) {
      toast.error("Укажите отель, город вылета и цену");
      return;
    }
    publishTour(orgId, operatorIdForOrg(orgId), draft);
    toast.success("Тур опубликован, он уже виден туристам в поиске");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Добавить тур</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Соберите карточку: вручную, со сайта, из Telegram или автозагрузкой каталога (Бизнес/Про)."
              : mode === "url"
                ? "Сервер откроет страницу и соберёт название, цену, отель и описание."
                : mode === "telegram"
                  ? "Вставьте пост или описание, соберём черновик для проверки."
                  : mode === "api"
                    ? "Подключите Supplier Feed: цены и наличие подтянутся сами."
                    : "Так турист увидит предложение в поиске и на странице тура."}
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
              <p className="mt-3 font-display text-base font-semibold">Заполнить вручную</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Фото отеля, видео, питание, трансфер и цена.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <Link2 className="size-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">Со страницы тура</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Вставьте ссылку с вашего сайта и проверьте карточку.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("telegram")}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <Send className="size-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">Из Telegram</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Текст поста, ссылка t.me или описание с ценой и отелем.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("api")}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <Cable className="size-5 text-primary" />
              <p className="mt-3 font-display text-base font-semibold">Каталог по API</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Бизнес/Про: синхронизация цен и наличия из вашего feed.
              </p>
            </button>
          </div>
        ) : null}

        {mode === "api" ? <TourApiImportPanel orgId={orgId} /> : null}

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
              Сервер откроет страницу, вытащит название, цену и описание. Вы проверите поля перед
              публикацией.
            </p>
          </div>
        ) : null}

        {mode === "telegram" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tg-text">Текст поста или описание</Label>
              <Textarea
                id="tg-text"
                value={telegramText}
                onChange={(e) => setTelegramText(e.target.value)}
                placeholder={
                  "Дубай, Rixos, 7 ночей AI\nВылет из Алматы 12.09\nЦена 1 450 000 тг\nhttps://t.me/yourchannel/42"
                }
                className="min-h-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg-link">Ссылка на пост (необязательно)</Label>
              <Input
                id="tg-link"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                placeholder="https://t.me/channel/123"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Собираем черновик по тексту. Полноценный бот для канала: следующий шаг на том же
              формате.
            </p>
          </div>
        ) : null}

        {mode === "manual" || mode === "review" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
              {mode === "review" && ingestWarnings.length > 0 ? (
                <ul className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                  {ingestWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              <TourDraftForm
                draft={draft}
                destLabel={dest ? `${dest.flag} ${dest.country}` : ""}
                destinationHotels={destinationHotels}
                imported={mode === "review" ? importedFields : []}
                onPatch={patch}
                onDestination={changeDestination}
                onHotel={(hotelId) => {
                  const hotel = hotels.find((h) => h.id === hotelId);
                  if (hotel) setDraft(applyHotelToDraft(draft, hotel));
                }}
              />
            </div>
            <TourCardPreview draft={draft} city={dest?.city ?? ""} country={dest?.country ?? ""} />
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
              <Button onClick={() => void loadFromUrl()} disabled={urlBusy}>
                {urlBusy ? "Читаем страницу…" : "Загрузить данные"}
              </Button>
            </>
          ) : null}
          {mode === "telegram" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("choose")}>
                Назад
              </Button>
              <Button onClick={loadFromTelegram}>Собрать черновик</Button>
            </>
          ) : null}
          {mode === "manual" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("choose")}>
                Назад
              </Button>
              <Button
                onClick={() => {
                  if (!canPublish) {
                    toast.error("Укажите отель, город вылета и цену");
                    return;
                  }
                  setMode("review");
                }}
              >
                Посмотреть карточку
              </Button>
            </>
          ) : null}
          {mode === "review" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("manual")}>
                Изменить
              </Button>
              <Button onClick={publish}>
                <Check className="size-4" />
                {importedFields.length > 0 ? "Всё верно, опубликовать" : "Опубликовать"}
              </Button>
            </>
          ) : null}
          {mode === "api" ? (
            <Button variant="ghost" onClick={() => setMode("choose")}>
              Назад
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TourDraftForm({
  draft,
  destLabel,
  destinationHotels,
  imported,
  onPatch,
  onDestination,
  onHotel,
}: {
  draft: TourDraft;
  destLabel: string;
  destinationHotels: typeof hotels;
  imported: string[];
  onPatch: (next: Partial<TourDraft>) => void;
  onDestination: (id: string) => void;
  onHotel: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {imported.length > 0 ? (
        <div className="rounded-xl bg-premium/12 p-4 text-sm">
          Перенесли {imported.join(", ")}. Проверьте каждое поле и добавьте фото, если их нет.
        </div>
      ) : null}

      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Отель и направление</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tour-country">Страна и город</Label>
            <select
              id="tour-country"
              value={draft.destinationId}
              onChange={(e) => onDestination(e.target.value)}
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
            <Label htmlFor="tour-from">Город вылета</Label>
            <select
              id="tour-from"
              value={draft.fromCity}
              onChange={(e) => onPatch({ fromCity: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {originCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
          <span>Отеля нет в списке, укажу сам</span>
          <Switch
            checked={draft.customHotel}
            onCheckedChange={(customHotel) => {
              if (!customHotel && destinationHotels[0]) {
                onHotel(destinationHotels[0].id);
                return;
              }
              onPatch({ customHotel: true, hotelName: draft.hotelName || "" });
            }}
          />
        </label>

        {draft.customHotel ? null : (
          <div className="space-y-2">
            <Label htmlFor="tour-hotel">Отель из каталога</Label>
            <select
              id="tour-hotel"
              value={draft.hotelId}
              onChange={(e) => onHotel(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {destinationHotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {h.stars}★
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tour-hotel-name">Название отеля</Label>
            <Input
              id="tour-hotel-name"
              value={draft.hotelName}
              onChange={(e) => onPatch({ hotelName: e.target.value })}
              placeholder="Rixos Premium Dubai"
            />
          </div>
          <div className="space-y-2">
            <Label>Звёзды</Label>
            <div className="flex gap-1.5">
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPatch({ hotelStars: n })}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border text-sm",
                    draft.hotelStars === n
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {n}
                  <Star className="size-3.5 fill-premium text-premium" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-district">Район</Label>
            <Input
              id="tour-district"
              value={draft.district}
              onChange={(e) => onPatch({ district: e.target.value })}
              placeholder="Jumeirah Beach"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-sea">До моря, м</Label>
            <Input
              id="tour-sea"
              type="number"
              min={0}
              value={draft.distanceToSea}
              onChange={(e) => onPatch({ distanceToSea: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Линия пляжа</Label>
            <div className="flex gap-1.5">
              {(
                [
                  [1, "1-я"],
                  [2, "2-я"],
                  [3, "Не у моря"],
                ] as const
              ).map(([line, label]) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => onPatch({ beachLine: line })}
                  className={cn(
                    "h-11 flex-1 rounded-xl border text-sm",
                    draft.beachLine === line
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Удобства отеля</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITIES.map((key) => {
              const on = draft.amenities.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onPatch({
                      amenities: on
                        ? draft.amenities.filter((a) => a !== key)
                        : [...draft.amenities, key],
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    on ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
                  )}
                >
                  {amenityLabels[key]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <PhotoVideoFields draft={draft} onPatch={onPatch} />

      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Даты и гости</h3>
        <DateRangePicker
          label="Даты тура"
          from={draft.dateStart}
          to={draft.dateEnd}
          months={1}
          onChange={({ from, to }) => {
            const nights = Math.max(
              1,
              Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000),
            );
            onPatch({ dateStart: from, dateEnd: to, nights });
          }}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tour-nights">Ночей</Label>
            <Input
              id="tour-nights"
              type="number"
              min={1}
              value={draft.nights}
              onChange={(e) => onPatch({ nights: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-adults">Взрослых</Label>
            <Input
              id="tour-adults"
              type="number"
              min={1}
              value={draft.adults}
              onChange={(e) => onPatch({ adults: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-children">Детей</Label>
            <Input
              id="tour-children"
              type="number"
              min={0}
              value={draft.children}
              onChange={(e) => onPatch({ children: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Номер и питание</h3>
        <div className="space-y-2">
          <Label>Тип номера</Label>
          <div className="flex flex-wrap gap-2">
            {roomTypeOptions.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => onPatch({ roomType: room })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  draft.roomType === room
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-primary/40",
                )}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Питание</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Сейчас: {mealIncludes(draft.mealCode).join(", ") || "завтрак не включён"}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {mealOptions.map((m) => {
              const on = draft.mealCode === m.code;
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => onPatch({ mealCode: m.code as MealCode })}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left",
                    on ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Что входит в цену</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {extraIncludeOptions.map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
            >
              <span>{item.label}</span>
              <Switch
                checked={draft.extras[item.key]}
                onCheckedChange={(v) =>
                  onPatch({
                    extras: { ...draft.extras, [item.key]: v } as Record<ExtraIncludeKey, boolean>,
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Цена</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tour-price">Цена, ₸</Label>
            <MoneyInput
              id="tour-price"
              value={draft.price}
              onChange={(price) => onPatch({ price })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-old">Старая цена, ₸</Label>
            <MoneyInput
              id="tour-old"
              value={draft.oldPrice}
              onChange={(oldPrice) => onPatch({ oldPrice })}
            />
            <p className="text-xs text-muted-foreground">Если есть скидка</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-seats">Свободных мест</Label>
            <Input
              id="tour-seats"
              type="number"
              min={0}
              value={draft.availability}
              onChange={(e) => onPatch({ availability: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
          <span>Горящий тур</span>
          <Switch checked={draft.hotDeal} onCheckedChange={(hotDeal) => onPatch({ hotDeal })} />
        </label>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Описание карточки</h3>
        <div className="space-y-2">
          <Label htmlFor="tour-title">Заголовок для туриста</Label>
          <Input
            id="tour-title"
            value={draft.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder={draft.hotelName || "Название тура"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tour-about">О туре и отеле</Label>
          <Textarea
            id="tour-about"
            rows={4}
            value={draft.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            placeholder={`Семейный отель в ${destLabel || "курорте"}. Что рядом, для кого подходит, какие номера.`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tour-excludes">Что не входит</Label>
          <Textarea
            id="tour-excludes"
            rows={2}
            value={draft.excludes}
            onChange={(e) => onPatch({ excludes: e.target.value })}
            placeholder="Виза, личные расходы, дополнительные экскурсии"
          />
        </div>
      </section>
    </div>
  );
}

function PhotoVideoFields({
  draft,
  onPatch,
}: {
  draft: TourDraft;
  onPatch: (next: Partial<TourDraft>) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - draft.photos.length;
    if (room <= 0) {
      toast.error(`Можно загрузить до ${MAX_PHOTOS} фото`);
      return;
    }
    try {
      const next = await Promise.all([...files].slice(0, room).map((file) => readImageFile(file)));
      onPatch({ photos: [...draft.photos, ...next] });
    } catch {
      toast.error("Не удалось загрузить фото");
    }
  };

  const addPhotoUrl = () => {
    const value = photoUrl.trim();
    if (!value) return;
    if (draft.photos.length >= MAX_PHOTOS) {
      toast.error(`Можно загрузить до ${MAX_PHOTOS} фото`);
      return;
    }
    onPatch({ photos: [...draft.photos, value] });
    setPhotoUrl("");
  };

  const addVideo = () => {
    const value = videoUrl.trim();
    if (!value) return;
    if (draft.videos.length >= MAX_VIDEOS) {
      toast.error(`Можно добавить до ${MAX_VIDEOS} видео`);
      return;
    }
    onPatch({ videos: [...draft.videos, value] });
    setVideoUrl("");
  };

  return (
    <section className="space-y-4">
      <h3 className="font-display text-base font-semibold">Фото и видео</h3>
      <p className="text-sm text-muted-foreground">
        Загрузите фото отеля и номера. Видео можно вставить ссылкой с YouTube.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {draft.photos.map((src, i) => (
          <div
            key={`${src.slice(0, 24)}-${i}`}
            className="relative aspect-[4/3] overflow-hidden rounded-xl"
          >
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Удалить фото"
              onClick={() => onPatch({ photos: draft.photos.filter((_, idx) => idx !== i) })}
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-card/90 text-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
            {i === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold">
                Обложка
              </span>
            ) : null}
          </div>
        ))}
        {draft.photos.length < MAX_PHOTOS ? (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50">
            <ImagePlus className="size-5" />
            Фото
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Input
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="Или ссылка на фото"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPhotoUrl();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addPhotoUrl}>
          Добавить
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tour-video">Видео тура или отеля</Label>
        {draft.videos.map((src) => {
          const embed = youtubeEmbed(src);
          return (
            <div key={src} className="overflow-hidden rounded-xl border border-border">
              {embed ? (
                <iframe
                  title="Видео тура"
                  src={embed}
                  className="aspect-video w-full"
                  allowFullScreen
                />
              ) : (
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <Video className="size-4" />
                  {src}
                </a>
              )}
              <div className="flex justify-end border-t border-border p-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onPatch({ videos: draft.videos.filter((v) => v !== src) })}
                >
                  Удалить
                </Button>
              </div>
            </div>
          );
        })}
        {draft.videos.length < MAX_VIDEOS ? (
          <div className="flex gap-2">
            <Input
              id="tour-video"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addVideo();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addVideo}>
              Добавить видео
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TourCardPreview({
  draft,
  city,
  country,
}: {
  draft: TourDraft;
  city: string;
  country: string;
}) {
  const cover = draft.photos[0];
  const meal = mealOptions.find((m) => m.code === draft.mealCode);
  const includes = useMemo(() => includesFromDraft(draft), [draft]);
  const discount =
    draft.oldPrice > draft.price ? Math.round((1 - draft.price / draft.oldPrice) * 100) : 0;

  return (
    <aside className="lg:sticky lg:top-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Как увидит турист
      </p>
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="relative aspect-[4/3] bg-secondary">
          {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
          <div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-semibold">
              {nightsLabel(draft.nights)}
            </span>
            <span className="rounded-full bg-card/95 px-2 py-0.5 text-[10px]">{meal?.label}</span>
            {draft.hotDeal ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Горящий
              </span>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                -{discount}%
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 p-3">
          <p className="text-[11px] text-muted-foreground">
            {city}
            {country ? `, ${country}` : ""} · {draft.hotelStars}★
          </p>
          <p className="font-display text-sm font-semibold leading-snug">
            {draft.title.trim() || draft.hotelName || "Название отеля"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {draft.fromCity} → {city || "курорт"} · {draft.roomType}
          </p>
          <p className="font-display text-lg font-semibold">{formatPrice(draft.price)}</p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {includes.slice(0, 4).map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      </article>
    </aside>
  );
}
