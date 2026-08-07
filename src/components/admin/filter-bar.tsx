import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = { value: string; label: string };

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Поиск…",
  filters = [],
  trailing,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    value: string;
    placeholder: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }>;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange ? (
        <Input
          className="max-w-md"
          placeholder={searchPlaceholder}
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      ) : null}
      {filters.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={f.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {trailing}
    </div>
  );
}

export function TabPills({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={
              active
                ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground"
                : "rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="ml-1.5 opacity-80">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
