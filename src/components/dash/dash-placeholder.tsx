import { DashShell, type DashItem } from "./dash-shell";

export function DashPlaceholder({
  items,
  brand,
  title,
  subtitle,
  columns,
}: {
  items: DashItem[];
  brand: string;
  title: string;
  subtitle?: string;
  columns: string[];
}) {
  return (
    <DashShell items={items} brand={brand} title={title} {...(subtitle ? { subtitle } : {})}>
      <div className="grid gap-4 sm:grid-cols-3">
        {["Всего", "За месяц", "В работе"].map((label, i) => (
          <div key={label} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {[1284, 342, 87][i]?.toLocaleString("ru-RU")}
            </p>
          </div>
        ))}
      </div>
      <div className="surface-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-5 py-3 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, row) => (
                <tr key={row} className="border-t border-border">
                  {columns.map((col, i) => (
                    <td key={col} className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {i === 0 ? `${title} #${1000 + row}` : demoCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashShell>
  );
}

function demoCell(col: string, row: number) {
  const values = ["Active", "12 480", "4,8", "1 290 000 ₸", "10–17 августа", "Travel Company"];
  return values[(col.length + row) % values.length];
}