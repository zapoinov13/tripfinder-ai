import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  approveCompanyClaim,
  declineCompanyClaim,
  pendingCompanyClaims,
} from "@/lib/platform/company-claims";
import { usePlatformStore } from "@/lib/platform/hooks";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

/**
 * Решение по заявкам «это наша компания».
 *
 * Карточку завела платформа, владелец просит её себе. Отдать — значит открыть
 * человеку кабинет с записями клиентов, поэтому решение всегда ручное: админ
 * видит контакты и то, чем человек подтверждает связь с компанией, и звонит,
 * если сомневается.
 */
export function CompanyClaimsSection({ actorId }: { actorId: string }) {
  const state = usePlatformStore();
  const claims = pendingCompanyClaims();
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const orgById = new Map(state.organizations.map((o) => [o.id, o] as const));
  const userById = new Map(state.users.map((u) => [u.id, u] as const));

  if (claims.length === 0) {
    return (
      <EmptyState
        title="Заявок на компании нет"
        description="Здесь появятся владельцы, которые просят передать им карточку, заведённую платформой"
      />
    );
  }

  const approve = (claimId: string, companyName: string) => {
    const res = approveCompanyClaim(claimId, actorId);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    toast.success(`«${companyName}» передана владельцу`);
  };

  const decline = () => {
    if (!declining) return;
    const res = declineCompanyClaim(declining, actorId, reason.trim());
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    toast.success("Заявка отклонена");
    setDeclining(null);
    setReason("");
  };

  return (
    <>
      <div className="space-y-3">
        {claims.map((claim) => {
          const org = orgById.get(claim.organizationId);
          const applicant = userById.get(claim.userId);
          return (
            <div key={claim.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-semibold">
                      {org?.name ?? "Компания удалена"}
                    </p>
                    {org ? (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/company/$companyId" params={{ companyId: org.id }}>
                          Открыть карточку
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {org?.city ? `${org.city} · ` : ""}заявка от {fmtDate(claim.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeclining(claim.id);
                      setReason("");
                    }}
                  >
                    Отклонить
                  </Button>
                  <Button size="sm" onClick={() => approve(claim.id, org?.name ?? "Компания")}>
                    Передать
                  </Button>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Кто просит
                  </dt>
                  <dd className="mt-1">
                    {claim.contactName || applicant?.name || "без имени"}
                    <span className="block text-xs text-muted-foreground">
                      аккаунт: {applicant?.email ?? claim.userId}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Связь
                  </dt>
                  <dd className="mt-1">
                    <a href={`tel:${claim.contactPhone}`} className="font-medium hover:underline">
                      {claim.contactPhone || "телефон не указан"}
                    </a>
                    <span className="block text-xs text-muted-foreground">
                      {claim.contactEmail || "почта не указана"}
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Чем подтверждает
                  </dt>
                  <dd className="mt-1 whitespace-pre-line leading-relaxed">
                    {claim.proof || "ничего не приложил — стоит позвонить"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                После передачи человек становится владельцем кабинета: увидит записи клиентов,
                контакты и статистику компании. Проверьте, что он действительно из неё.
              </p>
            </div>
          );
        })}
      </div>

      <Dialog
        open={declining !== null}
        onOpenChange={(open) => {
          if (!open) setDeclining(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Отклонить заявку</DialogTitle>
            <DialogDescription>
              Причину увидит заявитель в уведомлении — напишите так, чтобы он понял, что приложить в
              следующий раз.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-24"
            placeholder="Не удалось подтвердить связь с компанией: телефон не отвечает, документов нет."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={decline}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
