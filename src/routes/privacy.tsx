import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности · TourGo" },
      {
        name: "description",
        content: "Как TourGo обрабатывает персональные данные туристов и турфирм.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-10 md:py-14">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">TourGo</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Политика конфиденциальности
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Обновлено: 22 августа 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            TourGo помогает туристам найти и сравнить предложения турфирм. Мы не продаём туры и не
            принимаем оплату за поездку.
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">Какие данные собираем</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Имя, email и телефон при регистрации или заявке на тур.</li>
            <li>История поиска, избранное и сообщения в личном кабинете.</li>
            <li>Для турфирм — реквизиты компании и документы для проверки.</li>
          </ul>
          <h2 className="font-display text-lg font-semibold text-foreground">Кому видны контакты</h2>
          <p>
            Имя и телефон из заявки видят только те компании, которым вы отправили запрос или которых
            выбрали. Мы не продаём и не передаём контакты третьим лицам для рекламы.
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">Удаление аккаунта</h2>
          <p>
            В приложении: Профиль → Настройки → «Удалить аккаунт». Или напишите на{" "}
            <a href={SUPPORT_MAILTO} className="text-primary underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">Push-уведомления</h2>
          <p>
            В мобильном приложении мы можем отправлять уведомления о новых предложениях и сообщениях.
            Их можно отключить в настройках телефона или профиля.
          </p>
        </div>

        <Button className="mt-8" variant="outline" asChild>
          <Link to="/about">О платформе</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}
