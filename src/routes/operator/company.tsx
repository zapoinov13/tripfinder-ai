import { Link, createFileRoute } from "@tanstack/react-router";

import { reviewCompanyCard, type CompanyReview } from "@/lib/company-review.functions";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  Camera,
  Check,
  ExternalLink,
  Globe,
  ImagePlus,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";

import { TabPills } from "@/components/admin";
import { BookingScheduleEditor } from "@/components/operator/booking-schedule-editor";
import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import {
  VerificationDocumentsPanel,
  canSubmitVerification,
  hasRequiredDocument,
} from "@/components/operator/verification-documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { readImageFile, youtubeEmbed } from "@/lib/image-file";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { requestsForDate } from "@/lib/platform/service-requests";
import {
  clientCountryOptions,
  companyCountryOptions,
  serviceGroupsForCategory,
  languageOptions,
  submitForVerification,
  updateCompanyProfile,
} from "@/lib/platform/company";
import type { CompanyDocument } from "@/lib/platform/company-documents";
import { usePlatformStore } from "@/lib/platform/hooks";
import { DEMO_PASSWORD } from "@/lib/platform/seed";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/operator/company")({
  head: () => privatePage("Страница компании · TourGo"),
  component: OperatorCompanyPage,
});

const MAX_PHOTOS = 12;
const MAX_VIDEOS = 3;

type SectionId = "face" | "contacts" | "schedule" | "services" | "media" | "verification" | "team";

const sections: { id: SectionId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "face", label: "Лицо", icon: Building2 },
  { id: "contacts", label: "Контакты", icon: Phone },
  { id: "schedule", label: "Расписание", icon: CalendarClock },
  { id: "services", label: "Услуги", icon: Briefcase },
  { id: "media", label: "Медиа", icon: Camera },
  { id: "verification", label: "Проверка", icon: ShieldCheck },
  { id: "team", label: "Команда", icon: Users },
];

function OperatorCompanyPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  const [draft, setDraft] = useState<Organization | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("face");
  // Состав документов приходит из панели: она их и грузит с сервера.
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});
  const form = draft ?? organization;

  // Хуки обязаны выполняться до любого раннего return: организация приезжает
  // асинхронно, и хук после return менял их количество между рендерами.
  const photoCount = (form?.photos ?? []).length;
  // «Проверка пройдена» — про документы, а не про то, что кабинет открыт.
  const verified = Boolean(organization?.documentsVerifiedAt);
  const checks = useMemo(
    () => [
      { ok: Boolean(form?.logoUrl), label: "Логотип", section: "face" as const },
      { ok: Boolean(form?.coverUrl), label: "Обложка", section: "face" as const },
      { ok: Boolean(form?.about?.trim()), label: "Описание", section: "face" as const },
      { ok: photoCount > 0, label: "Фото", section: "media" as const },
      {
        ok: Boolean(form?.phone || form?.whatsapp),
        label: "Телефон",
        section: "contacts" as const,
      },
      { ok: Boolean(verified), label: "Знак проверки", section: "verification" as const },
    ],
    [form, photoCount, verified],
  );

  if (!allowed || !organization || !user || !form) return null;
  const setForm = setDraft;

  const members = state.members.filter((m) => m.organizationId === organization.id);
  const readOnly = user.role === "OPERATOR_MANAGER";
  const photos = form.photos ?? [];
  const videos = form.videos ?? [];

  const ready = checks.filter((c) => c.ok).length;
  const progress = Math.round((ready / checks.length) * 100);
  const nextCheck = checks.find((c) => !c.ok);

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
    // Отправляем только редактируемые поля: полный снапшот затирал бы
    // изменившиеся вне формы баланс, тариф и статус модерации.
    updateCompanyProfile(organization.id, {
      name: form.name,
      legalName: form.legalName,
      registrationNumber: form.registrationNumber,
      country: form.country,
      city: form.city,
      address: form.address,
      phone: form.phone,
      email: form.email,
      website: form.website,
      contactPerson: form.contactPerson,
      ...(form.about !== undefined ? { about: form.about } : {}),
      ...(form.logoUrl !== undefined ? { logoUrl: form.logoUrl } : {}),
      ...(form.coverUrl !== undefined ? { coverUrl: form.coverUrl } : {}),
      ...(form.photos !== undefined ? { photos: form.photos } : {}),
      ...(form.videos !== undefined ? { videos: form.videos } : {}),
      ...(form.whatsapp !== undefined ? { whatsapp: form.whatsapp } : {}),
      ...(form.instagram !== undefined ? { instagram: form.instagram } : {}),
      ...(form.telegram !== undefined ? { telegram: form.telegram } : {}),
      ...(form.services !== undefined ? { services: form.services } : {}),
      ...(form.countries !== undefined ? { countries: form.countries } : {}),
      ...(form.clientCountries !== undefined ? { clientCountries: form.clientCountries } : {}),
      ...(form.languages !== undefined ? { languages: form.languages } : {}),
      ...(form.workingHours !== undefined ? { workingHours: form.workingHours } : {}),
      ...(form.promoText !== undefined ? { promoText: form.promoText } : {}),
      ...(form.promoUntil !== undefined ? { promoUntil: form.promoUntil } : {}),
      ...(form.bookingSchedule !== undefined ? { bookingSchedule: form.bookingSchedule } : {}),
    });
    toast.success("Страница обновлена. Так её видят туристы.");
  };

  const jumpTo = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <DashShell
      tabs="partner"
      brand={organization.name}
      items={nav}
      title="Страница компании"
      subtitle="Публичная визитка: турист видит её в заявках, поиске и при выборе предложения."
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
      <div className="surface-card overflow-hidden">
        <div className="relative bg-[linear-gradient(135deg,oklch(0.97_0.02_25),oklch(0.96_0.03_250))] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <ProgressRing value={progress} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">Готовность страницы</h2>
                  {verified ? (
                    <Badge className="border-0 bg-success/12 text-success">
                      <BadgeCheck className="mr-1 size-3.5" />
                      Проверена
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-premium/15 text-premium">
                      Без знака проверки
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Заполнено {ready} из {checks.length} · {progress}%
                </p>
                {nextCheck ? (
                  <button
                    type="button"
                    onClick={() => jumpTo(nextCheck.section)}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Следующий шаг: {nextCheck.label}
                  </button>
                ) : (
                  <p className="mt-2 text-sm font-medium text-success">
                    Страница полностью заполнена
                  </p>
                )}
              </div>
            </div>
            {!readOnly ? (
              <Button size="sm" onClick={save}>
                Сохранить изменения
              </Button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {checks.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => jumpTo(item.section)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  item.ok
                    ? "bg-success/12 text-success"
                    : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                {item.ok ? <Check className="size-3" /> : null}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CardReview />

      <div className="mt-5 overflow-x-auto pb-1">
        <TabPills
          value={activeSection}
          onChange={(v) => jumpTo(v as SectionId)}
          items={sections.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <ProfileSection
            ref={(el) => {
              sectionRefs.current.face = el;
            }}
            id="face"
            icon={Building2}
            title="Лицо компании"
            description="Обложка, логотип и текст. Первое впечатление туриста."
          >
            <HeroEditor form={form} disabled={readOnly} onChange={setForm} />
            <div className="grid gap-4 sm:grid-cols-2">
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
                className="min-h-[120px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                2–3 предложения: опыт, направления, чем вы отличаетесь.
              </p>
            </div>
            <div className="rounded-2xl border border-premium/30 bg-premium/5 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Акция</p>
                <p className="text-xs text-muted-foreground">
                  Покажем баннером на вашей странице. Напишите, что входит и на каких условиях.
                </p>
              </div>
              <div className="space-y-3">
                <Textarea
                  id="company-promo"
                  rows={2}
                  value={form.promoText ?? ""}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, promoText: e.target.value })}
                  placeholder="Первая тренировка бесплатно: зал, сауна и разбор техники с тренером."
                  className="resize-y"
                />
                <div className="grid gap-1.5 sm:max-w-[220px]">
                  <Label htmlFor="company-promo-until">Действует до</Label>
                  <Input
                    id="company-promo-until"
                    type="date"
                    value={form.promoUntil ?? ""}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, promoUntil: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    После этой даты баннер скрывается сам. Пусто — акция бессрочная.
                  </p>
                </div>
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.contacts = el;
            }}
            id="contacts"
            icon={Phone}
            title="Контакты"
            description="Турист напишет сюда, если выберет ваше предложение."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ContactField id="company-phone" label="Телефон" icon={Phone} disabled={readOnly}>
                <PhoneInput
                  id="company-phone"
                  value={form.phone}
                  disabled={readOnly}
                  onChange={(phone) => setForm({ ...form, phone })}
                />
              </ContactField>
              <ContactField
                id="company-wa"
                label="WhatsApp"
                icon={MessageCircle}
                disabled={readOnly}
              >
                <PhoneInput
                  id="company-wa"
                  value={form.whatsapp ?? ""}
                  disabled={readOnly}
                  onChange={(whatsapp) => setForm({ ...form, whatsapp })}
                />
              </ContactField>
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
              <Field
                id="company-address"
                label="Адрес (улица, дом)"
                value={form.address}
                disabled={readOnly}
                onChange={(address) => setForm({ ...form, address })}
                placeholder="Al Wasl Road 12, Jumeirah"
              />
              <Field
                id="company-hours"
                label="Часы работы"
                value={form.workingHours ?? ""}
                disabled={readOnly}
                onChange={(workingHours) => setForm({ ...form, workingHours })}
                placeholder="Пн-Пт 07:00-23:00, Сб-Вс 09:00-21:00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Адрес превращается на странице в кнопку «Маршрут» с Google Картами — клиент строит
              путь в одно касание.
            </p>
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.schedule = el;
            }}
            id="schedule"
            icon={CalendarClock}
            title="Расписание записи"
            description="Часы приёма и длина слота: клиент выберет свободное время сам, занятое исчезнет."
          >
            <BookingScheduleEditor
              value={form.bookingSchedule}
              disabled={readOnly}
              onChange={(bookingSchedule) => setForm({ ...form, bookingSchedule })}
              bookedOn={(date) => requestsForDate(organization.id, date).length}
            />
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.services = el;
            }}
            id="services"
            icon={Briefcase}
            title="Чем занимаетесь"
            description="Помогает туристу понять, подходите ли вы под его запрос."
          >
            {serviceGroupsForCategory(organization.category).map((group) => (
              <ChipGroup
                key={group.label}
                label={`Услуги · ${group.label}`}
                options={group.options}
                selected={form.services ?? []}
                disabled={readOnly}
                onToggle={(v) => toggleList("services", v)}
              />
            ))}
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
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.media = el;
            }}
            id="media"
            icon={Camera}
            title="Фото и видео"
            description="Отели, экскурсии, офис. Турист выбирает глазами."
          >
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
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.verification = el;
            }}
            id="verification"
            icon={ShieldCheck}
            title="Проверка компании"
            description="Знак «Проверенная компания» повышает доверие и конверсию."
          >
            <VerificationDocumentsPanel
              organizationId={organization.id}
              services={form.services ?? []}
              companyName={form.name}
              companySummary={[form.city, form.country, (form.services ?? []).join(", ")]
                .filter(Boolean)
                .join(" · ")}
              readOnly={readOnly}
              showPreview={false}
              onDocumentsChange={setDocuments}
            />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="outline"
                disabled={
                  readOnly ||
                  verified ||
                  !canSubmitVerification(documents) ||
                  documents.length === 0
                }
                onClick={() => {
                  if (!hasRequiredDocument(documents)) {
                    toast.error("Загрузите свидетельство о регистрации.");
                    return;
                  }
                  submitForVerification(organization.id, documents);
                  toast.success("Документы отправлены на проверку. Обычно до 2 рабочих дней.");
                }}
              >
                <BadgeCheck className="size-4" />
                {verified ? "Проверка пройдена" : "Отправить на проверку"}
              </Button>
              {organization.verificationSubmittedAt && !verified ? (
                <p className="text-xs text-muted-foreground">
                  Отправлено{" "}
                  {new Date(organization.verificationSubmittedAt).toLocaleString("ru-RU")}
                </p>
              ) : null}
            </div>
          </ProfileSection>

          <ProfileSection
            ref={(el) => {
              sectionRefs.current.team = el;
            }}
            id="team"
            icon={Users}
            title="Команда"
            description="Менеджер видит заявки и отвечает туристам."
          >
            <ul className="space-y-2">
              {members.map((m) => {
                const u = state.users.find((x) => x.id === m.userId);
                const initials = (u?.name ?? "?")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-sm font-semibold text-primary">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.role === "OPERATOR_ADMIN" ? "Владелец" : "Менеджер"} · {u?.email}
                        </p>
                      </div>
                    </div>
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
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="manager@company.kz"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
                <Button
                  className="shrink-0"
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
                  Добавить менеджера
                </Button>
              </div>
            ) : null}
          </ProfileSection>

          <div className="flex flex-wrap gap-3 pb-4">
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

function ProgressRing({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="relative grid size-[72px] place-items-center">
      <svg className="-rotate-90" width="72" height="72" viewBox="0 0 72 72" aria-hidden>
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-secondary"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute font-display text-sm font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

const ProfileSection = ({
  id,
  icon: Icon,
  title,
  description,
  children,
  ref,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  ref?: (el: HTMLElement | null) => void;
}) => (
  <section id={id} ref={ref} className="scroll-mt-28 surface-card overflow-hidden">
    <div className="border-b border-border bg-secondary/20 px-5 py-4 md:px-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
    <div className="space-y-5 p-5 md:p-6">{children}</div>
  </section>
);

function HeroEditor({
  form,
  disabled,
  onChange,
}: {
  form: Organization;
  disabled: boolean;
  onChange: (next: Organization) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <CoverField
        value={form.coverUrl ?? ""}
        disabled={disabled}
        onChange={(coverUrl) => onChange({ ...form, coverUrl })}
      />
      <div className="relative bg-card px-4 pb-4 pt-0 md:px-5 md:pb-5">
        <div className="-mt-10 flex flex-wrap items-end gap-4">
          <LogoField
            value={form.logoUrl ?? ""}
            name={form.name}
            disabled={disabled}
            onChange={(logoUrl) => onChange({ ...form, logoUrl })}
          />
          <div className="min-w-0 flex-1 pb-1">
            <p className="font-display text-lg font-semibold leading-tight">
              {form.name || "Название компании"}
            </p>
            <p className="text-sm text-muted-foreground">
              {[form.city, form.country].filter(Boolean).join(", ") || "Город и страна"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyPreview({ form, verified }: { form: Organization; verified: boolean }) {
  const wa = form.whatsapp?.replace(/\D/g, "") || form.phone?.replace(/\D/g, "");

  return (
    <aside className="xl:sticky xl:top-28 xl:self-start">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Превью для туриста
      </p>
      <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_20px_50px_-20px_oklch(0.3_0.05_250/0.35)]">
        <div className="relative">
          {form.coverUrl ? (
            <img src={form.coverUrl} alt="" className="h-32 w-full object-cover" />
          ) : (
            <div className="h-32 w-full bg-[linear-gradient(120deg,oklch(0.55_0.13_250),oklch(0.45_0.1_265))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
        </div>

        <div className="relative px-4 pb-5">
          <div className="-mt-8 flex items-end gap-3">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt=""
                className="size-14 rounded-2xl border-2 border-card object-cover shadow-sm"
              />
            ) : (
              <span className="grid size-14 place-items-center rounded-2xl border-2 border-card bg-primary/10 font-display text-sm font-semibold text-primary shadow-sm">
                {form.name.slice(0, 2).toUpperCase() || "TG"}
              </span>
            )}
            {verified ? (
              <Badge className="mb-1 border-0 bg-success/12 text-[10px] text-success">
                <BadgeCheck className="mr-1 size-3" />
                Проверена
              </Badge>
            ) : null}
          </div>

          <p className="mt-3 font-display text-base font-semibold leading-snug">{form.name}</p>
          <p className="text-xs text-muted-foreground">
            {form.city}
            {form.country ? `, ${form.country}` : ""}
          </p>

          {form.about ? (
            <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
              {form.about}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Добавьте короткое описание.</p>
          )}

          {(form.services ?? []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {(form.services ?? []).slice(0, 4).map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {(form.photos ?? []).length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {(form.photos ?? []).slice(0, 3).map((src, i) => (
                <img
                  key={`${src.slice(0, 16)}-${i}`}
                  src={src}
                  alt=""
                  className="aspect-square rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {form.phone ? <PreviewContact icon={Phone} label={form.phone} /> : null}
            {wa ? <PreviewContact icon={MessageCircle} label="WhatsApp" /> : null}
            {form.website ? <PreviewContact icon={Globe} label="Сайт" /> : null}
            {form.instagram ? <PreviewContact icon={Instagram} label={form.instagram} /> : null}
            {form.telegram ? <PreviewContact icon={Send} label="Telegram" /> : null}
            {form.email ? <PreviewContact icon={Mail} label={form.email} /> : null}
          </div>

          <Button size="sm" className="mt-4 w-full" disabled>
            Оставить заявку
          </Button>
        </div>
      </div>
    </aside>
  );
}

function PreviewContact({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </p>
  );
}

function ContactField({
  id,
  label,
  icon: Icon,
  disabled,
  children,
}: {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="inline-flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </Label>
      <div className={cn(disabled && "opacity-70")}>{children}</div>
    </div>
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
    <label className={cn("group relative block", !disabled && "cursor-pointer")}>
      {value ? (
        <img src={value} alt="" className="h-40 w-full object-cover md:h-48" />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 bg-[linear-gradient(120deg,oklch(0.55_0.13_250),oklch(0.45_0.1_265))] text-white/90 md:h-48">
          <ImagePlus className="size-6" />
          <span className="text-sm font-medium">Загрузить обложку</span>
          <span className="text-xs text-white/70">Рекомендуем 1200×400 px</span>
        </div>
      )}
      {!disabled ? (
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition group-hover:bg-ink/35 group-hover:opacity-100">
          <span className="rounded-full bg-card/95 px-4 py-2 text-sm font-medium shadow-sm">
            {value ? "Сменить обложку" : "Выбрать файл"}
          </span>
        </span>
      ) : null}
      {value && !disabled ? (
        <button
          type="button"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card/95 shadow-sm"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          <Trash2 className="size-4" />
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
        "group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-card bg-secondary shadow-md",
        !disabled && "cursor-pointer",
      )}
    >
      {value ? (
        <img src={value} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-display text-lg font-semibold text-primary">
          {name.slice(0, 2).toUpperCase() || "TG"}
        </span>
      )}
      {!disabled ? (
        <span className="absolute inset-0 grid place-items-center bg-ink/0 text-[10px] font-medium text-white opacity-0 transition group-hover:bg-ink/45 group-hover:opacity-100">
          Лого
        </span>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((src, i) => (
          <div
            key={`${src.slice(0, 20)}-${i}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl",
              i === 0 && photos.length > 1 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-[4/3]",
            )}
          >
            <img src={src} alt="" className="size-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                aria-label="Удалить фото"
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/95 opacity-0 shadow-sm transition group-hover:opacity-100"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && !disabled ? (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/20 text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-secondary/40">
            <ImagePlus className="size-5" />
            Добавить фото
            <span className="text-[10px]">
              {photos.length}/{MAX_PHOTOS}
            </span>
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
            placeholder="Или вставьте ссылку на фото"
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
    <div className="space-y-3">
      <Label className="inline-flex items-center gap-1.5">
        <Video className="size-3.5 text-muted-foreground" />
        Видео (YouTube)
      </Label>
      {videos.map((src) => {
        const embed = youtubeEmbed(src);
        return (
          <div key={src} className="overflow-hidden rounded-2xl border border-border">
            {embed ? (
              <iframe
                title="Видео компании"
                src={embed}
                className="aspect-video w-full"
                allowFullScreen
              />
            ) : (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-3 text-sm"
              >
                <Video className="size-4" />
                {src}
              </a>
            )}
            {!disabled ? (
              <div className="flex justify-end border-t border-border p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(videos.filter((v) => v !== src))}
                >
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
            Добавить
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
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all disabled:opacity-60",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {active ? <Check className="size-3.5" /> : null}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Разбор карточки: чего не хватает и что советует модель.
 *
 * Два слоя намеренно разделены и подписаны по-разному. Пункты «не заполнено» —
 * это правила, они считаются кодом и всегда верны. Замечания модели — суждение,
 * и подавать их как истину нечестно: она может придраться к живому описанию или
 * пропустить кривое.
 *
 * Кнопка не блокирует ничего: карточка уже видна туристам, разбор лишь
 * подсказывает, чем её починить.
 */
function CardReview() {
  const [state, setState] = useState<
    { status: "idle" } | { status: "busy" } | { status: "done"; review: CompanyReview }
  >({ status: "idle" });

  const run = async () => {
    setState({ status: "busy" });
    try {
      const review = await reviewCompanyCard();
      setState({ status: "done", review });
    } catch {
      setState({ status: "idle" });
      toast.error("Не удалось разобрать карточку. Попробуйте ещё раз.");
    }
  };

  const review = state.status === "done" ? state.review : null;

  return (
    <div className="surface-card mt-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Проверка карточки</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Посмотрим, чего не хватает и что стоит переписать.
          </p>
        </div>
        <Button onClick={() => void run()} disabled={state.status === "busy"}>
          {state.status === "busy" ? "Смотрю…" : "Проверить"}
        </Button>
      </div>

      {review ? (
        <div className="mt-4 space-y-4">
          {review.gaps.length ? (
            <div>
              <p className="text-sm font-medium">Не заполнено</p>
              <ul className="mt-2 space-y-1.5">
                {review.gaps.map((gap) => (
                  <li key={gap.id} className="text-sm">
                    <span
                      className={cn(
                        "font-medium",
                        gap.required ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {gap.label}
                      {gap.required ? " · обязательно" : ""}
                    </span>
                    <span className="text-muted-foreground"> — {gap.hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-success">Всё обязательное заполнено.</p>
          )}

          {review.ai === null ? (
            <p className="text-sm text-muted-foreground">
              Разбор текста не выполнялся: у платформы не задан ключ AI.
            </p>
          ) : review.ai.ok ? (
            review.ai.notes.length ? (
              <div>
                <p className="text-sm font-medium">Замечания AI</p>
                <ul className="mt-2 space-y-1.5">
                  {review.ai.notes.map((note) => (
                    <li key={note} className="text-sm text-muted-foreground">
                      {note}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Это подсказки, а не правила: решаете вы.
                </p>
              </div>
            ) : (
              <p className="text-sm text-success">К тексту карточки замечаний нет.</p>
            )
          ) : (
            <p className="text-sm text-destructive">Разбор не удался: {review.ai.error}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
