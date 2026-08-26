import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SalesChartPoint = {
  label: string;
  value: number;
};

export function SalesChart({ points }: { points: SalesChartPoint[] }) {
  if (points.length === 0) return null;

  // points.value приходит в миллионах тенге.
  const max = Math.max(...points.map((p) => p.value), 0);
  const unit = max >= 1 ? "M" : "K";
  const tickValue = (v: number) => {
    const scaled = unit === "M" ? v : v * 1000;
    return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          unit={unit}
          tickFormatter={tickValue}
        />
        <Tooltip
          formatter={(value: number) => [
            `${Math.round(value * 1_000_000).toLocaleString("ru-RU")} ₸`,
            "Продажи",
          ]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#sales)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
