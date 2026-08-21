import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { title: "Создать страницу компании — TourGo" },
      {
        name: "description",
        content: "Регистрация туристической компании в TourGo: данные, услуги, страны и проверка.",
      },
    ],
  }),
  component: CompanySignupPage,
});

const stepTitles = [
  "Ваши данные",
  "Данные компании",
  "Чем занимается компания",
  "Страны работы",
  "Языки",
  "Проверка компании",
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
      return Boolean(person.firstName.trim() && person.phone.trim() && person.email.trim());
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
    toast.success("Компания создана. Мы проверим данные и включим знак «Проверенная компания».");
    void navigate({ to: "/operator" });
  };

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Создать страницу компании
          </h1>
          <p className="mt-3 text-muted-foreground">
            Шаг {step + 1} из {stepTitles.length} · {stepTitles[step]}
          </p>

          <div className="mt-5 flex gap-1.5">
            {stepTitles.map((title, i) => (
              <span
                key={title}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= step ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>

          <div className="surface-card mt-8 space-y-5 p-6 md:p-8">
            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="first-name"
                  label="Имя"
                  value={person.firstName}
                  onChange={(v) => setPerson({ ...person, firstName: v })}
                />
                <Field
                  id="last-name"
                  label="Фамилия"
                  value={person.lastName}
                  onChange={(v) => setPerson({ ...person, lastName: v })}
                />
                <Field
                  id="person-phone"
                  label="Телефон"
                  value={person.phone}
                  onChange={(v) => setPerson({ ...person, phone: v })}
                  placeholder="+971 50 000 00 00"
                />
                <Field
                  id="person-email"
                  label="Электронная почта"
                  type="email"
                  value={person.email}
                  onChange={(v) => setPerson({ ...person, email: v })}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="person-password"
                    label="Пароль"
                    type="password"
                    value={person.password}
                    onChange={(v) => setPerson({ ...person, password: v })}
                    hint="Минимум 8 символов. Если оставить пустым, используем демо-пароль."
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
                  label="Страна"
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
                <Field
                  id="company-phone"
                  label="Телефон компании"
                  value={company.phone}
                  onChange={(v) => setCompany({ ...company, phone: v })}
                />
                <Field
                  id="company-email"
                  label="Электронная почта компании"
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
                    placeholder="Работаем в Дубае с 2018 года. Организуем семейные поездки, экскурсии, трансферы и индивидуальные программы."
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <CheckGroup
                title="Какие услуги вы предлагаете?"
                options={companyServiceOptions}
                selected={services}
                onToggle={(v) => toggle(services, setServices, v)}
              />
            ) : null}

            {step === 3 ? (
              <div className="space-y-8">
                <CheckGroup
                  title="В каких странах работает компания?"
                  options={companyCountryOptions}
                  selected={countries}
                  onToggle={(v) => toggle(countries, setCountries, v)}
                />
                <CheckGroup
                  title="Из каких стран принимаете клиентов?"
                  options={clientCountryOptions}
                  selected={clientCountries}
                  onToggle={(v) => toggle(clientCountries, setClientCountries, v)}
                />
              </div>
            ) : null}

            {step === 4 ? (
              <CheckGroup
                title="На каких языках можете общаться с туристами?"
                options={languageOptions}
                selected={languages}
                onToggle={(v) => toggle(languages, setLanguages, v)}
              />
            ) : null}

            {step === 5 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Подтвердите данные компании
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Загрузите документ о регистрации и лицензию, если она нужна в вашей стране.
                    Проверка занимает до двух рабочих дней.
                  </p>
                </div>

                <div className="space-y-2">
                  {["Документ о регистрации", "Лицензия", "Другой документ"].map((doc) => (
                    <label
                      key={doc}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-primary/40"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        {doc}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          documents.includes(doc) ? "text-success" : "text-primary",
                        )}
                      >
                        {documents.includes(doc) ? "Загружено ✓" : "Загрузить"}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={documents.includes(doc)}
                        onChange={() => toggle(documents, setDocuments, doc)}
                      />
                    </label>
                  ))}
                </div>

                <p className="flex items-start gap-2 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  После проверки на странице компании появится знак «Проверенная компания TourGo».
                  До этого вы уже можете добавлять туры и отвечать на заявки.
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
              {step < stepTitles.length - 1 ? (
                <Button
                  onClick={() => {
                    if (!canContinue()) {
                      toast.error("Заполните обязательные поля");
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                >
                  Далее
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={saving}>
                  <Check className="size-4" />
                  Отправить на проверку
                </Button>
              )}
            </div>
          </div>
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
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Можно выбрать несколько.</p>
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
