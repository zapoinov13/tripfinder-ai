import { BadgeCheck, FileText, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CompanyDocumentsError,
  listCompanyDocuments,
  removeCompanyDocument,
  signedDocumentUrl,
  uploadCompanyDocument,
  type CompanyDocument,
} from "@/lib/platform/company-documents";
import { verificationDocumentTypesFor } from "@/lib/platform/company";
import type { VerificationDocumentId } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

type VerificationDocumentsPanelProps = {
  /** Компания, чьи документы показываем. Файлы лежат в её папке в бакете. */
  organizationId: string;
  companyName: string;
  companySummary?: string;
  readOnly?: boolean;
  showPreview?: boolean;
  /** Услуги компании: от них зависит список документов. */
  services?: string[];
  /** Родителю нужен состав документов, чтобы включить кнопку отправки. */
  onDocumentsChange?: (documents: CompanyDocument[]) => void;
};

const statusTone: Record<CompanyDocument["reviewStatus"], string> = {
  PENDING: "border-border bg-background",
  APPROVED: "border-success/40 bg-success/5",
  REJECTED: "border-destructive/40 bg-destructive/5",
};

export function VerificationDocumentsPanel({
  organizationId,
  companyName,
  companySummary,
  readOnly = false,
  showPreview = true,
  services = [],
  onDocumentsChange,
}: VerificationDocumentsPanelProps) {
  const documentTypes = verificationDocumentTypesFor(services);
  const inputRefs = useRef<Partial<Record<VerificationDocumentId, HTMLInputElement | null>>>({});
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<VerificationDocumentId | null>(null);
  // Ошибку показываем на месте, а не тостом: тост исчезнет, а причина нужна.
  const [failure, setFailure] = useState("");

  const report = useRef(onDocumentsChange);
  report.current = onDocumentsChange;
  const publish = useCallback((next: CompanyDocument[]) => {
    setDocuments(next);
    report.current?.(next);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listCompanyDocuments(organizationId)
      .then((rows) => {
        if (!alive) return;
        setFailure("");
        publish(rows);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setFailure(error instanceof Error ? error.message : "Не удалось загрузить документы");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [organizationId, publish]);

  const upload = async (type: VerificationDocumentId, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(type);
    try {
      const saved = await uploadCompanyDocument(organizationId, type, file);
      publish([saved, ...documents.filter((doc) => doc.docType !== type)]);
      setFailure("");
      toast.success(`${labelOf(documentTypes, type)} загружен`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить файл";
      if (error instanceof CompanyDocumentsError && error.needsMigration) setFailure(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const drop = async (document: CompanyDocument) => {
    setBusy(document.docType);
    try {
      await removeCompanyDocument(document);
      publish(documents.filter((doc) => doc.id !== document.id));
      toast.success("Документ удалён");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить документ");
    } finally {
      setBusy(null);
    }
  };

  const open = (document: CompanyDocument) => {
    const tab = window.open("", "_blank", "noopener,noreferrer");
    signedDocumentUrl(document.storagePath)
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <BadgeCheck className="size-5 text-success" />
          Знак «Проверенная компания»
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          После проверки документов туристы увидят отметку на вашей странице и в предложениях по
          заявкам.
        </p>
      </div>

      {showPreview ? (
        <div className="rounded-2xl bg-secondary/50 p-4 text-sm">
          <p className="font-semibold">{companyName || "Название компании"}</p>
          {companySummary ? <p className="mt-1 text-muted-foreground">{companySummary}</p> : null}
        </div>
      ) : null}

      {failure ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {failure}
        </p>
      ) : null}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Документы для проверки</h3>
          <Badge variant="secondary" className="font-normal">
            PDF или фото, до 5 МБ
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Нужно свидетельство о регистрации. Остальные документы усиливают доверие, если они у вас
          есть. Срок проверки: до 2 рабочих дней.
        </p>

        <div className="mt-3 space-y-2">
          {documentTypes.map((doc) => {
            const uploaded = documents.find((file) => file.docType === doc.id);
            const working = busy === doc.id;
            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors",
                  uploaded ? statusTone[uploaded.reviewStatus] : "border-border bg-background",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText
                        className={cn(
                          "size-4 shrink-0",
                          uploaded ? "text-success" : "text-muted-foreground",
                        )}
                      />
                      <p className="text-sm font-semibold">{doc.label}</p>
                      {doc.required ? (
                        <Badge variant="outline" className="h-5 px-2 text-[10px] uppercase">
                          Обязательно
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {doc.description}
                    </p>
                    {uploaded ? (
                      <>
                        <button
                          type="button"
                          onClick={() => open(uploaded)}
                          className="mt-2 block max-w-full truncate text-xs font-medium text-primary hover:underline"
                        >
                          {uploaded.fileName}
                        </button>
                        <p className="mt-1 text-xs">
                          {uploaded.reviewStatus === "APPROVED" ? (
                            <span className="font-medium text-success">Принят проверяющим</span>
                          ) : uploaded.reviewStatus === "REJECTED" ? (
                            <span className="font-medium text-destructive">
                              Отклонён{uploaded.reviewNote ? `: ${uploaded.reviewNote}` : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Ждёт проверки</span>
                          )}
                        </p>
                      </>
                    ) : null}
                  </div>

                  {!readOnly ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        ref={(node) => {
                          inputRefs.current[doc.id] = node;
                        }}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          void upload(doc.id, event.target.files);
                          event.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={uploaded ? "outline" : "default"}
                        disabled={working || loading}
                        onClick={() => inputRefs.current[doc.id]?.click()}
                      >
                        {working ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {uploaded ? "Заменить" : "Загрузить"}
                      </Button>
                      {uploaded ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={working}
                          onClick={() => void drop(uploaded)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : uploaded ? (
                    <span className="text-xs font-semibold text-success">Загружено</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Не загружено</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        Кабинет откроется сразу. Знак появится только после проверки загруженных документов.
      </p>
    </div>
  );
}

function labelOf(
  types: ReturnType<typeof verificationDocumentTypesFor>,
  id: VerificationDocumentId,
) {
  return types.find((item) => item.id === id)?.label ?? "Документ";
}

export function canSubmitVerification(documents: CompanyDocument[]) {
  return documents.length === 0 || hasRequiredDocument(documents);
}

export function hasRequiredDocument(documents: CompanyDocument[]) {
  return documents.some((doc) => doc.docType === "registration");
}
