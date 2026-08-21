import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_MAX = 9_999_999_999;

export function formatGrouped(value: number) {
  const n = Math.trunc(Math.abs(value));
  if (!n) return "";
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function parseGrouped(raw: string, max = DEFAULT_MAX) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return 0;
  const clipped = digits.slice(0, String(max).length);
  const n = Number(clipped);
  return Number.isFinite(n) ? Math.min(max, n) : 0;
}

function caretFromDigits(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted[i] !== " ") seen += 1;
    if (seen >= digitCount) return i + 1;
  }
  return formatted.length;
}

export function MoneyInput({
  id,
  value,
  onChange,
  max = DEFAULT_MAX,
  min = 0,
  className,
  placeholder = "1 200 000",
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const display = formatGrouped(value);

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const el = e.target;
          const digitsBefore = el.value.slice(0, el.selectionStart ?? 0).replace(/\D/g, "").length;
          const next = Math.max(min, parseGrouped(el.value, max));
          onChange(next);
          const formatted = formatGrouped(next);
          requestAnimationFrame(() => {
            const node = ref.current;
            if (!node) return;
            const pos = caretFromDigits(formatted, digitsBefore);
            node.setSelectionRange(pos, pos);
          });
        }}
        className={cn("h-11 pr-9 tabular-nums tracking-wide", className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        ₸
      </span>
    </div>
  );
}
