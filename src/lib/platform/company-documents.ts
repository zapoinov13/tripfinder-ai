import { getSupabase } from "@/lib/supabase/client";

import { verificationDocumentLabel } from "./verification-documents";
import type { VerificationDocumentId } from "./types";

/**
 * Документы компании: браузер только показывает, хранит сервер.
 *
 * Раньше файл читался в data:URL и оставался в локальном сторе того браузера,
 * где его выбрали. Партнёр видел «Загружено» и нажимал «Отправить на
 * проверку», но у админа список документов всегда был пуст — файл никуда не
 * уходил. Здесь всё общение с бакетом `company-docs` и таблицей
 * `company_documents`, чтобы такого расхождения больше не было.
 */

export const COMPANY_DOCS_BUCKET = "company-docs";

export type DocumentReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CompanyDocument = {
  id: string;
  organizationId: string;
  docType: VerificationDocumentId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedAt: string;
  reviewStatus: DocumentReviewStatus;
  reviewNote: string;
  reviewedAt: string;
};

/** Строка очереди проверки: документ плюс компания, которая его прислала. */
export type AdminCompanyDocument = CompanyDocument & {
  organizationName: string;
  organizationCity: string;
  organizationCategory: string;
  organizationEmail: string;
  organizationPhone: string;
  registrationNumber: string;
  documentsVerifiedAt: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Ошибка, о которой человеку можно сказать прямо.
 *
 * Отдельный класс нужен, чтобы отличать «не применили миграцию» от «файл
 * слишком большой»: первое чинит владелец проекта, второе — сам партнёр.
 */
export class CompanyDocumentsError extends Error {
  readonly needsMigration: boolean;

  constructor(message: string, needsMigration = false) {
    super(message);
    this.name = "CompanyDocumentsError";
    this.needsMigration = needsMigration;
  }
}

const MIGRATION_HINT = "Раздел документов не готов: примените supabase/COMPANY-DOCUMENTS.sql";

function looksLikeMissingSchema(message: string) {
  return /does not exist|not find|schema cache|PGRST202|PGRST205|Bucket not found|42P01/i.test(
    message,
  );
}

function fail(message: string): never {
  throw new CompanyDocumentsError(
    looksLikeMissingSchema(message) ? MIGRATION_HINT : message,
    looksLikeMissingSchema(message),
  );
}

function client() {
  const sb = getSupabase();
  if (!sb) throw new CompanyDocumentsError("Supabase не настроен: документы негде хранить");
  return sb;
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toDocument(row: Record<string, unknown>): CompanyDocument {
  const status = str(row["review_status"], "PENDING");
  return {
    id: str(row["id"]),
    organizationId: str(row["organization_id"]),
    docType: str(row["doc_type"]) as VerificationDocumentId,
    fileName: str(row["file_name"]),
    mimeType: str(row["mime_type"]),
    sizeBytes: typeof row["size_bytes"] === "number" ? row["size_bytes"] : 0,
    storagePath: str(row["storage_path"]),
    uploadedAt: str(row["uploaded_at"]),
    reviewStatus: (status === "APPROVED" || status === "REJECTED"
      ? status
      : "PENDING") as DocumentReviewStatus,
    reviewNote: str(row["review_note"]),
    reviewedAt: str(row["reviewed_at"]),
  };
}

/** Документы одной компании: свои видит партнёр, любые — админ платформы. */
export async function listCompanyDocuments(organizationId: string): Promise<CompanyDocument[]> {
  const sb = client();
  const { data, error } = await sb
    .from("company_documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("uploaded_at", { ascending: false });
  if (error) fail(error.message);
  return (data ?? []).map((row) => toDocument(row as Record<string, unknown>));
}

/**
 * Загрузка документа. Файл кладём под `<id компании>/<тип>-<время>.<ext>`:
 * по первой папке правила доступа понимают, чей это документ.
 */
export async function uploadCompanyDocument(
  organizationId: string,
  docType: VerificationDocumentId,
  file: File,
): Promise<CompanyDocument> {
  if (file.size > MAX_FILE_BYTES) {
    throw new CompanyDocumentsError(
      "Файл больше 5 МБ. Сожмите PDF или загрузите фото меньшего размера.",
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new CompanyDocumentsError("Поддерживаются PDF, JPG, PNG и WEBP.");
  }

  const sb = client();
  const ext = EXTENSION[file.type] ?? "bin";
  const path = `${organizationId}/${docType}-${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from(COMPANY_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) fail(uploadError.message);

  // Прежний файл того же типа заменяем: строка одна на тип (unique в базе),
  // а `upsert` без onConflict создал бы вторую и упал.
  const previous = await currentPathFor(organizationId, docType);

  const { data, error } = await sb
    .from("company_documents")
    .upsert(
      {
        organization_id: organizationId,
        doc_type: docType,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,doc_type" },
    )
    .select("*")
    .single();

  if (error) {
    // Строка не записалась — файл в бакете никому не нужен, убираем.
    await sb.storage.from(COMPANY_DOCS_BUCKET).remove([path]);
    fail(error.message);
  }

  if (previous && previous !== path) {
    await sb.storage.from(COMPANY_DOCS_BUCKET).remove([previous]);
  }

  return toDocument(data as Record<string, unknown>);
}

async function currentPathFor(organizationId: string, docType: VerificationDocumentId) {
  const sb = client();
  const { data } = await sb
    .from("company_documents")
    .select("storage_path")
    .eq("organization_id", organizationId)
    .eq("doc_type", docType)
    .maybeSingle();
  return data ? str((data as Record<string, unknown>)["storage_path"]) : "";
}

export async function removeCompanyDocument(document: CompanyDocument) {
  const sb = client();
  const { error } = await sb.from("company_documents").delete().eq("id", document.id);
  if (error) fail(error.message);
  await sb.storage.from(COMPANY_DOCS_BUCKET).remove([document.storagePath]);
}

/**
 * Ссылка на файл. Бакет приватный, поэтому ссылка подписанная и живёт 5 минут:
 * достаточно, чтобы открыть или скачать, и мало, чтобы её куда-то переслать.
 */
export async function signedDocumentUrl(storagePath: string, seconds = 300): Promise<string> {
  const sb = client();
  const { data, error } = await sb.storage
    .from(COMPANY_DOCS_BUCKET)
    .createSignedUrl(storagePath, seconds);
  if (error) fail(error.message);
  return data?.signedUrl ?? "";
}

/** Вся очередь проверки: только для админа платформы, порядок задаёт сервер. */
export async function listAdminCompanyDocuments(): Promise<AdminCompanyDocument[]> {
  const sb = client();
  // bind: без него метод теряет объект и падает на this.rest.
  const rpc = sb.rpc.bind(sb) as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("admin_company_documents");
  if (error) fail(error.message);
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    ...toDocument(row),
    organizationName: str(row["organization_name"]),
    organizationCity: str(row["organization_city"]),
    organizationCategory: str(row["organization_category"]),
    organizationEmail: str(row["organization_email"]),
    organizationPhone: str(row["organization_phone"]),
    registrationNumber: str(row["registration_number"]),
    documentsVerifiedAt: str(row["documents_verified_at"]),
  }));
}

/** Решение по документу. Пишет только админ — это проверяет сама база. */
export async function reviewCompanyDocument(
  documentId: string,
  status: DocumentReviewStatus,
  note = "",
) {
  const sb = client();
  const rpc = sb.rpc.bind(sb) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("review_company_document", {
    p_document: documentId,
    p_status: status,
    p_note: note,
  });
  if (error) fail(error.message);
}

export const reviewStatusLabel: Record<DocumentReviewStatus, string> = {
  PENDING: "Ждёт проверки",
  APPROVED: "Принят",
  REJECTED: "Отклонён",
};

export function documentTitle(document: CompanyDocument) {
  return verificationDocumentLabel(document.docType);
}

/**
 * Счётчик непроверенных документов для бейджа в меню админа.
 *
 * Очередь живёт на сервере, а меню рисуется из локального стора, поэтому
 * держим маленький отдельный источник: одна выборка на открытие панели, потом
 * не чаще раза в минуту. Молчаливо: не сложилось — бейджа просто нет, ронять
 * из-за него меню нечем.
 */
const REFRESH_MS = 60_000;

let pendingCount = 0;
let lastFetchedAt = 0;
let inFlight = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribePendingDocuments(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pendingDocumentsCount() {
  return pendingCount;
}

export async function refreshPendingDocuments(force = false) {
  const now = Date.now();
  if (inFlight || (!force && now - lastFetchedAt < REFRESH_MS)) return;
  inFlight = true;
  try {
    const sb = getSupabase();
    if (!sb) return;
    const { count, error } = await sb
      .from("company_documents")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "PENDING");
    if (error) return;
    lastFetchedAt = Date.now();
    if (count !== pendingCount) {
      pendingCount = count ?? 0;
      emit();
    }
  } catch {
    // Бейдж — украшение: молча остаёмся с прежним числом.
  } finally {
    inFlight = false;
  }
}

/** Панель проверки уже знает точное число — незачем спрашивать базу второй раз. */
export function setPendingDocumentsCount(next: number) {
  lastFetchedAt = Date.now();
  if (next === pendingCount) return;
  pendingCount = next;
  emit();
}
