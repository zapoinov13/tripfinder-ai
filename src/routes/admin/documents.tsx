import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Check, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, FilterBar, StatusBadge, TabPills } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { companyCategories } from "@/lib/platform/company-categories";
import {
  listAdminCompanyDocuments,
  reviewCompanyDocument,
  setPendingDocumentsCount,
  signedDocumentUrl,
  type AdminCompanyDocument,
  type DocumentReviewStatus,
} from "@/lib/platform/company-documents";
import { verificationDocumentLabel } from "@/lib/platform/company";
import { setState } from "@/lib/platform/store";
import { getSupabase } from "@/lib/supabase/client";
import { usePlatformStore } from "@/lib/platform/hooks";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/documents")({
  // ?org= приходит из таблицы партнёров: открыли компанию — видим её документы.
  validateSearch: (search: Record<string, unknown>): { org?: string } =>
    typeof search["org"] === "string" && search["org"] ? { org: search["org"] } : {},
  head: () => privatePage("Проверка документов · Админ"),
  component: AdminDocumentsPage,
});

/**
 * Очередь проверки документов.
 *
 * Компании открываются автоматически, поэтому статус ничего не говорит о том,
 * настоящая ли это фирма. Единственное, что об этом говорит, — знак
 * «Проверена», и его ставит человек, посмотрев вот эти файлы. До этой
 * страницы посмотреть их было негде: документы оставались в браузере
 * партнёра и до платформы не доезжали.
 */

const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "—";

const tabs: { id: "PENDING" | "REJECTED" | "APPROVED" | "all"; label: string }[] = [
  { id: "PENDING", label: "Ждут проверки" },
  { id: "APPROVED", label: "Принятые" },
  { id: "REJECTED", label: "Отклонённые" },
  { id: "all", label: "Все" },
];

const statusTone: Record<DocumentReviewStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const statusText: Record<DocumentReviewStatus, string> = {
  PENDING: "Ждёт проверки",
  APPROVED: "Принят",
  REJECTED: "Отклонён",
};

/** Компании, у которых все обязательные документы приняты, — готовы к знаку. */
type CompanyGroup = {
  organizationId: string;
  name: string;
  city: string;
  category: string;
  email: string;
  phone: string;
  registrationNumber: string;
  documentsVerifiedAt: string;
  documents: AdminCompanyDocument[];
};

function AdminDocumentsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const { user } = useAuth();
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [rows, setRows] = useState<AdminCompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const search = Route.useSearch();
  // Пришли по ссылке на конкретную компанию — показываем все её документы,
  // а не только непроверенные: иначе экран окажется пустым.
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>(search.org ? "all" : "PENDING");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listAdminCompanyDocuments();
      setRows(next);
      setPendingDocumentsCount(next.filter((row) => row.reviewStatus === "PENDING").length);
      setFailure("");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Не удалось загрузить документы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const visible = rows.filter((row) => {
      if (search.org && row.organizationId !== search.org) return false;
      if (tab !== "all" && row.reviewStatus !== tab) return false;
      if (!query) return true;
      return (
        row.organizationName.toLowerCase().includes(query) ||
        row.organizationCity.toLowerCase().includes(query) ||
        row.organizationEmail.toLowerCase().includes(query) ||
        row.registrationNumber.toLowerCase().includes(query)
      );
    });
    const byOrg = new Map<string, CompanyGroup>();
    visible.forEach((row) => {
      const group = byOrg.get(row.organizationId) ?? {
        organizationId: row.organizationId,
        name: row.organizationName,
        city: row.organizationCity,
        category: row.organizationCategory,
        email: row.organizationEmail,
        phone: row.organizationPhone,
        registrationNumber: row.registrationNumber,
        documentsVerifiedAt: row.documentsVerifiedAt,
        documents: [],
      };
      group.documents.push(row);
      byOrg.set(row.organizationId, group);
    });
    return [...byOrg.values()];
  }, [rows, tab, q, search.org]);

  const pending = rows.filter((row) => row.reviewStatus === "PENDING").length;

  // Вкладку открываем сразу по клику: дождись мы сперва подписанной ссылки,
  // браузер счёл бы открытие несвязанным с действием человека и заблокировал.
  const open = (row: AdminCompanyDocument) => {
    const tab = window.open("", "_blank", "noopener,noreferrer");
    signedDocumentUrl(row.storagePath)
      .then((url) => {
        if (!url) throw new Error("Ссылка на файл не получена");
        if (tab) tab.location.href = url;
        else window.location.href = url;
      })
      .catch((error: unknown) => {
        tab?.close();
        toast.error(error instanceof Error ? error.message : "Не удалось открыть файл");
      });
  };

  const decide = async (row: AdminCompanyDocument, status: DocumentReviewStatus) => {
    const note = (notes[row.id] ?? row.reviewNote).trim();
    if (status === "REJECTED" && !note) {
      toast.error("Напишите причину: партнёр должен понять, что переделать.");
      return;
    }
    setBusy(row.id);
    try {
      await reviewCompanyDocument(row.id, status, note);
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                reviewStatus: status,
                reviewNote: note,
                reviewedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      notifyPartner(row, status, note);
      setPendingDocumentsCount(
        rows.filter((item) => item.id !== row.id && item.reviewStatus === "PENDING").length +
          (status === "PENDING" ? 1 : 0),
      );
      appendAudit({
        ...(user ? { actorId: user.id } : {}),
        action: "company_document_review",
        entityType: "organization",
        entityId: row.organizationId,
        meta: { document: row.docType, status },
      });
      toast.success(status === "APPROVED" ? "Документ принят" : "Документ отклонён");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить решение");
    } finally {
      setBusy("");
    }
  };

  const notifyPartner = (row: AdminCompanyDocument, status: DocumentReviewStatus, note: string) => {
    const title = verificationDocumentLabel(row.docType);
    state.users
      .filter((u) => u.organizationId === row.organizationId)
      .forEach((u) =>
        pushNotification(
          u.id,
          "operator_approval",
          status === "APPROVED" ? `${title}: принят` : `${title}: нужно переделать`,
          status === "APPROVED"
            ? "Документ прошёл проверку."
            : note || "Загрузите документ заново в разделе «Компания».",
        ),
      );
  };

  /**
   * Знак «Проверена» — отдельным решением по компании, а не по файлу.
   * Один принятый документ ещё не значит, что фирму проверили целиком.
   */
  const setVerified = async (group: CompanyGroup, verified: boolean) => {
    const sb = getSupabase();
    if (!sb) {
      toast.error("Supabase не настроен");
      return;
    }
    setBusy(group.organizationId);
    // bind: без него метод теряет объект и падает на this.rest.
    const rpc = sb.rpc.bind(sb) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("set_company_documents_verified", {
      p_org: group.organizationId,
      p_verified: verified,
    });
    setBusy("");
    if (error) {
      toast.error(
        /not find|does not exist|PGRST202/i.test(error.message)
          ? "Сначала примените supabase/AUTO-APPROVE.sql в SQL Editor"
          : error.message,
      );
      return;
    }
    const stamp = verified ? new Date().toISOString() : "";
    setRows((prev) =>
      prev.map((item) =>
        item.organizationId === group.organizationId
          ? { ...item, documentsVerifiedAt: stamp }
          : item,
      ),
    );
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) =>
        o.id === group.organizationId ? { ...o, documentsVerifiedAt: stamp } : o,
      ),
    }));
    state.users
      .filter((u) => u.organizationId === group.organizationId)
      .forEach((u) =>
        pushNotification(
          u.id,
          "operator_approval",
          verified ? "Документы проверены" : "Знак проверки снят",
          verified
            ? "На вашей карточке появился знак «Проверена»."
            : "Знак «Проверена» снят: проверьте документы в разделе «Компания».",
        ),
      );
    appendAudit({
      ...(user ? { actorId: user.id } : {}),
      action: "company_documents_verified",
      entityType: "organization",
      entityId: group.organizationId,
      meta: { verified },
    });
    toast.success(verified ? "Компания проверена" : "Знак проверки снят");
  };

  if (!allowed) return null;

  return (
    <DashShell
      brand="TourGo"
      items={nav}
      title="Проверка документов"
      subtitle={
        pending > 0
          ? `${pending} ${docWord(pending)} ждут вашего решения`
          : "Файлы, которые прислали компании"
      }
      actions={
        <Button variant="outline" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Обновить
        </Button>
      }
    >
      {failure ? (
        <p className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {failure}
        </p>
      ) : null}

      <TabPills
        items={tabs.map((item) => ({
          value: item.id,
          label: item.label,
          count:
            item.id === "all"
              ? rows.length
              : rows.filter((row) => row.reviewStatus === item.id).length,
        }))}
        value={tab}
        onChange={(id) => setTab(id as (typeof tabs)[number]["id"])}
      />

      <div className="mt-4">
        <FilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Компания, город, БИН или почта"
        />
      </div>

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загружаем очередь…
        </p>
      ) : groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={tab === "PENDING" ? "Непроверенных документов нет" : "Здесь пусто"}
            description={
              rows.length === 0
                ? "Компании ещё не присылали документы. Они появятся здесь сразу после загрузки в кабинете партнёра."
                : "Попробуйте другую вкладку или очистите поиск."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {groups.map((group) => (
            <section key={group.organizationId} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{group.name}</h2>
                    {group.documentsVerifiedAt ? (
                      <StatusBadge label="Проверена" tone="success" />
                    ) : null}
                    {group.category ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                        {categoryLabel(group.category)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[group.city, group.email, group.phone].filter(Boolean).join(" · ") ||
                      "контакты не указаны"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    БИН {group.registrationNumber || "не указан"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={group.documentsVerifiedAt ? "outline" : "default"}
                  disabled={busy === group.organizationId}
                  onClick={() => void setVerified(group, !group.documentsVerifiedAt)}
                >
                  {group.documentsVerifiedAt ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <BadgeCheck className="size-4" />
                  )}
                  {group.documentsVerifiedAt ? "Снять знак проверки" : "Компания проверена"}
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {group.documents.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{verificationDocumentLabel(row.docType)}</p>
                        <button
                          type="button"
                          onClick={() => open(row)}
                          className="mt-1 block max-w-full truncate text-sm text-primary hover:underline"
                        >
                          {row.fileName}
                        </button>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Загружен {fmt(row.uploadedAt)}
                          {row.reviewedAt ? ` · решение ${fmt(row.reviewedAt)}` : ""}
                        </p>
                        {row.reviewNote ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Комментарий: {row.reviewNote}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge
                        label={statusText[row.reviewStatus]}
                        tone={statusTone[row.reviewStatus]}
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      <Textarea
                        rows={2}
                        value={notes[row.id] ?? row.reviewNote}
                        placeholder="Что не так с документом — партнёр увидит этот текст"
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busy === row.id || row.reviewStatus === "APPROVED"}
                          onClick={() => void decide(row, "APPROVED")}
                        >
                          <Check className="size-4" />
                          Принять
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === row.id || row.reviewStatus === "REJECTED"}
                          onClick={() => void decide(row, "REJECTED")}
                        >
                          <X className="size-4" />
                          Отклонить
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => open(row)}>
                          Открыть файл
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </DashShell>
  );
}

/** Показываем человеку «Спорт», а не `sport`. */
function categoryLabel(id: string) {
  return companyCategories.find((category) => category.id === id)?.label ?? id;
}

function docWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "документ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "документа";
  return "документов";
}
