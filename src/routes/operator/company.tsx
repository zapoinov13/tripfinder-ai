import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  ExternalLink,
  FileText,
  ImagePlus,
  ShieldCheck,
  Trash2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { readImageFile, youtubeEmbed } from "@/lib/image-file";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import {
  clientCountryOptions,
  companyCountryOptions,
  companyServiceOptions,
  languageOptions,
  submitForVerification,
  updateCompanyProfile,
} from "@/lib/platform/company";
import { usePlatformStore } from "@/lib/platform/hooks";
import { DEMO_PASSWORD } from "@/lib/platform/seed";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/company")({
  head: () => ({ meta: [{ title: "Страница компании · TourGo" }] }),
  component: OperatorCompanyPage,
});

const documentOptions = ["Документ о регистрации", "Лицензия", "Другой документ"];
const MAX_PHOTOS = 12;
const MAX_VIDEOS = 3;

function OperatorCompanyPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [draft, setDraft] = useState<Organization | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const form = draft ?? organization;
  if (!allowed || !organization || !user || !form) return null;
  const setForm = setDraft;

  const members = state.members.filter((m) => m.organizationId === organization.id);
  const readOnly = user.role === "OPERATOR_MANAGER";
  const documents = form.documents ?? [];
  const photos = form.photos ?? [];
  const videos = form.videos ?? [];
  const verified = organization.status === "APPROVED";

  const checks = [
    { ok: Boolean(form.logoUrl), label: "Логотип" },
    { ok: Boolean(form.coverUrl), label: "Обложка" },
    { ok: Boolean(form.about?.trim()), label: "Описание" },
    { ok: photos.length > 0, label: "Фото" },
    { ok: Boolean(form.phone || form.whatsapp), label: "Телефон" },
    { ok: verified, label: "Знак проверки" },
  ];
  const ready = checks.filter((c) => c.ok).length;

  const toggleList = (
    key: "services" | "countries" | "clientCountries" | "languages",
    value: string,
  ) => {
    const current = form[key] ?? [];
    setForm({
      ...form,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  };

  const save = () => {
    updateCompanyProfile(organization.id, form);
    toast.success("Страница обновлена. Так её видят туристы.");
  };

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Страница компании"
      subtitle="Заполните карточку один раз: турист видит её в заявках и в поиске."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/company/$companyId" params={{ companyId: organization.id }}>
              <ExternalLink className="size-3.5" />
              Как видит турист
            </Link>
          </Button>
          <Button size="sm" disabled={readOnly} onClick={save}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {verified ? (
          <Badge className="border-0 bg-success/12 text-success">
            <BadgeCheck className="mr-1 size-3.5" />
            Компания проверена
          </Badge>
        ) : (
          <Badge className="border-0 bg-premium/15 text-premium">Знак ещё не получен</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Заполнено {ready} из {checks.length}
        </span>
        {checks.map((item) => (
          <span
            key={item.label}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              item.ok ? "bg-success/12 text-success" : "bg-secondary text-muted-foreground",
            )}
          >
            {item.ok ? "✓ " : ""}
            {item.label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="surface-card space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Лицо компании</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Обложка и логотип. Это первое, что видит турист.
              </p>
            </div>
            <CoverField
              value={form.coverUrl ?? ""}
              disabled={readOnly}
              onChange={(coverUrl) => setForm({ ...form, coverUrl })}
            />
            <div className="flex flex-col gap-4 sm:flex-row">
              <LogoField
                value={form.logoUrl ?? ""}
                name={form.name}
                disabled={readOnly}
                onChange={(logoUrl) => setForm({ ...form, logoUrl })}
              />
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <Field
                  id="company-name"
                  label="Название"
                  value={form.name}
                  disabled={readOnly}
                  onChange={(name) => setForm({ ...form, name })}
                />
                <Field
                  id="company-city"
                  label="Город офиса"
                  value={form.city}
                  disabled={readOnly}
                  onChange={(city) => setForm({ ...form, city })}
                />
                <Field
                  id="company-country"
                  label="Страна"
                  value={form.country}
                  disabled={readOnly}
                  onChange={(country) => setForm({ ...form, country })}
                />
                <Field
                  id="company-person"
                  label="С кем говорит турист"
                  value={form.contactPerson}
                  disabled={readOnly}
                  onChange={(contactPerson) => setForm({ ...form, contactPerson })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="company-legal"
                label="Юридическое название"
                value={form.legalName}
                disabled={readOnly}
                onChange={(legalName) => setForm({ ...form, legalName })}
              />
              <Field
                id="company-bin"
                label="БИН или рег. номер"
                value={form.registrationNumber}
                disabled={readOnly}
                onChange={(registrationNumber) => setForm({ ...form, registrationNumber })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-about">О компании</Label>
              <Textarea
                id="company-about"
                rows={4}
                value={form.about ?? ""}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                placeholder="Работаем в Дубае с 2018 года. Семейные поездки, экскурсии, трансферы."
              />
            </div>
          </section>

          <section className="surface-card space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Контакты</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Турист напишет сюда, если выберет вас.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-phone">Телефон</Label>
                <PhoneInput
                  id="company-phone"
                  value={form.phone}
                  disabled={readOnly}
                  onChange={(phone) => setForm({ ...form, phone })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-wa">WhatsApp</Label>
                <PhoneInput
                  id="company-wa"
                  value={form.whatsapp ?? ""}
                  disabled={readOnly}
                  onChange={(whatsapp) => setForm({ ...form, whatsapp })}
                />
              </div>
              <Field
                id="company-site"
                label="Сайт"
                value={form.website}
                disabled={readOnly}
                onChange={(website) => setForm({ ...form, website })}
                placeholder="https://"
              />
              <Field
                id="company-ig"
                label="Instagram"
                value={form.instagram ?? ""}
                disabled={readOnly}
                onChange={(instagram) => setForm({ ...form, instagram })}
                placeholder="@company"
              />
              <Field
                id="company-tg"
                label="Telegram"
                value={form.telegram ?? ""}
                disabled={readOnly}
                onChange={(telegram) => setForm({ ...form, telegram })}
                placeholder="https://t.me/…"
              />
              <Field
                id="company-email"
                label="Почта компании"
                value={form.email}
                disabled={readOnly}
                onChange={(email) => setForm({ ...form, email })}
              />
            </div>
          </section>

          <section className="surface-card space-y-5 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Чем занимаетесь</h2>
              <p className="mt-1 text-sm text-muted-foreground">Можно выбрать несколько.</p>
            </div>
            <ChipGroup
              label="Услуги"
              options={companyServiceOptions}
              selected={form.services ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("services", v)}
            />
            <ChipGroup
              label="Где работаете"
              options={companyCountryOptions}
              selected={form.countries ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("countries", v)}
            />
            <ChipGroup
              label="Откуда туристы"
              options={clientCountryOptions}
              selected={form.clientCountries ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("clientCountries", v)}
            />
            <ChipGroup
              label="Языки"
              options={languageOptions}
              selected={form.languages ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("languages", v)}
            />
          </section>

          <section className="surface-card space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Фото и видео</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Отели, экскурсии, офис. Турист выбирает глазами.
              </p>
            </div>
            <PhotoGrid
              photos={photos}
              disabled={readOnly}
              onChange={(next) => setForm({ ...form, photos: next })}
            />
            <VideoList
              videos={videos}
              disabled={readOnly}
              onChange={(next) => setForm({ ...form, videos: next })}
            />
          </section>

          <section className="surface-card space-y-4 p-6">
            <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
              <p className="flex items-center gap-2 font-display font-semibold">
                <BadgeCheck className="size-5 text-success" />
                Знак «Проверенная компания»
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Компании со знаком обычно получают больше бронирований: туристы спокойнее оставляют
                заявку.
              </p>
            </div>
            <div className="space-y-2">
              {documentOptions.map((doc) => {
                const on = documents.includes(doc);
                return (
                  <label
                    key={doc}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
                      on ? "border-success/40 bg-success/5" : "border-border",
                      readOnly && "pointer-events-none opacity-70",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className={cn("size-4", on ? "text-success" : "text-muted-foreground")} />
                      {doc}
                    </span>
                    <span className={cn("text-xs font-semibold", on ? "text-success" : "text-primary")}>
                      {on ? "Добавлено" : "Добавить"}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      disabled={readOnly}
                      onChange={() =>
                        setForm({
                          ...form,
                          documents: on ? documents.filter((d) => d !== doc) : [...documents, doc],
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
            <Button
              variant="outline"
              disabled={readOnly || documents.length === 0 || verified}
              onClick={() => {
                submitForVerification(organization.id, documents);
                toast.success("Документы отправлены. Кабинет уже открыт, знак появится после проверки.");
              }}
            >
              <ShieldCheck className="size-4" />
              {verified ? "Проверка пройдена" : "Отправить на проверку"}
            </Button>
            {organization.verificationSubmittedAt && !verified ? (
              <p className="text-xs text-muted-foreground">
                Отправлено{" "}
                {new Date(organization.verificationSubmittedAt).toLocaleString("ru-RU")}
              </p>
            ) : null}
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Команда</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Менеджер видит заявки и отвечает туристам.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {members.map((m) => {
                const u = state.users.find((x) => x.id === m.userId);
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2"
                  >
                    <span>
                      {u?.name} · {m.role === "OPERATOR_ADMIN" ? "владелец" : "менеджер"}
                    </span>
                    {user.role === "OPERATOR_ADMIN" && m.role === "OPERATOR_MANAGER" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            members: s.members.filter((x) => x.id !== m.id),
                            users: s.users.filter((x) => x.id !== m.userId),
                          }));
                        }}
                      >
                        Удалить
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {user.role === "OPERATOR_ADMIN" ? (
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="manager@company.kz"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const email = managerEmail.trim().toLowerCase();
                    if (!email) return;
                    const id = uid();
                    setState((s) => ({
                      ...s,
                      users: [
                        ...s.users,
                        {
                          id,
                          email,
                          password: DEMO_PASSWORD,
                          name: email.split("@")[0]!,
                          city: organization.city,
                          role: "OPERATOR_MANAGER",
                          status: "active",
                          organizationId: organization.id,
                          createdAt: nowIso(),
                        },
                      ],
                      members: [
                        ...s.members,
                        {
                          id: uid(),
                          organizationId: organization.id,
                          userId: id,
                          role: "OPERATOR_MANAGER",
                        },
                      ],
                    }));
                    setManagerEmail("");
                    toast.success("Сотрудник добавлен");
                  }}
                >
                  Добавить
                </Button>
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3 pb-8">
            <Button disabled={readOnly} onClick={save}>
              Сохранить страницу
            </Button>
            <Button variant="outline" asChild>
              <Link to="/company/$companyId" params={{ companyId: organization.id }}>
                Открыть как турист
              </Link>
            </Button>
          </div>
        </div>

        <CompanyPreview form={form} verified={verified} />
      </div>
    </DashShell>
  );
}

function CompanyPreview({ form, verified }: { form: Organization; verified: boolean }) {
  return (
    <aside className="xl:sticky xl:top-24">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Как увидит турист
      </p>
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="relative h-28 bg-secondary">
          {form.coverUrl ? (
            <img src={form.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-[linear-gradient(120deg,oklch(0.55_0.13_250),oklch(0.45_0.1_265))]" />
          )}
        </div>
        <div className="space-y-3 p-4">
          <div className="-mt-10 flex items-end gap-3">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt=""
                className="size-14 rounded-2xl border-2 border-card object-cover"
              />
            ) : (
              <span className="grid size-14 place-items-center rounded-2xl border-2 border-card bg-primary/10 font-display text-sm font-semibold text-primary">
                {form.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            {verified ? (
              <span className="mb-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
                Проверена
              </span>
            ) : null}
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-snug">{form.name}</p>
            <p className="text-xs text-muted-foreground">
              {form.city}
              {form.country ? `, ${form.country}` : ""}
            </p>
          </div>
          {form.about ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">{form.about}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Добавьте короткое описание компании.</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(form.services ?? []).slice(0, 4).map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </article>
    </aside>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

async function loadImage(file: File | undefined, onOk: (url: string) => void) {
  if (!file) return;
  try {
    onOk(await readImageFile(file));
  } catch {
    toast.error("Не удалось загрузить фото");
  }
}

function CoverField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className={cn(
        "relative block overflow-hidden rounded-2xl border border-dashed border-border",
        !disabled && "cursor-pointer hover:border-primary/50",
      )}
    >
      {value ? (
        <img src={value} alt="" className="h-36 w-full object-cover md:h-44" />
      ) : (
        <div className="flex h-36 flex-col items-center justify-center gap-1 text-sm text-muted-foreground md:h-44">
          <ImagePlus className="size-5" />
          Обложка страницы
        </div>
      )}
      {value && !disabled ? (
        <button
          type="button"
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/90"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          void loadImage(e.target.files?.[0], onChange);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function LogoField({
  value,
  name,
  disabled,
  onChange,
}: {
  value: string;
  name: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className={cn(
        "relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-border",
        !disabled && "cursor-pointer hover:border-primary/50",
      )}
    >
      {value ? (
        <img src={value} alt="" className="size-full object-cover" />
      ) : (
        <span className="px-2 text-center text-[11px] text-muted-foreground">
          {name.slice(0, 2).toUpperCase() || "Лого"}
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          void loadImage(e.target.files?.[0], onChange);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function PhotoGrid({
  photos,
  disabled,
  onChange,
}: {
  photos: string[];
  disabled: boolean;
  onChange: (photos: string[]) => void;
}) {
  const [url, setUrl] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Можно загрузить до ${MAX_PHOTOS} фото`);
      return;
    }
    try {
      const next = await Promise.all([...files].slice(0, room).map((file) => readImageFile(file)));
      onChange([...photos, ...next]);
    } catch {
      toast.error("Не удалось загрузить фото");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((src, i) => (
          <div key={`${src.slice(0, 20)}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <img src={src} alt="" className="size-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                aria-label="Удалить фото"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-card/90"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && !disabled ? (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50">
            <ImagePlus className="size-4" />
            Фото
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      {!disabled ? (
        <div className="flex gap-2">
          <Input
            value={url}
            placeholder="Или ссылка на фото"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const value = url.trim();
                if (!value) return;
                onChange([...photos, value]);
                setUrl("");
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const value = url.trim();
              if (!value) return;
              onChange([...photos, value]);
              setUrl("");
            }}
          >
            Добавить
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function VideoList({
  videos,
  disabled,
  onChange,
}: {
  videos: string[];
  disabled: boolean;
  onChange: (videos: string[]) => void;
}) {
  const [url, setUrl] = useState("");

  const add = () => {
    const value = url.trim();
    if (!value) return;
    if (videos.length >= MAX_VIDEOS) {
      toast.error(`Можно добавить до ${MAX_VIDEOS} видео`);
      return;
    }
    onChange([...videos, value]);
    setUrl("");
  };

  return (
    <div className="space-y-2">
      <Label>Видео (YouTube)</Label>
      {videos.map((src) => {
        const embed = youtubeEmbed(src);
        return (
          <div key={src} className="overflow-hidden rounded-xl border border-border">
            {embed ? (
              <iframe title="Видео компании" src={embed} className="aspect-video w-full" allowFullScreen />
            ) : (
              <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm">
                <Video className="size-4" />
                {src}
              </a>
            )}
            {!disabled ? (
              <div className="flex justify-end border-t border-border p-2">
                <Button size="sm" variant="ghost" onClick={() => onChange(videos.filter((v) => v !== src))}>
                  Удалить
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
      {!disabled && videos.length < MAX_VIDEOS ? (
        <div className="flex gap-2">
          <Input
            value={url}
            placeholder="https://youtu.be/…"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={add}>
            Добавить видео
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  disabled,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  disabled: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-60",
                active
                  ? "border-primary bg-primary-soft text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
