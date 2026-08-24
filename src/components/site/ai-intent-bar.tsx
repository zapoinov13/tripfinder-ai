import { useNavigate } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routeTravelIntent } from "@/lib/scenario-router";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

export function AiIntentBar({ tone = "light" }: { tone?: "light" | "onDark" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  const go = (text = query) => {
    const next = text.trim();
    if (!next) return;
    const route = routeTravelIntent(next);
    navigate({ to: route.to, search: route.search as never });
  };

  const listen = async () => {
    if (listening) return;
    setListening(true);
    try {
      const result = await speechService.start();
      setQuery(result.text);
      go(result.text);
    } catch {
      toast.error("Не удалось включить микрофон");
    } finally {
      setListening(false);
    }
  };

  return (
    <form
      className={cn(
        "flex h-12 items-center gap-1 rounded-2xl border pl-3 pr-1 shadow-sm",
        tone === "onDark"
          ? "border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-md"
          : "border-border bg-card",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <Sparkles
        className={cn("size-4 shrink-0", tone === "onDark" ? "text-primary-foreground" : "text-ai")}
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Расскажите, что нужно"
        className={cn(
          "h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-[15px] shadow-none placeholder:truncate focus-visible:ring-0",
          tone === "onDark" && "text-primary-foreground placeholder:text-primary-foreground/70",
        )}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "size-10 shrink-0",
          listening && "text-primary",
          tone === "onDark" && "text-primary-foreground hover:bg-primary-foreground/12",
        )}
        aria-label="Сказать голосом"
        onClick={() => void listen()}
      >
        <Mic className={cn("size-4", listening && "animate-pulse")} />
      </Button>
    </form>
  );
}
