import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Янв", value: 5.2 },
  { month: "Фев", value: 6.1 },
  { month: "Мар", value: 7.4 },
  { month: "Апр", value: 6.8 },
  { month: "Май", value: 8.9 },
  { month: "Июн", value: 10.2 },
  { month: "Июл", value: 11.6 },
  { month: "Авг", value: 12.4 },
];

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} unit="M" />
        <Tooltip
          formatter={(value: number) => [`${value}M ₸`, "Продажи"]}
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