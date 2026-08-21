import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput, parsePhoneDigits } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/platform/auth";
import {
  clientCountryOptions,
  companyCountryOptions,
  companyServiceOptions,
  findOrgByEmail,
  languageOptions,
  submitForVerification,
  updateCompanyProfile,
} from "@/lib/platform/company";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company-signup")({
  head: () => ({
    meta: [
      { title: "Создать страницу компании · TourGo" },
      {
        name: "description",
        content: "Добавьте турфирму: данные, услуги, страны. После проверки появится знак, с ним обычно больше бронирований.",
      },
    ],
  }),
  component: CompanySignupPage,
});

const steps = [
  {
    title: "Ваши данные",
    hint: "Это контакт, с которым турист свяжется, если выберет вас.",
  },
  {
    title: "Компания",
    hint: "Так страница будет выглядеть в каталоге и в заявках.",
  },
  {
    title: "Услуги",
    hint: "Покажем заявки, которые вам подходят.",
  },
  {
    title: "Страны",
    hint: "Где работаете и откуда принимаете туристов.",
  },
  {
    title: "Языки",
    hint: "Туристы видят, на каком языке с ними поговорят.",
  },
  {
    title: "Проверка",
    hint: "Знак «Проверенная компания» обычно даёт больше бронирований.",
  },
];

function CompanySignupPage() {
  const navigate = useNavigate();
  const { registerOperator } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [person, setPerson] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [company, setCompany] = useState({
    name: "",
    country: "ОАЭ",
    city: "Дубай",
    legalName: "",
    registrationNumber: "",
    phone: "",
    email: "",
    website: "",
    about: "",
  });
  const [services, setServices] = useState<string[]>(["Туры"]);
  const [countries, setCountries] = useState<string[]>(["ОАЭ"]);
  const [clientCountries, setClientCountries] = useState<string[]>(["Казахстан"]);
  const [languages, setLanguages] = useState<string[]>(["Русский"]);
  const [documents, setDocuments] = useState<string[]>([]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canContinue = () => {
    if (step === 0) {
      return Boolean(
        person.firstName.trim() &&
          parsePhoneDigits(person.phone).length >= 11 &&
          person.email.trim(),
      );
    }
    if (step === 1) return Boolean(company.name.trim() && company.city.trim());
    if (step === 2) return services.length > 0;
    if (step === 3) return countries.length > 0 && clientCountries.length > 0;
    if (step === 4) return languages.length > 0;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    const contactPerson = `${person.firstName} ${person.lastName}`.trim();
    const res = await registerOperator({
      name: contactPerson || company.name,
      email: person.email,
      ...(person.password ? { password: person.password } : {}),
      company: {
        name: company.name,
        legalName: company.legalName || company.name,
        registrationNumber: company.registrationNumber,
        country: company.country,
        city: company.city,
        address: "",
        phone: company.phone || person.phone,
        email: company.email || person.email,
        website: company.website,
        contactPerson,
      },
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось создать компанию");
      return;
    }

    const org = findOrgByEmail(company.email || person.email);
    if (org) {
      updateCompanyProfile(org.id, {
        services,
        countries,
        clientCountries,
        languages,
        about: company.about,
      });
      if (documents.length > 0) submitForVerification(org.id, documents);
    }
    toast.success(
      documents.length
        ? "Компания создана. Документы на проверке. Со знаком обычно больше бронирований."
        : "Компания создана. Кабинет уже открыт. Документы можно добавить позже.",
    );
    void navigate({ to: "/operator" });
  };

  const current = steps[step]!;

  return (
    <SiteLayout>
      <div className="border-b border-border/70 bg-secondary/25">
        <div className="container-page py-6 md:py-8">
          <p className="text-sm font-medium text-primary">Для турфирм</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
            Создать страницу компании
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Несколько коротких шагов. После этого можно добавлять туры и отвечать на заявки.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="mx-auto max-w-3xl">
          <ol className="hidden gap-2 sm:grid sm:grid-cols-6">
            {steps.map((item, i) => (
              <li key={item.title} className="min-w-0">
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    i < step ? "bg-success" : i === step ? "bg-primary" : "bg-secondary",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-[11px] font-medium",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {i + 1}. {item.title}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-sm font-medium sm:hidden">
            Шаг {step + 1} из {steps.length} · {current.title}
          </p>

          <div className="surface-card mt-6 space-y-6 p-6 md:p-8">
            <div>
              <h2 className="font-display text-xl font-semibold">{current.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
            </div>

            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="first-name"
                  label="Имя"
                  value={person.firstName}
                  onChange={(v) => setPerson({ ...person, firstName: v })}
                  placeholder="Алишер"
                />
                <Field
                  id="last-name"
                  label="Фамилия"
                  value={person.lastName}
                  onChange={(v) => setPerson({ ...person, lastName: v })}
                />
                <div className="space-y-2">
                  <Label htmlFor="person-phone">Телефон или WhatsApp</Label>
                  <PhoneInput
                    id="person-phone"
                    value={person.phone}
                    onChange={(phone) => setPerson({ ...person, phone })}
                  />
                </div>
                <Field
                  id="person-email"
                  label="Электронная почта"
                  type="email"
                  value={person.email}
                  onChange={(v) => setPerson({ ...person, email: v })}
                  placeholder="you@company.kz"
                />
                <div className="sm:col-span-2">
                  <Field
                    id="person-password"
                    label="Пароль для входа"
                    type="password"
                    value={person.password}
                    onChange={(v) => setPerson({ ...person, password: v })}
                    hint="Минимум 8 символов. Если оставить пустым, кабинет всё равно откроется."
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="company-name"
                  label="Название компании"
                  value={company.name}
                  onChange={(v) => setCompany({ ...company, name: v })}
                  placeholder="Dubai Travel"
                />
                <Field
                  id="company-country"
                  label="Страна офиса"
                  value={company.country}
                  onChange={(v) => setCompany({ ...company, country: v })}
                />
                <Field
                  id="company-city"
                  label="Город"
                  value={company.city}
                  onChange={(v) => setCompany({ ...company, city: v })}
                />
                <Field
                  id="company-legal"
                  label="Юридическое название"
                  value={company.legalName}
                  onChange={(v) => setCompany({ ...company, legalName: v })}
                />
                <Field
                  id="company-reg"
                  label="БИН или регистрационный номер"
                  value={company.registrationNumber}
                  onChange={(v) => setCompany({ ...company, registrationNumber: v })}
                />
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Телефон компании</Label>
                  <PhoneInput
                    id="company-phone"
                    value={company.phone}
                    onChange={(phone) => setCompany({ ...company, phone })}
                  />
                </div>
                <Field
                  id="company-email"
                  label="Почта компании"
                  type="email"
                  value={company.email}
                  onChange={(v) => setCompany({ ...company, email: v })}
                />
                <Field
                  id="company-site"
                  label="Сайт"
                  value={company.website}
                  onChange={(v) => setCompany({ ...company, website: v })}
                  placeholder="https://"
                />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-about">О компании</Label>
                  <Textarea
                    id="company-about"
                    rows={3}
                    value={company.about}
                    onChange={(e) => setCompany({ ...company, about: e.target.value })}
                    placeholder="Работаем в Дубае с 2018 года. Семейные поездки, экскурсии, трансферы."
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <CheckGroup
                options={companyServiceOptions}
                selected={services}
                onToggle={(v) => toggle(services, setServices, v)}
              />
            ) : null}

            {step === 3 ? (
              <div className="space-y-8">
                <CheckGroup
                  title="Где работаете"
                  options={companyCountryOptions}
                  selected={countries}
                  onToggle={(v) => toggle(countries, setCountries, v)}
                />
                <CheckGroup
                  title="Откуда принимаете туристов"
                  options={clientCountryOptions}
                  selected={clientCountries}
                  onToggle={(v) => toggle(clientCountries, setClientCountries, v)}
                />
              </div>
            ) : null}

            {step === 4 ? (
              <CheckGroup
                options={languageOptions}
                selected={languages}
                onToggle={(v) => toggle(languages, setLanguages, v)}
              />
            ) : null}

            {step === 5 ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-success/30 bg-success/5 p-5">
                  <p className="flex items-center gap-2 font-display text-lg font-semibold">
                    <BadgeCheck className="size-5 text-success" />
                    Знак «Проверенная компания»
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Компании, которые прошли проверку и получили знак, обычно получают больше
                    бронирований. Туристы чаще выбирают тех, у кого есть отметка на странице.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li>Знак виден на странице компании и в предложениях</li>
                    <li>Туристы спокойнее оставляют заявку и выбирают вас</li>
                    <li>Кабинет открыт уже сейчас, ждать проверку не обязательно</li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-secondary/50 p-4 text-sm">
                  <p className="font-semibold">{company.name || "Название компании"}</p>
                  <p className="mt-1 text-muted-foreground">
                    {company.city}
                    {company.country ? `, ${company.country}` : ""}
                    {services.length ? ` · ${services.join(", ")}` : ""}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Документы для знака</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Регистрация и лицензия, если она нужна в вашей стране. Проверка занимает до двух
                    рабочих дней.
                  </p>
                  <div className="mt-3 space-y-2">
                    {["Документ о регистрации", "Лицензия", "Другой документ"].map((doc) => {
                      const on = documents.includes(doc);
                      return (
                        <label
                          key={doc}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                            on ? "border-success/40 bg-success/5" : "border-border hover:border-primary/40",
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
                            onChange={() => toggle(documents, setDocuments, doc)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  Без документов кабинет всё равно откроется. Знак появится после проверки и обычно
                  помогает получить больше бронирований.
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="size-4" />
                Назад
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  onClick={() => {
                    if (!canContinue()) {
                      toast.error(
                        step === 0
                          ? "Укажите имя, телефон и почту"
                          : "Заполните обязательные поля",
                      );
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                >
                  Далее
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => void submit()} disabled={saving}>
                  <Check className="size-4" />
                  {documents.length ? "Отправить на проверку" : "Создать и открыть кабинет"}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть кабинет?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        className="h-11"
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      <p className={cn("text-sm text-muted-foreground", title ? "mt-1" : "")}>Можно выбрать несколько.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                active
                  ? "border-primary bg-primary-soft text-foreground"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active ? <Check className="size-3.5" /> : null}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
