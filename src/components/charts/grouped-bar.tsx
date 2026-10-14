"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "./theme";

/** กราฟแท่งกลุ่ม ≤ 4 ชุดข้อมูล — สีตามลำดับคงที่ (ตรวจ CVD แล้ว) มี Legend เสมอ */
export function GroupedBar({
  data,
  series,
  ariaLabel,
  unit = "%",
}: {
  data: Record<string, number | string>[];
  series: { key: string; name: string }[];
  ariaLabel: string;
  unit?: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
          <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} unit={unit} />
          <Tooltip {...chartTheme.tooltip} formatter={(v: number, name) => [`${v.toFixed(2)}${unit}`, name]} />
          <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={chartTheme.series[i]} radius={[4, 4, 0, 0]} maxBarSize={18} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
