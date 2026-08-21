import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { AiChat } from "@/components/site/ai-chat";
import { QuickPrompts } from "@/components/site/quick-prompts";
import { SearchPanel } from "@/components/site/search-panel";
import { SiteLayout } from "@/components/site/site-layout";

export const Route = createFileRoute("/ai-search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"].length > 0 ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "Умный поиск · TourGo" },
      { name: "description", content: "Опишите поездку обычным текстом или голосом." },
    ],
  }),
  component: AiSearchPage,
});

function AiSearchPage() {
  const { q } = Route.useSearch();

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-ai/10 px-3 py-1 text-xs font-semibold text-ai">
            <Sparkles className="size-3.5" />
            Умный поиск
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
            Расскажите, куда хотите поехать
          </h1>
          <p className="mt-3 text-muted-foreground">
            Напишите или скажите голосом. TourGo превратит запрос в параметры поиска и покажет
            реальные туры. Придуманных предложений в выдаче нет.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <SearchPanel defaultTab="ai" initialAiQuery={q ?? ""} />
            <QuickPrompts className="mt-6" />
          </div>
          <AiChat initialQuery={q ?? ""} />
        </div>
      </div>
    </SiteLayout>
  );
}
