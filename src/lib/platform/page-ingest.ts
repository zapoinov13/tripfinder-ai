import { pageToIngestText } from "@/lib/platform/html-extract";
import { fetchPageContent } from "@/lib/platform/fetch-page.functions";
import { draftFromUrl } from "@/lib/platform/ingest";
import { draftVerticalFromLink, type VerticalId } from "@/lib/platform/service-ingest";

/**
 * Fetch website HTML on the server and build a tour draft.
 */
export async function ingestTourFromUrl(url: string, extraText = "") {
  const fetched = await fetchPageContent({ data: { url } });
  if (!fetched.ok) {
    const fallback = draftFromUrl(url, extraText || undefined);
    return {
      ...fallback,
      warnings: [fetched.error, ...fallback.warnings],
      fetched: false as const,
    };
  }
  const pageText = [pageToIngestText(fetched.page), extraText].filter(Boolean).join("\n\n");
  const photos = fetched.page.images;
  const result = draftFromUrl(fetched.finalUrl || url, pageText);
  if (photos.length && !result.draft.photos?.length) {
    result.draft = { ...result.draft, photos: photos.slice(0, 8) };
    if (!result.fields.includes("фото")) result.fields.push("фото");
  }
  return {
    ...result,
    warnings: [...(fetched.warning ? [fetched.warning] : []), ...result.warnings],
    fetched: true as const,
  };
}

/**
 * Fetch website HTML on the server and build a stay/car/sport draft.
 */
export async function ingestVerticalFromUrl(input: {
  vertical: VerticalId;
  url: string;
  text?: string;
}) {
  const url = input.url.trim();
  const extra = (input.text ?? "").trim();
  if (!url && !extra) {
    return draftVerticalFromLink({ vertical: input.vertical, url: "", text: "" });
  }
  if (!url) {
    return draftVerticalFromLink({ vertical: input.vertical, url: "", text: extra });
  }

  const fetched = await fetchPageContent({ data: { url } });
  if (!fetched.ok) {
    const result = draftVerticalFromLink({
      vertical: input.vertical,
      url,
      text: extra,
    });
    return {
      ...result,
      warnings: [fetched.error, ...result.warnings],
      fetched: false as const,
    };
  }

  const pageText = [pageToIngestText(fetched.page), extra].filter(Boolean).join("\n\n");
  const result = draftVerticalFromLink({
    vertical: input.vertical,
    url: fetched.finalUrl || url,
    text: pageText,
  });
  if (fetched.page.images.length && !result.draft.photos.length) {
    result.draft = { ...result.draft, photos: fetched.page.images.slice(0, 8) };
    if (!result.fields.includes("фото")) result.fields.push("фото");
  }
  if (fetched.page.title && (!result.draft.name || result.draft.name.length < 3)) {
    result.draft = { ...result.draft, name: fetched.page.title.slice(0, 80) };
  }
  return {
    ...result,
    warnings: [...(fetched.warning ? [fetched.warning] : []), ...result.warnings],
    fetched: true as const,
  };
}
