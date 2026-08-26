import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useState } from "react";
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
  companyCategories,
  findOrgByEmail,
  languageOptions,
  updateCompanyProfile,
} from "@/lib/platform/company";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company-signup")({
  head: () => ({
    meta: [
      { title: "Добавить турфирму: получать заявки от туристов · TourGo" },
      {
        name: "description",
        content:
          "Откройте кабинет: туристы оставляют заявки, вы отвечаете ценой. Клиент и оплата - ваши.",
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
    title: "Категория",
    hint: "Чем занимается компания? Можно выбрать несколько направлений.",
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
    hint: "Туристы видят, на каком языке с ними поговорят. Документы на проверку загрузите потом в кабинете.",
  },
];

const DRAFT_KEY = "tourgo:company-signup-draft";

function CompanySignupPage() {
  const navigate = useNavigate();
  const { registerOperator, registerCompanyForCurrentUser, isAuthenticated, organization } =
    useAuth();
  const [pendingEmail, setPendingEmail] = useState("");
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
    address: "",
    phone: "",
    email: "",
    website: "",
    about: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>(["ОАЭ"]);
  const [clientCountries, setClientCountries] = useState<string[]>(["Казахстан"]);
  const [languages, setLanguages] = useState<string[]>(["Русский"]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // Пользователь подтвердил почту и вернулся: достраиваем компанию из черновика.
  useEffect(() => {
    if (!isAuthenticated || organization) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        person: typeof person;
        company: typeof company;
        categories: string[];
        services: string[];
        countries: string[];
        clientCountries: string[];
        languages: string[];
      };
      sessionStorage.removeItem(DRAFT_KEY);
      const contactPerson =
        `${draft.person.firstName} ${draft.person.lastName}`.trim() || draft.company.name;
      void registerCompanyForCurrentUser({
        name: draft.company.name,
        legalName: draft.company.legalName || draft.company.name,
        registrationNumber: draft.company.registrationNumber,
        country: draft.company.country,
        city: draft.company.city,
        address: draft.company.address,
        phone: draft.company.phone || draft.person.phone,
        email: draft.company.email || draft.person.email,
        website: draft.company.website,
        contactPerson,
      }).then((res) => {
        if (!res.ok) {
          toast.error(res.error ?? "Не удалось создать компанию");
          return;
        }
        const org = findOrgByEmail(draft.company.email || draft.person.email);
        if (org) {
          updateCompanyProfile(org.id, {
            services: draft.services,
            countries: draft.countries,
            clientCountries: draft.clientCountries,
            languages: draft.languages,
            about: draft.company.about,
          });
        }
        toast.success("Почта подтверждена, компания создана. Добро пожаловать в кабинет!");
        void navigate({ to: "/operator" });
      });
    } catch {
      /* повреждённый черновик игнорируем */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const canContinue = () => {
    if (step === 0) {
      return Boolean(
        person.firstName.trim() &&
        parsePhoneDigits(person.phone).length >= 11 &&
        person.email.trim(),
      );
    }
    if (step === 1) return Boolean(company.name.trim() && company.city.trim());
    if (step === 2) return categories.length > 0;
    if (step === 3) return services.length > 0;
    if (step === 4) return countries.length > 0 && clientCountries.length > 0;
    if (step === 5) return languages.length > 0;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    const contactPerson = `${person.firstName} ${person.lastName}`.trim();
    const companyInput = {
      name: company.name,
      legalName: company.legalName || company.name,
      registrationNumber: company.registrationNumber,
      country: company.country,
      city: company.city,
      address: company.address,
      phone: company.phone || person.phone,
      email: company.email || person.email,
      website: company.website,
      contactPerson,
    };
    const res = isAuthenticated
      ? await registerCompanyForCurrentUser(companyInput)
      : await registerOperator({
          name: contactPerson || company.name,
          email: person.email,
          ...(person.password ? { password: person.password } : {}),
          company: companyInput,
        });
    setSaving(false);
    if (!res.ok) {
      if (res.error === "CONFIRM_EMAIL") {
        // Компания достроится сама после подтверждения почты и входа.
        try {
          sessionStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              person: { ...person, password: "" },
              company,
              categories,
              services,
              countries,
              clientCountries,
              languages,
            }),
          );
        } catch {
          // без sessionStorage просто попросим пройти визард заново
        }
        setPendingEmail(person.email);
        return;
      }
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
    }
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* noop */
    }
    toast.success(
      "Компания создана, кабинет открыт. Документы на проверку — в разделе «Компания».",
    );
    void navigate({ to: "/operator" });
  };

  const current = steps[step]!;

  // Подтверждение почты включено в Supabase: показываем понятный экран
  // вместо тоста. Черновик компании сохранён и достроится после входа.
  if (pendingEmail) {
    return (
      <SiteLayout>
        <div className="container-page py-16">
          <div className="surface-card mx-auto max-w-lg p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Check className="size-7" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold">Подтвердите почту</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Мы отправили письмо на{" "}
              <span className="font-semibold text-foreground">{pendingEmail}</span>. Перейдите по
              ссылке из письма, затем войдите — компания создастся автоматически, все данные визарда
              сохранены.
            </p>
            <Button className="mt-6 w-full" size="lg" asChild>
              <Link to="/login" search={{ next: "/company-signup" } as never}>
                Я подтвердил почту — войти
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => setPendingEmail("")}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Изменить данные
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="border-b border-border/70 bg-secondary/25">
        <div className="container-page py-6 md:py-8">
          <p className="text-sm font-medium text-primary">Кабинет турфирмы на TourGo</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
            Подключите компанию и получайте заявки
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Несколько коротких шагов. Сразу можно выкладывать туры и отвечать туристам. Знак
            проверки появится после документов.
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
                  id="company-address"
                  label="Адрес офиса"
                  value={company.address}
                  onChange={(v) => setCompany({ ...company, address: v })}
                  placeholder="Улица, дом, офис"
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
              <div className="grid gap-3 sm:grid-cols-2">
                {companyCategories.map((category) => {
                  const on = categories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        toggle(categories, setCategories, category.id);
                        // Услуги снятой категории убираем, чтобы не уехали в заявку.
                        if (on) {
                          setServices(services.filter((v) => !category.services.includes(v)));
                        }
                      }}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-colors",
                        on
                          ? "border-primary bg-primary-soft/60"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-base font-semibold">
                          {category.label}
                        </span>
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-full border",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card",
                          )}
                        >
                          {on ? <Check className="size-3" /> : null}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {category.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-8">
                {companyCategories
                  .filter((category) => categories.includes(category.id))
                  .map((category) => (
                    <CheckGroup
                      key={category.id}
                      title={category.label}
                      options={category.services}
                      selected={services}
                      onToggle={(v) => toggle(services, setServices, v)}
                    />
                  ))}
              </div>
            ) : null}

            {step === 4 ? (
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

            {step === 5 ? (
              <CheckGroup
                options={languageOptions}
                selected={languages}
                onToggle={(v) => toggle(languages, setLanguages, v)}
              />
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
                        step === 0 ? "Укажите имя, телефон и почту" : "Заполните обязательные поля",
                      );
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                >
                  Далее
                </Button>
              ) : (
                <div className="space-y-2 text-right">
                  <Button onClick={() => void submit()} disabled={saving}>
                    <Check className="size-4" />
                    {saving ? "Создаём…" : "Создать компанию"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Кабинет откроется сразу. Документы на проверку — потом, в разделе «Компания».
                  </p>
                </div>
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
      <p className={cn("text-sm text-muted-foreground", title ? "mt-1" : "")}>
        Можно выбрать несколько.
      </p>
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
