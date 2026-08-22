import type { CompanyVerificationFile, VerificationDocumentId } from "./types";

export const verificationDocumentTypes: Array<{
  id: VerificationDocumentId;
  label: string;
  description: string;
  required: boolean;
}> = [
  {
    id: "registration",
    label: "Свидетельство о регистрации",
    description: "ТОО, ИП или выписка из госреестра с БИН / регистрационным номером",
    required: true,
  },
  {
    id: "tourism_license",
    label: "Лицензия на туристскую деятельность",
    description: "Если по законам вашей страны турагент обязан иметь лицензию",
    required: false,
  },
  {
    id: "liability_insurance",
    label: "Страхование ответственности",
    description: "Полис страхования туроператора или турагента перед туристами",
    required: false,
  },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function verificationDocumentLabel(type: VerificationDocumentId) {
  return verificationDocumentTypes.find((item) => item.id === type)?.label ?? type;
}

export function hasRequiredVerificationDocuments(files: CompanyVerificationFile[]) {
  return files.some((file) => file.type === "registration");
}

export function readVerificationFile(
  type: VerificationDocumentId,
  file: File,
): Promise<CompanyVerificationFile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error("Файл больше 5 МБ. Сожмите PDF или загрузите фото меньшего размера."));
      return;
    }
    if (!ALLOWED_MIME.has(file.type)) {
      reject(new Error("Поддерживаются PDF, JPG, PNG и WEBP."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error("Не удалось прочитать файл"));
        return;
      }
      resolve({
        type,
        fileName: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error("Не удалось загрузить файл"));
    reader.readAsDataURL(file);
  });
}

export function upsertVerificationFile(
  files: CompanyVerificationFile[],
  next: CompanyVerificationFile,
) {
  return [...files.filter((file) => file.type !== next.type), next];
}

export function removeVerificationFile(files: CompanyVerificationFile[], type: VerificationDocumentId) {
  return files.filter((file) => file.type !== type);
}
