import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { profileNav } from "@/components/dash/nav-items";
import { TouristAccountGate } from "@/components/site/tourist-account-gate";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/profile/ai")({
  head: () => ({ meta: [{ title: "AI-поиски · TourGo" }] }),
  component: AiHistoryPage,
});

function AiHistoryPage() {
  return (
    <TouristAccountGate kind="generic" title="История AI-поиска после входа">
      <AiHistoryContent />
    </TouristAccountGate>
  );
}

function AiHistoryContent() {
  const { user } = useAuth();
  const state = usePlatformStore();
  const navigate = useNavigate();
  if (!user) return null;

  const items = state.aiSearches.filter((a) => a.userId === user.id);

  return (
    <DashShell brand="TourGo" items={profileNav} title="AI-поиски" subtitle="История запросов">
      {items.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">История пуста</p>
          <Button className="mt-4" asChild>
            <Link to="/ai-search">AI Search</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="surface-card p-5">
              <p className="font-medium">{item.originalQuery}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(item.createdAt).toLocaleString("ru-RU")} · {item.resultsCount} результатов
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() =>
                  navigate({
                    to: "/search",
                    search: item.searchParams as never,
                  })
                }
              >
                Повторить поиск
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashShell>
  );
}
