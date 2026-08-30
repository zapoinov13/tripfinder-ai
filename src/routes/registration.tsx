import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, UserPlus } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/platform/auth";
import { getState } from "@/lib/platform/store";
import { migrateAnonymousToUser } from "@/lib/platform/user-data";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/registration")({
  // Куда вернуть человека после регистрации: он пришёл сюда с карточки тура
  // или из избранного и должен продолжить с того же места.
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search["next"] === "string" && /^\/(?![/\\])/.test(search["next"])
      ? { next: search["next"] }
      : {},
  head: () => privatePage("Регистрация"),
  component: RegistrationPage,
});

function RegistrationPage() {
  const { registerTourist } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [error, setError] = useState("");
  const [tourist, setTourist] = useState({
    name: "",
    city: "",
    phone: "",
    // Дата рождения — по желанию. Спрашиваем ради бонусов и прямо об этом
    // пишем: поле без объяснения выглядит как лишний сбор данных.
    birthday: "",
    email: "",
    // Пустой, а не запасной пароль из кода. Предзаполненное поле большинство
    // оставляет как есть — а этот пароль уезжает в браузер вместе с бандлом,
    // то есть известен всем. Получался аккаунт, в который войдёт любой, кто
    // знает почту.
    password: "",
  });

  return (
    <SiteLayout hideTabBar>
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Регистрация</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Кабинеты туриста и бизнеса устроены по-разному, поэтому сначала выберите свой. Поменять
            можно и позже.
          </p>

          {/* Выбор роли сделан карточками, а не вкладками: вкладки легко
              проскочить, не заметив, и человек заполнял чужую форму.
              whitespace-normal обязателен: стандартная кнопка вкладки запрещает
              перенос строк, и описание выезжало за край карточки. */}
          <Tabs defaultValue="tourist" className="mt-8">
            <TabsList className="grid h-auto w-full grid-cols-1 items-stretch gap-3 bg-transparent p-0 sm:grid-cols-2">
              <TabsTrigger
                value="tourist"
                className="h-full flex-col items-start justify-start gap-1.5 rounded-2xl border border-border bg-card p-5 text-left whitespace-normal data-[state=active]:border-primary data-[state=active]:bg-primary-soft data-[state=active]:shadow-none"
              >
                <span className="font-display text-base font-semibold">Турист</span>
                <span className="text-xs leading-relaxed font-normal text-muted-foreground">
                  Ищу и бронирую поездки, оставляю заявки, коплю бонусы.
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="h-full flex-col items-start justify-start gap-1.5 rounded-2xl border border-border bg-card p-5 text-left whitespace-normal data-[state=active]:border-primary data-[state=active]:bg-primary-soft data-[state=active]:shadow-none"
              >
                <span className="font-display text-base font-semibold">Стать партнёром</span>
                <span className="text-xs leading-relaxed font-normal text-muted-foreground">
                  Подключить турфирму, экскурсии, жильё, прокат авто или спорт — своя страница и
                  заявки клиентов.
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tourist" className="surface-card mt-6 p-6 md:p-8">
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  if (!tourist.name.trim()) {
                    setError("Как вас зовут?");
                    return;
                  }
                  if (tourist.phone.trim().length < 10) {
                    setError("Проверьте телефон: по нему с вами свяжется компания");
                    return;
                  }
                  if (tourist.password.trim().length < 8) {
                    setError("Придумайте пароль не короче 8 символов");
                    return;
                  }
                  const res = await registerTourist(tourist);
                  if (!res.ok) {
                    setError(res.error ?? "Ошибка");
                    return;
                  }
                  // Переносим избранное/сравнение, накопленные до регистрации.
                  const sessionUserId = getState().session?.userId;
                  if (sessionUserId) migrateAnonymousToUser(sessionUserId);
                  void navigate({ to: next ?? "/profile" });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    placeholder="Айгерим"
                    value={tourist.name}
                    onChange={(e) => setTourist({ ...tourist, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourist-phone">Телефон</Label>
                  <PhoneInput
                    id="tourist-phone"
                    value={tourist.phone}
                    onChange={(value) => setTourist({ ...tourist, phone: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    По нему с вами свяжется компания по заявке.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourist-city">Город (необязательно)</Label>
                  <Input
                    id="tourist-city"
                    placeholder="Где вы живёте"
                    value={tourist.city}
                    onChange={(e) => setTourist({ ...tourist, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourist-birthday">День рождения (необязательно)</Label>
                  <Input
                    id="tourist-birthday"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={tourist.birthday}
                    onChange={(e) => setTourist({ ...tourist, birthday: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Пришлём бонус ко дню рождения. Не хотите — оставьте пустым.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tourist-email">Email</Label>
                  <Input
                    id="tourist-email"
                    type="email"
                    placeholder="you@example.com"
                    value={tourist.email}
                    onChange={(e) => setTourist({ ...tourist, email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Нужен для входа: пароль восстанавливается письмом. Вход по одному телефону
                    появится, когда подключим отправку SMS.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tourist-password">Пароль</Label>
                  <Input
                    id="tourist-password"
                    type="password"
                    autoComplete="new-password"
                    value={tourist.password}
                    onChange={(e) => setTourist({ ...tourist, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Минимум 8 символов — с ним вы будете входить.
                  </p>
                </div>
                {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
                <Button className="mt-2 sm:col-span-2" type="submit">
                  <UserPlus className="size-4" />
                  Создать аккаунт
                </Button>
                <p className="sm:col-span-2 text-center text-sm text-muted-foreground">
                  Уже есть аккаунт?{" "}
                  <Link
                    to="/login"
                    search={next ? ({ next } as never) : ({} as never)}
                    className="font-medium text-primary"
                  >
                    Войти
                  </Link>
                </p>
              </form>
            </TabsContent>

            {/*
              Регистрация компании живёт в отдельном визарде: там категория
              (туры, жильё, авто, спорт…), услуги и страны. Дублировать её
              формой на этой странице нельзя — компания без категории попадает
              в кабинет, который не знает, что ей показывать.
            */}
            <TabsContent value="company" className="surface-card mt-6 p-6 md:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Building2 className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold">
                Подключение партнёра — короткая анкета
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Три коротких шага: чем занимаетесь (туры, экскурсии, жильё, аренда авто, спорт,
                трансферы или помощь), ваш контакт, название и город. Остальное — в кабинете, где
                видно, как карточка выглядит для туриста. Кабинет откроется сразу; знак «Проверена»
                появится после того, как мы посмотрим документы.
              </p>
              <ol className="mt-4 grid gap-2 text-sm text-foreground/80">
                <li>1. Выбираете категорию — от неё зависит весь кабинет.</li>
                <li>2. Публикуете страницу компании и объявления.</li>
                <li>3. Принимаете заявки и записи клиентов.</li>
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/company-signup">
                    Подключить компанию
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/for-companies">Как это работает</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteLayout>
  );
}
