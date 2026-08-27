import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Национальный номер Казахстана: 7 + 10 цифр. */
const MAX_DIGITS = 11;
/** Международный номер: E.164, до 15 цифр вместе с кодом страны. */
const MAX_INTL_DIGITS = 15;

/**
 * Номер вне Казахстана и России.
 *
 * Туристы у нас казахстанские, а компании — дубайские: их +971 нельзя
 * переписывать в +7. Признак простой и честный: человек сам начал ввод с «+»
 * и указал не седьмой код страны.
 */
function isForeign(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return raw.trimStart().startsWith("+") && digits.length > 0 && !digits.startsWith("7");
}

export function parsePhoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (isForeign(raw)) return digits.slice(0, MAX_INTL_DIGITS);
  let kz = digits;
  if (kz.startsWith("8")) kz = `7${kz.slice(1)}`;
  else if (!kz.startsWith("7")) kz = `7${kz}`;
  return kz.slice(0, MAX_DIGITS);
}

export function formatPhone(raw: string) {
  const digits = parsePhoneDigits(raw);
  if (!digits) return "";
  // Формат чужого номера не выдумываем: код страны у всех свой длины.
  // Оставляем набранное как есть, убирая лишние символы и цифры сверх E.164.
  if (isForeign(raw)) {
    let seen = 0;
    let out = "";
    for (const ch of raw.trimStart().replace(/[^\d+\-() ]/g, "")) {
      if (/\d/.test(ch)) {
        if (seen >= MAX_INTL_DIGITS) continue;
        seen += 1;
      }
      out += ch;
    }
    return out;
  }
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
