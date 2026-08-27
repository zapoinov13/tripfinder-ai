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
import { Textarea } from "@/components/ui/textarea";
import { companyCategories, type CompanyCategoryId } from "@/lib/platform/company-categories";
import { listCompanyFromLink } from "@/lib/platform/company-listing";
import { ingestVerticalFromUrl } from "@/lib/platform/page-ingest";
import {
  verticalLabel,
  type VerticalId,
  type VerticalOfferDraft,
} from "@/lib/platform/service-ingest";
import { cn } from "@/lib/utils";

/** Категории, которые попадают в витрины и берут записи клиентов. */
const VERTICAL_BY_CATEGORY: Partial<Record<CompanyCategoryId, VerticalId>> = {
  sport: "sport",
  stays: "stay",
  cars: "car",
};

type Step = "link" | "review";

/**
 * Наполнение витрин силами платформы.
 *
 * Пока партнёров нет, туристу нечего смотреть, а партнёру незачем приходить.
 * Круг разрывает админ: вставляет ссылку на реальное место — сайт или
 * Instagram — и карточка появляется в витрине. Такая компания честно помечена
 * как заведённая платформой: её никто не подтверждал.
 */
export function AddCompanyDialog({
  open,
  onOpenChange,
  actorId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: string;
  onCreated?: (organizationId: string) => void;
}) {
  const [step, setStep] = useState<Step>("link");
  const [category, setCategory] = useState<CompanyCategoryId>("sport");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<VerticalOfferDraft | null>(null);
  const [company, setCompany] = useState({ name: "", city: "", about: "", phone: "" });

  const vertical = VERTICAL_BY_CATEGORY[category];

  const reset = () => {
    setStep("link");
    setUrl("");
    setText("");
    setDraft(null);
    setWarnings([]);
    setCompany({ name: "", city: "", about: "", phone: "" });
  };

  const read = async () => {
    if (!url.trim() && !text.trim()) {
      toast.error("Вставьте ссылку или описание");
      return;
    }
    setLoading(true);
    try {
      const result = await ingestVerticalFromUrl({
        vertical: vertical ?? "sport",
        url: url.trim(),
        text: text.trim(),
      });
      setDraft(result.draft);
      setWarnings(result.warnings);
      setCompany({
        name: result.draft.name,
        city: result.draft.city,
        about: result.draft.about,
        phone: "",
      });
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось прочитать ссылку");
    } finally {
      setLoading(false);
    }
  };

  const create = () => {
    if (!company.name.trim() || !company.city.trim()) {
      toast.error("Нужны название и город");
      return;
    }
    const created = listCompanyFromLink({
      actorId,
      category,
      name: company.name.trim(),
      city: company.city.trim(),
      about: company.about.trim(),
      phone: company.phone.trim(),
      website: url.trim(),
      ...(vertical && draft
        ? { listing: { ...draft, name: draft.name || company.name.trim() } }
        : {}),
    });
    toast.success(
      vertical && draft
        ? `${created.name} в витрине «${verticalLabel(vertical)}» вместе с услугой`
        : `${created.name} добавлена`,
    );
    onCreated?.(created.id);
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
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Добавить компанию в витрину</DialogTitle>
          <DialogDescription>
            Ссылка на сайт или Instagram — карточка появится в витрине с пометкой, что её завела
            платформа. Владелец сможет забрать её позже.
          </DialogDescription>
        </DialogHeader>

        {step === "link" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Чем занимается</Label>
              <div className="flex flex-wrap gap-1.5">
                {companyCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      category === item.id ? "bg-ink text-primary-foreground" : "bg-secondary",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {vertical
                  ? `Попадёт в витрину «${verticalLabel(vertical)}» и сможет принимать записи.`
                  : "Появится в каталоге компаний и в поиске."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-url">Ссылка</Label>
              <Input
                id="company-url"
                placeholder="https://instagram.com/erik.sport"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-text">Описание, если ссылка закрыта</Label>
              <Textarea
                id="company-text"
                className="min-h-24"
                placeholder={"Erik Sport Club\nДубай, Al Wasl\nПадел и тренажёрный зал\nот 9 000 ₸"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {warnings.length > 0 ? (
              <ul className="space-y-1 rounded-xl bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
                {warnings.slice(0, 3).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-name">Название</Label>
                <Input
                  id="company-name"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-city">Город</Label>
                <Input
                  id="company-city"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Телефон</Label>
                <Input
                  id="company-phone"
                  placeholder="+971 4 222 33 44"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-about">О компании</Label>
                <Textarea
                  id="company-about"
                  className="min-h-20"
                  value={company.about}
                  onChange={(e) => setCompany({ ...company, about: e.target.value })}
                />
              </div>
            </div>

            {vertical && draft ? (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Услуга в витрине «{verticalLabel(vertical)}»
                </p>
                <p className="mt-1 font-medium">{draft.name || company.name || "Без названия"}</p>
                <p className="text-sm text-muted-foreground">
                  {draft.city || company.city}
                  {draft.area ? ` · ${draft.area}` : ""}
                  {draft.price > 0
                    ? ` · ${draft.price.toLocaleString("ru-RU")} ₸`
                    : " · цена по запросу"}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === "review" ? (
            <Button variant="outline" onClick={() => setStep("link")}>
              Назад
            </Button>
          ) : null}
          <Button onClick={step === "link" ? () => void read() : create} disabled={loading}>
            {loading ? "Читаем…" : step === "link" ? "Прочитать ссылку" : "Добавить в витрину"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
