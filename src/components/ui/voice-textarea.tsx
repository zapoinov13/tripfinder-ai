import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

export function VoiceTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const session = useRef<{ stop: () => Promise<string> } | null>(null);
  const base = useRef(value);

  useEffect(() => {
    return () => {
      void session.current?.stop();
    };
  }, []);

  const merge = (spoken: string) => {
    const prefix = base.current.trim();
    onChange(prefix ? `${prefix} ${spoken}`.trim() : spoken);
  };

  const stop = async () => {
    const current = session.current;
    session.current = null;
    setListening(false);
    if (current) await current.stop();
  };

  const toggle = async () => {
    if (listening) {
      await stop();
      return;
    }
    base.current = value;
    setListening(true);
    try {
      session.current = speechService.listen((spoken) => merge(spoken));
    } catch {
      setListening(false);
      toast.error("Не удалось включить микрофон. Разрешите доступ в браузере.");
    }
  };

  return (
    <div className="relative">
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-h-28 resize-none pr-14",
          listening && "border-ai ring-1 ring-ai/30",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={listening}
        aria-label={listening ? "Остановить запись" : "Надиктовать голосом"}
        title={listening ? "Нажмите, чтобы остановить" : "Надиктовать голосом"}
        className={cn(
          "absolute right-2.5 top-2.5 grid size-10 place-items-center rounded-full transition-colors",
          listening
            ? "bg-ai text-primary-foreground shadow-sm"
            : "bg-secondary text-foreground hover:bg-secondary/70",
        )}
      >
        <Mic className={cn("size-4", listening && "animate-pulse")} />
      </button>
      {listening ? (
        <p className="mt-2 text-xs font-medium text-ai">Слушаем… говорите, текст появится здесь</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Можно написать или нажать на микрофон и сказать голосом
        </p>
      )}
    </div>
  );
}
