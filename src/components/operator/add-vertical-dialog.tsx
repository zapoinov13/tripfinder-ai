import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { destinations } from "@/data/demo";
import { carClasses, formatKzt, sportKinds, stayKinds } from "@/data/scenario-catalog";
import { ingestVerticalFromUrl } from "@/lib/platform/page-ingest";
import {
  draftVerticalFromLink,
  verticalLabel,
  type VerticalId,
  type VerticalOfferDraft,
} from "@/lib/platform/service-ingest";
import { publishVerticalListing } from "@/lib/platform/vertical-listings";

type Mode = "link" | "review";

const placeholders: Record<VerticalId, string> = {
  sport: "Padel Court JLT\nДубай, JLT\nсегодня 19:00\n12 000 ₸",
  stay: "Marina Gate Apartments\nДубай Marina\nАпартаменты\n54 000 ₸ за ночь",
  car: "Toyota Yaris\nДубай\n5 мест, автомат\n18 000 ₸ / день",
};

export function AddVerticalDialog({
  open,
  onOpenChange,
  organizationId,
  companyName,
  vertical,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  companyName: string;
  vertical: VerticalId;
  onPublished?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<VerticalOfferDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const kindOptions = useMemo(() => {
    if (vertical === "sport") return sportKinds.map((k) => ({ id: k.id, label: k.label }));
    if (vertical === "stay") return stayKinds.map((k) => ({ id: k.id, label: k.label }));
    return carClasses.map((k) => ({ id: k.id, label: k.label }));
  }, [vertical]);

  const reset = () => {
    setMode("link");
    setUrl("");
    setText("");
    setDraft(null);
    setWarnings([]);
    setFields([]);
    setBusy(false);
  };

  const parse = async () => {
    if (!url.trim() && !text.trim()) {
      toast.error("Вставьте ссылку или текст");
      return;
    }
    setBusy(true);
    try {
      const result = url.trim()
        ? await ingestVerticalFromUrl({ vertical, url, text })
        : draftVerticalFromLink({ vertical, url: "", text });
      if (!result.draft.name && !url && !text) {
        toast.error(result.warnings[0] ?? "Не удалось собрать карточку");
        return;
      }
      setDraft(result.draft);
      setWarnings(result.warnings);
      setFields(result.fields);
      setMode("review");
      if ("fetched" in result && result.fetched) {
        toast.success("Страница прочитана на сервере");
      }
    } catch {
      const result = draftVerticalFromLink({ vertical, url, text });
      setDraft(result.draft);
      setWarnings(["Сервер недоступен, собрали по ссылке и тексту", ...result.warnings]);
      setFields(result.fields);
      setMode("review");
    } finally {
      setBusy(false);
    }
  };

  const publish = () => {
    if (!draft?.name.trim()) {
      toast.error("Укажите название");
      return;
    }
    publishVerticalListing({ organizationId, companyName, draft });
    toast.success(`Опубликовано в разделе «${verticalLabel(vertical)}»`);
    onPublished?.();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "link"
              ? `Добавить ${verticalLabel(vertical).toLowerCase()} из ссылки`
              : "Проверьте карточку"}
          </DialogTitle>
          <DialogDescription>
            {mode === "link"
              ? "Для сайта сервер сам прочитает HTML. Для Instagram лучше добавить bio рядом."
              : "Исправьте поля при необходимости и опубликуйте."}
          </DialogDescription>
        </DialogHeader>

        {mode === "link" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vert-url">Ссылка на сайт или Instagram</Label>
              <Input
                id="vert-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://company.kz/... или Instagram"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vert-text">Доп. текст (необязательно для сайта)</Label>
              <textarea
                id="vert-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={placeholders[vertical]}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Обычный сайт: сервер загрузит страницу и вытащит название, цену и описание. Instagram:
              часто нужен bio или пост вручную.
            </p>
          </div>
        ) : draft ? (
          <div className="space-y-4">
            {warnings.length ? (
              <ul className="space-y-1 rounded-xl bg-primary-soft/60 p-3 text-xs text-foreground/80">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {fields.length ? (
              <p className="text-xs text-muted-foreground">Заполнено: {fields.join(", ")}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="vert-name">Название</Label>
              <Input
                id="vert-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="vert-kind">{vertical === "car" ? "Класс" : "Тип"}</Label>
                <select
                  id="vert-kind"
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  {kindOptions.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vert-dest">Город</Label>
                <select
                  id="vert-dest"
                  value={draft.destinationId}
                  onChange={(e) => {
                    const dest = destinations.find((d) => d.id === e.target.value);
                    setDraft({
                      ...draft,
                      destinationId: e.target.value,
                      city: dest?.city ?? draft.city,
                    });
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.flag} {d.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {vertical !== "car" ? (
                <div className="space-y-2">
                  <Label htmlFor="vert-area">Район</Label>
                  <Input
                    id="vert-area"
                    value={draft.area}
                    onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="vert-seats">Мест</Label>
                  <Input
                    id="vert-seats"
                    type="number"
                    value={draft.seats ?? 5}
                    onChange={(e) => setDraft({ ...draft, seats: Number(e.target.value) || 5 })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="vert-price">Цена, ₸</Label>
                <Input
                  id="vert-price"
                  type="number"
                  value={draft.price || ""}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vert-address">Адрес</Label>
              <Input
                id="vert-address"
                placeholder="Улица, дом — турист откроет маршрут в картах"
                value={draft.address ?? ""}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vert-detail">
                {vertical === "sport"
                  ? "Слот / формат"
                  : vertical === "stay"
                    ? "Подпись к цене"
                    : "Коробка и депозит"}
              </Label>
              <Input
                id="vert-detail"
                value={draft.detail}
                onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
              />
            </div>
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="font-semibold">{draft.name || "Без названия"}</p>
              <p className="text-muted-foreground">
                {draft.city}
                {draft.area ? ` · ${draft.area}` : ""}
              </p>
              <p className="mt-1">{draft.price > 0 ? formatKzt(draft.price) : "Цена по запросу"}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          {mode === "review" ? (
            <Button type="button" variant="outline" onClick={() => setMode("link")}>
              Назад
            </Button>
          ) : (
            <Button type="button" variant="ghost" asChild>
              <Link to="/for-companies">Как это работает</Link>
            </Button>
          )}
          {mode === "link" ? (
            <Button type="button" disabled={busy} onClick={() => void parse()}>
              {busy ? "Читаем страницу…" : "Собрать карточку"}
            </Button>
          ) : (
            <Button type="button" onClick={publish}>
              Опубликовать
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated use AddVerticalDialog */
export function AddSportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  companyName: string;
  onPublished?: () => void;
}) {
  return <AddVerticalDialog {...props} vertical="sport" />;
}
