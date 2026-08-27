import { Link } from "@tanstack/react-router";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/platform/auth";
import { claimCompany } from "@/lib/platform/company-claims";
import { usePlatformStore } from "@/lib/platform/hooks";

/**
 * «Это наша компания».
 *
 * Карточку завела платформа, и владелец бизнеса должен получить свой кабинет.
 * Отдавать по первому клику нельзя — заявку подтверждает админ, поэтому здесь
 * собираем контакты и то, чем человек подтверждает связь с компанией.
 */
export function ClaimCompanyDialog({
  open,
  onOpenChange,
  organizationId,
  companyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  companyName: string;
}) {
  const { user, isAuthenticated } = useAuth();
  // Подписка на стор: после отправки заявка сразу видна в этом же диалоге.
  const state = usePlatformStore();
  const pending = user
    ? state.companyClaims.find(
        (c) => c.organizationId === organizationId && c.userId === user.id && c.status === "NEW",
      )
    : undefined;
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    email: user?.email ?? "",
    proof: "",
  });

  const submit = () => {
    if (!user) return;
    const res = claimCompany({
      organizationId,
      userId: user.id,
      contactName: form.name,
      contactPhone: form.phone,
      contactEmail: form.email,
      proof: form.proof,
    });
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    toast.success("Заявка отправлена. Свяжемся по указанному телефону.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Это наша компания</DialogTitle>
          <DialogDescription>
            Страницу «{companyName}» собрал TourGo по открытым данным. Заберите её — и получите
            кабинет: расписание, записи клиентов, отзывы и статистика.
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated || !user ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Войдите или создайте аккаунт — кабинет компании привяжется к нему.
            </p>
            <Button asChild className="w-full">
              <Link to="/login" search={{ next: `/company/${organizationId}` } as never}>
                Войти
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/registration" search={{ next: `/company/${organizationId}` } as never}>
                Создать аккаунт
              </Link>
            </Button>
          </div>
        ) : pending ? (
          <div className="rounded-2xl border border-border p-4">
            <p className="font-medium">Заявка на рассмотрении</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Мы получили её {new Date(pending.createdAt).toLocaleDateString("ru-RU")} и свяжемся по
              телефону {pending.contactPhone}. Ответ придёт уведомлением.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-name">Ваше имя</Label>
                <Input
                  id="claim-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-phone">Телефон</Label>
                <PhoneInput
                  id="claim-phone"
                  placeholder="+971 50 123 45 67"
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="claim-email">Почта</Label>
                <Input
                  id="claim-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="claim-proof">Чем подтвердите</Label>
                <Textarea
                  id="claim-proof"
                  className="min-h-24"
                  placeholder="Сайт компании, почта на её домене, аккаунт в Instagram, документы — что угодно, по чему видно, что вы из этой компании."
                  value={form.proof}
                  onChange={(e) => setForm({ ...form, proof: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Проверим и передадим страницу — обычно в течение рабочего дня. Пока заявка на
              рассмотрении, карточка работает как есть.
            </p>
          </div>
        )}

        {isAuthenticated && user && !pending ? (
          <DialogFooter>
            <Button onClick={submit}>Отправить заявку</Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
