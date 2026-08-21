import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  head: () => ({ meta: [{ title: "Страница компании — TourGo" }] }),
  component: OperatorCompanyPage,
});

const documentOptions = ["Документ о регистрации", "Лицензия", "Другой документ"];

function OperatorCompanyPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  /** Черновик поверх стора: организация приходит после гидрации, форма не должна залипать на null. */
  const [draft, setDraft] = useState<Organization | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const form = draft ?? organization;
  if (!allowed || !organization || !user || !form) return null;
  const setForm = setDraft;

  const members = state.members.filter((m) => m.organizationId === organization.id);
  const readOnly = user.role === "OPERATOR_MANAGER";
  const documents = form.documents ?? [];

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
    toast.success("Страница компании обновлена");
  };

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Страница компании"
      subtitle="Так вас видят туристы"
      actions={
        organization.status === "APPROVED" ? (
          <Badge className="bg-success/12 text-success">
            <BadgeCheck className="mr-1 size-3.5" />
            Компания проверена TourGo
          </Badge>
        ) : (
          <Badge className="bg-premium/15 text-premium">Компания проверяется</Badge>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Основное</h2>
          {(
            [
              ["name", "Название компании"],
              ["legalName", "Юридическое название"],
              ["registrationNumber", "БИН или регистрационный номер"],
              ["city", "Город"],
              ["country", "Страна"],
              ["contactPerson", "Контактное лицо"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`company-${key}`}>{label}</Label>
              <Input
                id={`company-${key}`}
                value={String(form[key] ?? "")}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="company-about">О компании</Label>
            <Textarea
              id="company-about"
              rows={4}
              value={form.about ?? ""}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="Работаем в Дубае с 2018 года. Организуем семейные поездки, экскурсии, трансферы и индивидуальные программы."
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Контакты и фото</h2>
            {(
              [
                ["phone", "Телефон"],
                ["whatsapp", "WhatsApp"],
                ["website", "Сайт"],
                ["instagram", "Instagram"],
                ["telegram", "Telegram"],
                ["logoUrl", "Ссылка на логотип"],
                ["coverUrl", "Ссылка на основное фото"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`contact-${key}`}>{label}</Label>
                <Input
                  id={`contact-${key}`}
                  value={String(form[key] ?? "")}
                  disabled={readOnly && key !== "phone"}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="surface-card space-y-5 p-6">
            <h2 className="font-display text-lg font-semibold">Фотографии и видео</h2>
            <p className="text-sm text-muted-foreground">
              Добавьте ссылки на фото отелей и экскурсий, а также видео — турист выбирает глазами.
            </p>
            <MediaList
              label="Фотографии"
              placeholder="https://…/photo.jpg"
              items={form.photos ?? []}
              disabled={readOnly}
              onChange={(photos) => setForm({ ...form, photos })}
            />
            <MediaList
              label="Видео"
              placeholder="https://youtu.be/…"
              items={form.videos ?? []}
              disabled={readOnly}
              onChange={(videos) => setForm({ ...form, videos })}
            />
          </div>

          <div className="surface-card space-y-5 p-6">
            <h2 className="font-display text-lg font-semibold">Чем занимается компания</h2>
            <ChipGroup
              label="Услуги"
              options={companyServiceOptions}
              selected={form.services ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("services", v)}
            />
            <ChipGroup
              label="Страны работы"
              options={companyCountryOptions}
              selected={form.countries ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("countries", v)}
            />
            <ChipGroup
              label="Принимаем клиентов из"
              options={clientCountryOptions}
              selected={form.clientCountries ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("clientCountries", v)}
            />
            <ChipGroup
              label="Языки общения"
              options={languageOptions}
              selected={form.languages ?? []}
              disabled={readOnly}
              onToggle={(v) => toggleList("languages", v)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={user.role !== "OPERATOR_ADMIN"} onClick={save}>
          Сохранить страницу
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Проверка компании</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Отметьте документы, которые готовы предоставить, и отправьте на проверку.
          </p>
          <div className="mt-4 space-y-2">
            {documentOptions.map((doc) => (
              <label
                key={doc}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
                  documents.includes(doc) ? "border-success/50 bg-success/5" : "border-border",
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  {doc}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {documents.includes(doc) ? "Готово ✓" : "Добавить"}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={documents.includes(doc)}
                  onChange={() =>
                    setForm({
                      ...form,
                      documents: documents.includes(doc)
                        ? documents.filter((d) => d !== doc)
                        : [...documents, doc],
                    })
                  }
                />
              </label>
            ))}
          </div>
          <Button
            className="mt-5"
            variant="outline"
            disabled={user.role !== "OPERATOR_ADMIN" || documents.length === 0}
            onClick={() => {
              submitForVerification(organization.id, documents);
              toast.success("Документы отправлены на проверку");
            }}
          >
            <ShieldCheck className="size-4" />
            Отправить на проверку
          </Button>
          {organization.verificationSubmittedAt ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Отправлено {new Date(organization.verificationSubmittedAt).toLocaleString("ru-RU")}
            </p>
          ) : null}
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Сотрудники</h2>
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
                placeholder="manager@company.demo"
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
        </div>
      </div>
    </DashShell>
  );
}

function MediaList({
  label,
  placeholder,
  items,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  disabled: boolean;
  onChange: (items: string[]) => void;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const url = value.trim();
    if (!url) return;
    onChange([...items, url]);
    setValue("");
  };

  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((url) => (
            <li
              key={url}
              className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2 text-sm"
            >
              <span className="truncate">{url}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => onChange(items.filter((i) => i !== url))}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" disabled={disabled} onClick={add}>
          Добавить
        </Button>
      </div>
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
                  ? "border-primary bg-primary text-primary-foreground"
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
