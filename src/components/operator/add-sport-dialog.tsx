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
import { formatKzt, sportKinds } from "@/data/scenario-catalog";
import {
  draftSportFromLink,
  type SportOfferDraft,
} from "@/lib/platform/service-ingest";
import { publishSportListing } from "@/lib/platform/sport-listings";

type Mode = "link" | "review";

export function AddSportDialog({
  open,
  onOpenChange,
  organizationId,
  companyName,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  companyName: string;
  onPublished?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<SportOfferDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);

  const reset = () => {
    setMode("link");
    setUrl("");
    setText("");
    setDraft(null);
    setWarnings([]);
    setFields([]);
  };

  const parse = () => {
    const result = draftSportFromLink({ url, text });
    if (result.warnings.length && !result.draft.name && !url && !text) {
      toast.error(result.warnings[0]);
      return;
    }
    setDraft(result.draft);
    setWarnings(result.warnings);
    setFields(result.fields);
    setMode("review");
  };

  const publish = () => {
    if (!draft?.name.trim()) {
      toast.error("Укажите название");
      return;
    }
    publishSportListing({ organizationId, companyName, draft });
    toast.success("Услуга опубликована в разделе Спорт");
    onPublished?.();
    reset();
    onOpenChange(false);
  };

  const kindOptions = useMemo(() => sportKinds, []);

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
            {mode === "link" ? "Добавить из Instagram или сайта" : "Проверьте карточку"}
          </DialogTitle>
          <DialogDescription>
            {mode === "link"
              ? "Вставьте ссылку и текст со страницы. TourGo соберёт черновик, вы проверите и опубликуете."
              : "Исправьте поля при необходимости и опубликуйте в разделе Спорт."}
          </DialogDescription>
        </DialogHeader>

        {mode === "link" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sport-url">Ссылка на Instagram или сайт</Label>
              <Input
                id="sport-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/... или сайт зала"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport-text">Bio / пост / текст со страницы</Label>
              <textarea
                id="sport-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={"Padel Court JLT\nДубай, JLT\nКорт сегодня 19:00\n12 000 ₸"}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Instagram не отдаёт профиль в браузер без Meta API. Рабочий путь: ссылка + текст bio
              или поста. Для сайта позже подключим серверный разбор страницы.
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
              <Label htmlFor="sport-name">Название</Label>
              <Input
                id="sport-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sport-kind">Тип</Label>
                <select
                  id="sport-kind"
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
                <Label htmlFor="sport-dest">Город</Label>
                <select
                  id="sport-dest"
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
              <div className="space-y-2">
                <Label htmlFor="sport-area">Район</Label>
                <Input
                  id="sport-area"
                  value={draft.area}
                  onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport-price">Цена, ₸</Label>
                <Input
                  id="sport-price"
                  type="number"
                  value={draft.price || ""}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport-slot">Слот / формат</Label>
              <Input
                id="sport-slot"
                value={draft.slot}
                onChange={(e) => setDraft({ ...draft, slot: e.target.value })}
                placeholder="сегодня 19:00 или 60 мин"
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
            <Button type="button" onClick={parse}>
              Собрать карточку
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
