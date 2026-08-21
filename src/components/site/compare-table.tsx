import { Check, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Cell = boolean | "partial";

const columns = ["TourGo", "Сайты компаний", "Агентство"] as const;

const rows: { label: string; values: [Cell, Cell, Cell] }[] = [
  { label: "Несколько компаний в одном поиске", values: [true, false, "partial"] },
  { label: "Можно сказать голосом, какой отдых нужен", values: [true, false, "partial"] },
  { label: "Цены и отели рядом, не в пяти чатах", values: [true, false, false] },
  { label: "Смотреть можно ночью и в выходные", values: [true, true, false] },
  { label: "Цена проверяется перед бронью", values: [true, true, "partial"] },
  { label: "Подбор за минуты, не за дни", values: [true, "partial", false] },
];

function CellIcon({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-success/12 text-success">
        <Check className="size-4" />
      </span>
    );
  if (value === "partial")
    return (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-premium/15 text-premium">
        <Minus className="size-4" />
      </span>
    );
  return (
    <span className="mx-auto grid size-7 place-items-center rounded-full bg-muted text-muted-foreground">
      <X className="size-4" />
    </span>
  );
}

export function CompareTable() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-6 py-4 text-left font-medium text-muted-foreground">
                Что важно, когда выбираете тур
              </th>
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={cn(
                    "px-4 py-4 text-center font-display font-semibold",
                    i === 0 && "bg-primary-soft/60 text-primary",
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <td className="px-6 py-4">{row.label}</td>
                {row.values.map((value, i) => (
                  <td
                    key={i}
                    className={cn("px-4 py-4 text-center", i === 0 && "bg-primary-soft/40")}
                  >
                    <CellIcon value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <div key={row.label} className="p-4">
            <p className="font-medium">{row.label}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {row.values.map((value, i) => (
                <div key={i} className="space-y-1.5">
                  <CellIcon value={value} />
                  <p className="text-[11px] leading-tight text-muted-foreground">{columns[i]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
