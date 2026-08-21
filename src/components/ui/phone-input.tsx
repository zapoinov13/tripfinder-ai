import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Национальный номер Казахстана: 7 + 10 цифр. */
const MAX_DIGITS = 11;

export function parsePhoneDigits(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  else if (!digits.startsWith("7")) digits = `7${digits}`;
  return digits.slice(0, MAX_DIGITS);
}

export function formatPhone(raw: string) {
  const digits = parsePhoneDigits(raw);
  if (!digits) return "";
  const rest = digits.startsWith("7") ? digits.slice(1) : digits;
  const chunks = ["+7"];
  if (rest.length > 0) chunks.push(rest.slice(0, 3));
  if (rest.length > 3) chunks.push(rest.slice(3, 6));
  if (rest.length > 6) chunks.push(rest.slice(6, 8));
  if (rest.length > 8) chunks.push(rest.slice(8, 10));
  return chunks.join(" ");
}

function caretFromDigits(formatted: string, digitCount: number) {
  if (digitCount <= 0) return formatted.startsWith("+") ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i] ?? "")) {
      seen += 1;
      if (seen >= digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export function PhoneInput({
  id,
  value,
  onChange,
  className,
  placeholder = "+7 777 777 77 77",
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const display = formatPhone(value);

  return (
    <Input
      ref={ref}
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      disabled={disabled}
      value={display}
      onChange={(e) => {
        const el = e.target;
        const digitsBefore = el.value.slice(0, el.selectionStart ?? 0).replace(/\D/g, "").length;
        const next = formatPhone(el.value);
        onChange(next);
        requestAnimationFrame(() => {
          const node = ref.current;
          if (!node) return;
          const pos = caretFromDigits(next, digitsBefore);
          node.setSelectionRange(pos, pos);
        });
      }}
      className={cn("h-11 tabular-nums tracking-wide", className)}
    />
  );
}
