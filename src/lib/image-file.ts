const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.78;

/** Сжимает фото, чтобы карточка тура не раздувала localStorage. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Нужно изображение"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось обработать фото"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть фото"));
    };
    img.src = url;
  });
}

export function youtubeId(url: string) {
  const m = url
    .trim()
    .match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

export function youtubeEmbed(url: string) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
