import { BadgeCheck, FileText, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  hasRequiredVerificationDocuments,
  readVerificationFile,
  removeVerificationFile,
  upsertVerificationFile,
  verificationDocumentTypes,
} from "@/lib/platform/company";
import type { CompanyVerificationFile, VerificationDocumentId } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

type VerificationDocumentsPanelProps = {
  companyName: string;
  companySummary?: string;
  files: CompanyVerificationFile[];
  onChange: (files: CompanyVerificationFile[]) => void;
  readOnly?: boolean;
  showPreview?: boolean;
};

export function VerificationDocumentsPanel({
  companyName,
  companySummary,
  files,
  onChange,
  readOnly = false,
  showPreview = true,
}: VerificationDocumentsPanelProps) {
  const inputRefs = useRef<Partial<Record<VerificationDocumentId, HTMLInputElement | null>>>({});

  const upload = async (type: VerificationDocumentId, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const next = await readVerificationFile(type, file);
      onChange(upsertVerificationFile(files, next));
      toast.success(`${verificationDocumentTypes.find((item) => item.id === type)?.label} загружен`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить файл");
    }
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

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Документы для проверки</h3>
          <Badge variant="secondary" className="font-normal">
            PDF или фото, до 5 МБ
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Нужно свидетельство о регистрации. Остальные документы усиливают доверие, если они у
          вас есть. Срок проверки: до 2 рабочих дней.
        </p>

        <div className="mt-3 space-y-2">
          {verificationDocumentTypes.map((doc) => {
            const uploaded = files.find((file) => file.type === doc.id);
            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors",
                  uploaded ? "border-success/40 bg-success/5" : "border-border bg-background",
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
                      <p className="mt-2 truncate text-xs font-medium text-foreground">
                        {uploaded.fileName}
                      </p>
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
                        onClick={() => inputRefs.current[doc.id]?.click()}
                      >
                        <Upload className="size-4" />
                        {uploaded ? "Заменить" : "Загрузить"}
                      </Button>
                      {uploaded ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => onChange(removeVerificationFile(files, doc.id))}
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

export function verificationSubmitLabel(files: CompanyVerificationFile[]) {
  return files.length > 0 ? "Отправить на проверку" : "Создать и открыть кабинет";
}

export function canSubmitVerification(files: CompanyVerificationFile[]) {
  return files.length === 0 || hasRequiredVerificationDocuments(files);
}

export function verificationSubmitHint(files: CompanyVerificationFile[]) {
  if (files.length === 0) {
    return "Документы можно добавить позже в кабинете компании.";
  }
  if (!hasRequiredVerificationDocuments(files)) {
    return "Для отправки на проверку нужно загрузить свидетельство о регистрации.";
  }
  return `К проверке: ${files.length} ${files.length === 1 ? "документ" : "документа"}.`;
}
